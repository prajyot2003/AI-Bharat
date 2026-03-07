/**
 * Unit Tests for AI Agent Lambda Handler
 *
 * Requirements: 3.2, 3.4, 3.9, 3.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const bedrockAgentMock = mockClient(BedrockAgentRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

const { handler, getUserProfile, buildAgentInput, generateMockAgentResponse } =
    await import('../index.js');

describe('AI Agent Lambda Handler', () => {
    beforeEach(() => {
        bedrockAgentMock.reset();
        dynamoMock.reset();

        process.env.AWS_REGION = 'us-east-1';
        process.env.USER_PROFILES_TABLE = 'test-user-profiles';
        process.env.AGENT_SESSIONS_TABLE = 'test-agent-sessions';
        process.env.BEDROCK_AGENT_ID = ''; // Use mock

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Request Validation', () => {
        it('should return 400 when userId is missing', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'recommend' }) });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).error).toContain('Missing required fields');
        });

        it('should return 400 when action is missing', async () => {
            const res = await handler({ body: JSON.stringify({ userId: 'user-1' }) });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('User Profile Fetching', () => {
        it('should fetch user profile from DynamoDB', async () => {
            const mockProfile = {
                userId: 'user-1',
                currentRole: 'Junior Developer',
                targetRole: 'Senior ML Engineer',
                skills: ['Python', 'JavaScript'],
                yearsExperience: 2,
            };
            dynamoMock.on(GetCommand).resolves({ Item: mockProfile });
            dynamoMock.on(PutCommand).resolves({});

            const profile = await getUserProfile('user-1');
            expect(profile.currentRole).toBe('Junior Developer');
            expect(profile.targetRole).toBe('Senior ML Engineer');
        });

        it('should return minimal profile when user not found', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            const profile = await getUserProfile('unknown-user');
            expect(profile.userId).toBe('unknown-user');
        });
    });

    describe('Agent Invocation with User Profile Context', () => {
        it('should return recommendations for a valid request', async () => {
            const mockProfile = {
                userId: 'user-2',
                currentRole: 'Backend Developer',
                targetRole: 'Machine Learning Engineer',
                skills: ['Python', 'Node.js'],
                yearsExperience: 3,
            };
            dynamoMock.on(GetCommand).resolves({ Item: mockProfile });
            dynamoMock.on(PutCommand).resolves({});

            const event = {
                body: JSON.stringify({ userId: 'user-2', action: 'recommend' }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(body.recommendations).toBeDefined();
            expect(Array.isArray(body.recommendations)).toBe(true);
            expect(body.recommendations.length).toBeGreaterThan(0);
            expect(body.reasoning).toBeDefined();
            expect(body.nextSteps).toBeDefined();
            expect(Array.isArray(body.nextSteps)).toBe(true);
            expect(body.sessionId).toBeDefined();
        });

        it('should include actionable recommendations with action steps', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: { userId: 'user-3' } });
            dynamoMock.on(PutCommand).resolves({});

            const event = {
                body: JSON.stringify({
                    userId: 'user-3',
                    action: 'analyze-skills',
                    context: { targetRole: 'Frontend Engineer', currentSkills: ['HTML', 'CSS'] },
                }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            body.recommendations.forEach((rec: any) => {
                expect(rec.title).toBeDefined();
                expect(rec.description).toBeDefined();
                expect(rec.priority).toMatch(/high|medium|low/);
                expect(Array.isArray(rec.actionSteps)).toBe(true);
                expect(rec.actionSteps.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Session State Persistence', () => {
        it('should save agent session to DynamoDB after successful response', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: { userId: 'user-4' } });
            dynamoMock.on(PutCommand).resolves({});

            const event = {
                body: JSON.stringify({ userId: 'user-4', action: 'recommend' }),
            };

            await handler(event);

            const putCalls = dynamoMock.commandCalls(PutCommand);
            expect(putCalls.length).toBeGreaterThan(0);

            const savedSession = putCalls[0].args[0].input.Item;
            expect(savedSession?.userId).toBe('user-4');
            expect(savedSession?.sessionId).toBeDefined();
            expect(savedSession?.ttl).toBeDefined();
        });

        it('should accept and use provided sessionId', async () => {
            dynamoMock.on(GetCommand).resolves({ Item: { userId: 'user-5' } });
            dynamoMock.on(PutCommand).resolves({});

            const event = {
                body: JSON.stringify({
                    userId: 'user-5',
                    action: 'suggest-path',
                    sessionId: 'existing-session-123',
                }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);
            expect(body.sessionId).toBe('existing-session-123');
        });
    });

    describe('buildAgentInput', () => {
        it('should incorporate user profile context into prompt', () => {
            const request = {
                userId: 'user-6',
                action: 'recommend' as const,
                context: { targetRole: 'Data Scientist', currentSkills: ['Python', 'SQL'] },
            };
            const profile = { userId: 'user-6', currentRole: 'BI Analyst', yearsExperience: 4 };
            const input = buildAgentInput(request, profile);

            expect(input).toContain('Data Scientist');
            expect(input).toContain('Python');
            expect(input).toContain('SQL');
            expect(input).toContain('BI Analyst');
        });
    });

    describe('Mock Agent Response Quality', () => {
        it('should return ML-focused recommendations for ML target role', () => {
            const response = generateMockAgentResponse('Target Role: Machine Learning Engineer skills Python');
            const titles = response.recommendations.map(r => r.title);
            const hasMLRec = titles.some(t => t.toLowerCase().includes('python') || t.toLowerCase().includes('ml'));
            expect(hasMLRec).toBe(true);
        });

        it('should always include nextSteps', () => {
            const response = generateMockAgentResponse('Any input');
            expect(Array.isArray(response.nextSteps)).toBe(true);
            expect(response.nextSteps.length).toBeGreaterThan(0);
        });
    });

    describe('CORS Headers', () => {
        it('should include CORS headers in all responses', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'recommend' }) });
            expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
        });
    });
});
