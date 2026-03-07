/**
 * Unit Tests for Job Data Lambda Handler
 * Requirements: 4.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const bedrockMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

const { handler, getMockJobs, getMarketTrends } = await import('../index.js');

describe('Job Data Lambda Handler', () => {
    beforeEach(() => {
        bedrockMock.reset();
        dynamoMock.reset();
        process.env.AWS_REGION = 'us-east-1';
        process.env.JOB_CACHE_TABLE = 'test-cache';
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('Job Search', () => {
        it('should return jobs for search action', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const res = await handler({ body: JSON.stringify({ action: 'search' }) });
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(body.jobs)).toBe(true);
            expect(body.jobs.length).toBeGreaterThan(0);
            expect(body.total).toBeDefined();
        });

        it('should filter jobs by query', () => {
            const jobs = getMockJobs('ML');
            expect(jobs.every(j => j.role.includes('ML') || j.requiredSkills.some(s => s.toLowerCase().includes('ml')))).toBe(true);
        });

        it('should limit results', () => {
            const jobs = getMockJobs(undefined, 3);
            expect(jobs.length).toBeLessThanOrEqual(3);
        });
    });

    describe('Market Analysis', () => {
        it('should return market trends', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const mockGenResponse = {
                content: [{ text: 'AI continues to dominate hiring.' }],
                usage: { input_tokens: 10, output_tokens: 20 },
            };
            bedrockMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockGenResponse)),
            });

            const res = await handler({ body: JSON.stringify({ action: 'analyze' }) });
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(body.trends)).toBe(true);
            expect(body.aiInsights).toBeDefined();
        });

        it('should return trends sorted by growth', () => {
            const trends = getMarketTrends();
            for (let i = 0; i < trends.length - 1; i++) {
                expect(trends[i].growth).toBeGreaterThanOrEqual(trends[i + 1].growth);
            }
        });
    });

    describe('Skill Matching', () => {
        it('should match jobs to provided skills', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const res = await handler({
                body: JSON.stringify({ action: 'match-skills', skills: ['Python', 'AWS'] }),
            });
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(body.jobs.length).toBeGreaterThan(0);
            body.jobs.forEach((j: any) => {
                expect(j.matchScore).toBeGreaterThan(0);
            });
        });

        it('should sort matched jobs by matchScore descending', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});

            const res = await handler({
                body: JSON.stringify({ action: 'match-skills', skills: ['Python', 'React', 'Docker'] }),
            });
            const body = JSON.parse(res.body);

            for (let i = 0; i < body.jobs.length - 1; i++) {
                expect(body.jobs[i].matchScore).toBeGreaterThanOrEqual(body.jobs[i + 1].matchScore);
            }
        });

        it('should return 400 if skills missing', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'match-skills' }) });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Validation', () => {
        it('should return 400 if action missing', async () => {
            const res = await handler({ body: JSON.stringify({ query: 'python' }) });
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 for unknown action', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'delete' }) });
            expect(res.statusCode).toBe(400);
        });
    });
});
