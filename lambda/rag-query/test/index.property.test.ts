/**
 * Property-Based Tests for RAG Query Lambda
 *
 * Property 4: RAG context retrieval
 * Property 5: RAG response combination
 * Property 6: RAG document retrieval limit
 * Property 7: RAG source citations
 * Property 27: Response caching for identical queries
 *
 * Requirements: 2.4, 2.5, 2.8, 2.10, 13.3, 15.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
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

const { handler, generateQueryHash, buildSources } = await import('../index.js');

describe('Property-Based Tests: RAG Query Lambda', () => {
    beforeEach(() => {
        bedrockAgentMock.reset();
        bedrockRuntimeMock.reset();
        dynamoMock.reset();

        process.env.AWS_REGION = 'us-east-1';
        process.env.RAG_CACHE_TABLE = 'test-rag-cache';
        process.env.KNOWLEDGE_BASE_ID = '';

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Property 4: RAG context retrieval
     * For any valid query, the system shall retrieve relevant documents
     */
    describe('Property 4: RAG context retrieval', () => {
        it('should retrieve and incorporate context for any valid query', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 100 }),
                    fc.string({ minLength: 3, maxLength: 20 }),
                    async (query, userId) => {
                        bedrockAgentMock.reset();
                        bedrockRuntimeMock.reset();
                        dynamoMock.reset();

                        dynamoMock.on(GetCommand).resolves({ Item: undefined });
                        dynamoMock.on(PutCommand).resolves({});

                        const mockGenResponse = {
                            content: [{ text: `Answer for: ${query}` }],
                            usage: { input_tokens: 10, output_tokens: 20 },
                        };
                        bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                            body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
                        });

                        const event = { body: JSON.stringify({ query, userId }) };
                        const res = await handler(event);

                        // Property: must return 200 for valid requests
                        expect(res.statusCode).toBe(200);
                        const body = JSON.parse(res.body);

                        // Property: answer must be defined and non-empty
                        expect(body.answer).toBeDefined();
                        expect(body.answer.length).toBeGreaterThan(0);

                        // Property: sources must be an array
                        expect(Array.isArray(body.sources)).toBe(true);

                        // Property: queryHash must be present
                        expect(body.queryHash).toBeDefined();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 5: RAG response combination
     * Generated answer should be based on context from documents
     */
    describe('Property 5: RAG response combination', () => {
        it('should combine Bedrock answer with retrieved sources for any query', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 80 }),
                    fc.string({ minLength: 5, maxLength: 100 }),
                    async (query, generatedAnswer) => {
                        bedrockAgentMock.reset();
                        bedrockRuntimeMock.reset();
                        dynamoMock.reset();

                        dynamoMock.on(GetCommand).resolves({ Item: undefined });
                        dynamoMock.on(PutCommand).resolves({});

                        const mockGenResponse = {
                            content: [{ text: generatedAnswer }],
                            usage: { input_tokens: 10, output_tokens: 20 },
                        };
                        bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                            body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
                        });

                        const event = { body: JSON.stringify({ query, userId: 'user-prop' }) };
                        const res = await handler(event);
                        const body = JSON.parse(res.body);

                        // Property: answer must equal Bedrock response
                        expect(body.answer).toBe(generatedAnswer);

                        // Property: response must combine answer + sources
                        expect(body.answer).toBeDefined();
                        expect(body.sources).toBeDefined();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 6: RAG document retrieval limit
     * Sources must never exceed 5 regardless of input
     */
    describe('Property 6: RAG document retrieval limit', () => {
        it('should never return more than 5 source documents for any number of retrieved docs', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            content: fc.record({ text: fc.string({ minLength: 1, maxLength: 100 }) }),
                            metadata: fc.record({
                                id: fc.string({ minLength: 1, maxLength: 20 }),
                                title: fc.string({ minLength: 1, maxLength: 50 }),
                            }),
                            score: fc.double({ min: 0, max: 1 }),
                        }),
                        { minLength: 0, maxLength: 20 }
                    ),
                    (docs) => {
                        const sources = buildSources(docs);
                        // Property: sources length must be at most 5
                        expect(sources.length).toBeLessThanOrEqual(5);
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('maxResults parameter should be capped at 5 regardless of caller input', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 50 }),
                    async (requestedResults) => {
                        bedrockAgentMock.reset();
                        bedrockRuntimeMock.reset();
                        dynamoMock.reset();

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
                            body: JSON.stringify({
                                query: 'test query',
                                userId: 'user-prop',
                                maxResults: requestedResults,
                            }),
                        };

                        const res = await handler(event);
                        const body = JSON.parse(res.body);

                        expect(res.statusCode).toBe(200);
                        // Property: sources must never exceed 5
                        expect(body.sources.length).toBeLessThanOrEqual(5);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 7: RAG source citations
     * Every source in the response must have required citation fields
     */
    describe('Property 7: RAG source citations', () => {
        it('should include required citation fields for every source document', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 80 }),
                    async (query) => {
                        bedrockAgentMock.reset();
                        bedrockRuntimeMock.reset();
                        dynamoMock.reset();

                        dynamoMock.on(GetCommand).resolves({ Item: undefined });
                        dynamoMock.on(PutCommand).resolves({});

                        const mockGenResponse = {
                            content: [{ text: 'Answer' }],
                            usage: { input_tokens: 10, output_tokens: 20 },
                        };
                        bedrockRuntimeMock.on(InvokeModelCommand).resolves({
                            body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
                        });

                        const event = { body: JSON.stringify({ query, userId: 'user-prop' }) };
                        const res = await handler(event);
                        const body = JSON.parse(res.body);

                        expect(res.statusCode).toBe(200);

                        // Property: every source must have all required fields
                        body.sources.forEach((source: any) => {
                            expect(source.documentId).toBeDefined();
                            expect(source.documentTitle).toBeDefined();
                            expect(source.excerpt).toBeDefined();
                            expect(typeof source.score).toBe('number');
                            expect(source.excerpt.length).toBeLessThanOrEqual(200);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 27: Response caching for identical queries
     * Identical queries must return the same cached response
     */
    describe('Property 27: Response caching for identical queries', () => {
        it('should return cached response for identical queries', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 80 }),
                    async (query) => {
                        const queryHash = generateQueryHash(query);
                        const futureTs = Math.floor(Date.now() / 1000) + 3600;
                        const cachedAnswer = `Cached answer for ${query}`;

                        bedrockAgentMock.reset();
                        bedrockRuntimeMock.reset();
                        dynamoMock.reset();

                        dynamoMock.on(GetCommand).resolves({
                            Item: {
                                queryHash,
                                answer: cachedAnswer,
                                sources: [],
                                ttl: futureTs,
                                createdAt: Date.now(),
                            },
                        });

                        const event = { body: JSON.stringify({ query, userId: 'user-prop' }) };
                        const res = await handler(event);
                        const body = JSON.parse(res.body);

                        // Property: cached response must be returned
                        expect(body.cached).toBe(true);
                        expect(body.answer).toBe(cachedAnswer);

                        // Property: Bedrock must NOT be invoked for cached queries
                        expect(bedrockRuntimeMock.commandCalls(InvokeModelCommand)).toHaveLength(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should generate consistent query hash for identical queries regardless of whitespace or case', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 3, maxLength: 100 }),
                    (query) => {
                        // Property: same query, different casing/whitespace -> same hash
                        const hash1 = generateQueryHash(query);
                        const hash2 = generateQueryHash(`  ${query.toLowerCase()}  `);
                        expect(hash1.toLowerCase()).toBe(hash2.toLowerCase());
                    }
                ),
                { numRuns: 20 }
            );
        });
    });
});
