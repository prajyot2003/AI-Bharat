/**
 * Unit Tests for RAG Query Lambda Handler
 *
 * Requirements: 2.4, 2.8, 2.10, 13.3, 15.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
    BedrockAgentRuntimeClient,
    RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const bedrockAgentMock = mockClient(BedrockAgentRuntimeClient);
const bedrockRuntimeMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

const { handler, generateQueryHash, getCachedResponse, cacheResponse, buildSources } =
    await import('../index.js');

describe('RAG Query Lambda Handler', () => {
    beforeEach(() => {
        bedrockAgentMock.reset();
        bedrockRuntimeMock.reset();
        dynamoMock.reset();

        process.env.AWS_REGION = 'us-east-1';
        process.env.RAG_CACHE_TABLE = 'test-rag-cache';
        process.env.KNOWLEDGE_BASE_ID = ''; // Use mock docs

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Request Validation', () => {
        it('should return 400 when query is missing', async () => {
            const event = { body: JSON.stringify({ userId: 'user-1' }) };
            const res = await handler(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).error).toContain('Missing required fields');
        });

        it('should return 400 when userId is missing', async () => {
            const event = { body: JSON.stringify({ query: 'What skills do I need?' }) };
            const res = await handler(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).error).toContain('Missing required fields');
        });
    });

    describe('Cache Hit and Miss', () => {
        it('should return cached response on cache hit', async () => {
            const queryHash = generateQueryHash('how to become a software engineer');
            const futureTs = Math.floor(Date.now() / 1000) + 3600;

            dynamoMock.on(GetCommand).resolves({
                Item: {
                    queryHash,
                    answer: 'Cached answer about software engineering',
                    sources: [{ documentId: 'doc-1', documentTitle: 'Guide', excerpt: 'text', score: 0.9 }],
                    ttl: futureTs,
                    createdAt: Date.now(),
                },
            });

            const event = {
                body: JSON.stringify({ query: 'how to become a software engineer', userId: 'user-1' }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(body.cached).toBe(true);
            expect(body.answer).toBe('Cached answer about software engineering');
            expect(body.sources).toHaveLength(1);
            expect(bedrockAgentMock.commandCalls(RetrieveCommand)).toHaveLength(0);
        });

        it('should fetch from knowledge base on cache miss', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            // Mock Bedrock generation
            const mockGenResponse = {
                content: [{ text: 'Here is what you need to know about machine learning...' }],
                usage: { input_tokens: 50, output_tokens: 100 },
            };
            bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
            });

            const event = {
                body: JSON.stringify({ query: 'machine learning career', userId: 'user-2' }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(body.cached).toBe(false);
            expect(body.answer).toBe('Here is what you need to know about machine learning...');
            expect(bedrockRuntimeMock.commandCalls(InvokeModelCommand)).toHaveLength(1);
        });

        it('should cache response after successful retrieval', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const mockGenResponse = {
                content: [{ text: 'Answer text' }],
                usage: { input_tokens: 10, output_tokens: 20 },
            };
            bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
            });

            const event = {
                body: JSON.stringify({ query: 'resume tips', userId: 'user-3' }),
            };

            await handler(event);

            const putCalls = dynamoMock.commandCalls(PutCommand);
            expect(putCalls).toHaveLength(1);
            expect(putCalls[0].args[0].input.Item).toMatchObject({
                answer: 'Answer text',
                ttl: expect.any(Number),
            });
        });
    });

    describe('Source Citations', () => {
        it('should include source citations in response', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const mockGenResponse = {
                content: [{ text: 'Answer with sources' }],
                usage: { input_tokens: 10, output_tokens: 20 },
            };
            bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
            });

            const event = {
                body: JSON.stringify({ query: 'job market trends', userId: 'user-4' }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(body.sources).toBeDefined();
            expect(Array.isArray(body.sources)).toBe(true);
            expect(body.sources.length).toBeGreaterThan(0);
            body.sources.forEach((source: any) => {
                expect(source.documentId).toBeDefined();
                expect(source.documentTitle).toBeDefined();
                expect(source.excerpt).toBeDefined();
                expect(typeof source.score).toBe('number');
            });
        });
    });

    describe('Top-5 Document Limit', () => {
        it('should limit sources to 5 documents', async () => {
            // Build mock docs – more than 5
            const sixDocs = Array.from({ length: 6 }, (_, i) => ({
                content: { text: `Content ${i}` },
                metadata: { id: `doc-${i}`, title: `Title ${i}` },
                score: 0.9 - i * 0.05,
            }));

            const sources = buildSources(sixDocs);
            expect(sources).toHaveLength(5);
        });

        it('should limit maxResults to 5 even if caller requests more', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const mockGenResponse = {
                content: [{ text: 'Answer' }],
                usage: { input_tokens: 10, output_tokens: 20 },
            };
            bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
            });

            const event = {
                body: JSON.stringify({ query: 'skills', userId: 'user-5', maxResults: 10 }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);
            expect(res.statusCode).toBe(200);
            expect(body.sources.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Query Hash', () => {
        it('should generate consistent hashes for the same query', () => {
            const q = 'What skills do I need for ML?';
            expect(generateQueryHash(q)).toBe(generateQueryHash(q));
        });

        it('should be case-insensitive and trim whitespace', () => {
            expect(generateQueryHash('machine learning')).toBe(
                generateQueryHash('  Machine Learning  ')
            );
        });

        it('should return different hashes for different queries', () => {
            expect(generateQueryHash('python')).not.toBe(generateQueryHash('java'));
        });
    });

    describe('CORS Headers', () => {
        it('should include CORS headers in all responses', async () => {
            const event = { body: JSON.stringify({ userId: 'user-1' }) };
            const res = await handler(event);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
            expect(res.headers['Content-Type']).toBe('application/json');
        });
    });

    describe('Error Handling', () => {
        it('should return 429 on throttling', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });

            const err = new Error('Throttled');
            err.name = 'ThrottlingException';
            bedrockRuntimeMock.on(InvokeModelCommand).rejects(err);

            const event = {
                body: JSON.stringify({ query: 'test', userId: 'user-6' }),
            };

            const res = await handler(event);
            expect(res.statusCode).toBe(429);
        });

        it('should return cached result even if TTL is in the past', async () => {
            const queryHash = generateQueryHash('test query');
            dynamoMock.on(GetCommand).resolves({
                Item: {
                    queryHash,
                    answer: 'Old cached answer',
                    sources: [],
                    ttl: Math.floor(Date.now() / 1000) - 100, // Expired
                    createdAt: Date.now() - 10000000,
                },
            });
            dynamoMock.on(PutCommand).resolves({});

            const mockGenResponse = {
                content: [{ text: 'Fresh answer' }],
                usage: { input_tokens: 10, output_tokens: 20 },
            };
            bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
            });

            const event = {
                body: JSON.stringify({ query: 'test query', userId: 'user-7' }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);
            // Expired cache should NOT be returned
            expect(body.cached).toBe(false);
            expect(body.answer).toBe('Fresh answer');
        });
    });
});
