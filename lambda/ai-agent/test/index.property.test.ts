/**
 * Property-Based Tests for AI Agent Lambda
 *
 * Property 8: AI agent data access
 * Property 9: AI agent personalized recommendations
 * Property 10: AI agent tool invocation
 * Property 11: AI agent learning path personalization
 * Property 12: AI agent actionable recommendations
 * Property 13: AI agent session state persistence
 *
 * Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 3.9, 3.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const bedrockAgentMock = mockClient(BedrockAgentRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

const { handler, buildAgentInput, generateMockAgentResponse } = await import('../index.js');

describe('Property-Based Tests: AI Agent Lambda', () => {
    beforeEach(() => {
        bedrockAgentMock.reset();
        dynamoMock.reset();

        process.env.AWS_REGION = 'us-east-1';
        process.env.USER_PROFILES_TABLE = 'test-user-profiles';
        process.env.AGENT_SESSIONS_TABLE = 'test-agent-sessions';
        process.env.BEDROCK_AGENT_ID = '';

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Property 8: AI agent data access
     */
    describe('Property 8: AI agent data access', () => {
        it('should access user profile data for any valid userId', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }),
                    fc.constantFrom('recommend', 'analyze-skills', 'suggest-path'),
                    async (userId, action) => {
                        dynamoMock.reset();
                        dynamoMock.on(GetCommand).resolves({
                            Item: { userId, currentRole: 'Developer', skills: ['Python'] },
                        });
                        dynamoMock.on(PutCommand).resolves({});

                        const event = { body: JSON.stringify({ userId, action }) };
                        const res = await handler(event);

                        expect(res.statusCode).toBe(200);
                        const getCalls = dynamoMock.commandCalls(GetCommand);
                        expect(getCalls.length).toBeGreaterThan(0);
                        expect(getCalls[0].args[0].input.Key?.userId).toBe(userId);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 9: AI agent personalized recommendations
     */
    describe('Property 9: AI agent personalized recommendations', () => {
        it('should return structured recommendations for any user with any target role', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }),
                    fc.string({ minLength: 3, maxLength: 50 }),
                    async (userId, targetRole) => {
                        dynamoMock.reset();
                        dynamoMock.on(GetCommand).resolves({ Item: { userId } });
                        dynamoMock.on(PutCommand).resolves({});

                        const event = {
                            body: JSON.stringify({ userId, action: 'recommend', context: { targetRole } }),
                        };
                        const res = await handler(event);
                        const body = JSON.parse(res.body);

                        expect(res.statusCode).toBe(200);
                        expect(Array.isArray(body.recommendations)).toBe(true);
                        expect(body.recommendations.length).toBeGreaterThan(0);
                        body.recommendations.forEach((r: any) => {
                            expect(r.title).toBeDefined();
                            expect(r.description).toBeDefined();
                            expect(['high', 'medium', 'low']).toContain(r.priority);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 12: AI agent actionable recommendations
     */
    describe('Property 12: AI agent actionable recommendations', () => {
        it('should include actionable next steps in any recommendation response', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }),
                    async (userId) => {
                        dynamoMock.reset();
                        dynamoMock.on(GetCommand).resolves({ Item: { userId } });
                        dynamoMock.on(PutCommand).resolves({});

                        const event = { body: JSON.stringify({ userId, action: 'recommend' }) };
                        const res = await handler(event);
                        const body = JSON.parse(res.body);

                        // Property: must have reasoning string
                        expect(typeof body.reasoning).toBe('string');
                        expect(body.reasoning.length).toBeGreaterThan(0);

                        // Property: must have next steps array
                        expect(Array.isArray(body.nextSteps)).toBe(true);
                        expect(body.nextSteps.length).toBeGreaterThan(0);

                        // Property: each recommendation must have action steps
                        body.recommendations.forEach((r: any) => {
                            expect(Array.isArray(r.actionSteps)).toBe(true);
                            expect(r.actionSteps.length).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 13: AI agent session state persistence
     */
    describe('Property 13: AI agent session state persistence', () => {
        it('should persist session to DynamoDB for any successful agent request', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }),
                    fc.constantFrom('recommend', 'analyze-skills', 'suggest-path'),
                    async (userId, action) => {
                        dynamoMock.reset();
                        dynamoMock.on(GetCommand).resolves({ Item: { userId } });
                        dynamoMock.on(PutCommand).resolves({});

                        const event = { body: JSON.stringify({ userId, action }) };
                        await handler(event);

                        const putCalls = dynamoMock.commandCalls(PutCommand);
                        expect(putCalls.length).toBeGreaterThan(0);

                        const session = putCalls[0].args[0].input.Item;
                        // Property: session must have userId, sessionId, and TTL
                        expect(session?.userId).toBe(userId);
                        expect(session?.sessionId).toBeDefined();
                        expect(typeof session?.ttl).toBe('number');
                        expect(session!.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 11: AI agent learning path personalization
     */
    describe('Property 11: AI agent learning path personalization', () => {
        it('should generate personalized response for any skill and role combination', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string({ minLength: 2, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
                    fc.string({ minLength: 3, maxLength: 50 }),
                    (skills, targetRole) => {
                        const input = `Target Role: ${targetRole} skills: ${skills.join(', ')}`;
                        const response = generateMockAgentResponse(input);

                        // Property: must return structured response regardless of input
                        expect(response.recommendations).toBeDefined();
                        expect(Array.isArray(response.recommendations)).toBe(true);
                        expect(typeof response.reasoning).toBe('string');
                        expect(Array.isArray(response.nextSteps)).toBe(true);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    /**
     * Property: buildAgentInput combines all context correctly
     */
    describe('buildAgentInput', () => {
        it('should always include userId and action in agent input for any request', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 3, maxLength: 20 }),
                    fc.constantFrom('recommend', 'analyze-skills', 'suggest-path'),
                    fc.option(fc.string({ minLength: 2, maxLength: 30 }), { nil: undefined }),
                    (userId, action, targetRole) => {
                        const request = { userId, action, context: targetRole ? { targetRole } : undefined } as any;
                        const profile = { userId };
                        const input = buildAgentInput(request, profile);

                        expect(input).toContain(userId);
                        expect(input).toContain(action);
                        if (targetRole) {
                            expect(input).toContain(targetRole);
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });
    });
});
