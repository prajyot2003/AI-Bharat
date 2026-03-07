/**
 * Unit Tests for Learning Path Lambda Handler
 * Requirements: 1.5, 4.5, 6.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const bedrockMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

const { handler, analyzeSkillGaps, getMockSteps } = await import('../index.js');

describe('Learning Path Lambda Handler', () => {
    beforeEach(() => {
        bedrockMock.reset();
        dynamoMock.reset();
        process.env.AWS_REGION = 'us-east-1';
        process.env.LEARNING_PATH_TABLE = 'test-learning-paths';
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('Request Validation', () => {
        it('should return 400 for missing action', async () => {
            const res = await handler({ body: JSON.stringify({ userId: 'u1' }) });
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 for missing userId', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'generate' }) });
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 for generate without targetRole', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'generate', userId: 'u1' }) });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Path Generation', () => {
        it('should generate a learning path with 5 steps', async () => {
            dynamoMock.on(PutCommand).resolves({});

            const mockStepsResponse = JSON.stringify([
                { id: '1', title: 'Python Basics', description: 'Learn Python', type: 'course', status: 'unlocked', xp: 100, estimatedHours: 10, resources: ['freeCodeCamp'], skillsGained: ['Python'] },
                { id: '2', title: 'NumPy & Pandas', description: 'Data manipulation', type: 'course', status: 'locked', xp: 150, estimatedHours: 8, resources: ['Udemy'], skillsGained: ['NumPy'] },
                { id: '3', title: 'ML Fundamentals', description: 'Core ML concepts', type: 'video', status: 'locked', xp: 200, estimatedHours: 12, resources: ['fast.ai'], skillsGained: ['ML'] },
                { id: '4', title: 'Deep Learning', description: 'Neural networks', type: 'course', status: 'locked', xp: 250, estimatedHours: 20, resources: ['PyTorch docs'], skillsGained: ['PyTorch'] },
                { id: '5', title: 'ML Project', description: 'Build a model', type: 'project', status: 'locked', xp: 300, estimatedHours: 25, resources: ['Kaggle'], skillsGained: ['Deployment'] },
            ]);

            bedrockMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{ text: mockStepsResponse }],
                    usage: { input_tokens: 100, output_tokens: 300 },
                })),
            });

            const res = await handler({
                body: JSON.stringify({
                    action: 'generate',
                    userId: 'user-1',
                    targetRole: 'Machine Learning Engineer',
                    currentSkills: ['Python'],
                    timeframe: 12,
                }),
            });

            const body = JSON.parse(res.body);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(body.steps)).toBe(true);
            expect(body.steps.length).toBe(5);
            expect(body.skillGaps).toBeDefined();
            expect(body.totalXP).toBeGreaterThan(0);
            expect(body.pathId).toBeDefined();
        });

        it('should save the path to DynamoDB', async () => {
            dynamoMock.on(PutCommand).resolves({});
            bedrockMock.on(InvokeModelCommand).rejects(new Error('Not set'));

            await handler({
                body: JSON.stringify({ action: 'generate', userId: 'u2', targetRole: 'Frontend Engineer' }),
            });

            const puts = dynamoMock.commandCalls(PutCommand);
            expect(puts.length).toBeGreaterThan(0);
            expect(puts[0].args[0].input.Item?.targetRole).toBe('Frontend Engineer');
        });
    });

    describe('Skill Gap Analysis', () => {
        it('should identify gaps for ML Engineer role', () => {
            const gaps = analyzeSkillGaps(['Python'], 'Machine Learning Engineer');
            const gapSkills = gaps.map(g => g.skill);
            // Python is in current skills – should have beginner level, not none
            const pythonGap = gaps.find(g => g.skill === 'Python');
            expect(pythonGap?.currentLevel).toBe('beginner');
            // TensorFlow should be missing
            expect(gapSkills).toContain('TensorFlow');
        });

        it('should return priority levels', () => {
            const gaps = analyzeSkillGaps([], 'Software Engineer');
            expect(gaps.some(g => g.priority === 'critical')).toBe(true);
            expect(gaps.some(g => g.priority === 'high')).toBe(true);
        });

        it('should return at least one skill gap for unknown role', () => {
            const gaps = analyzeSkillGaps([], 'Unknown Role XYZ');
            expect(gaps.length).toBeGreaterThan(0);
        });
    });

    describe('Progress Tracking', () => {
        it('should update step status and unlock next step', async () => {
            const existingPath = {
                pathId: 'path-u3-123',
                userId: 'u3',
                targetRole: 'Frontend Engineer',
                skillGaps: [],
                steps: [
                    { id: '1', title: 'Step 1', status: 'unlocked', xp: 100 },
                    { id: '2', title: 'Step 2', status: 'locked', xp: 150 },
                ],
                totalXP: 250,
                completedXP: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            dynamoMock.on(GetCommand).resolves({ Item: existingPath });
            dynamoMock.on(PutCommand).resolves({});

            const res = await handler({
                body: JSON.stringify({
                    action: 'update-progress',
                    userId: 'u3',
                    pathId: 'path-u3-123',
                    progressUpdate: { stepId: '1', status: 'completed' },
                }),
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.completedXP).toBe(100);
        });

        it('should return 404 if step not found', async () => {
            dynamoMock.on(GetCommand).resolves({
                Item: { pathId: 'p1', userId: 'u4', steps: [{ id: '1' }] },
            });

            const res = await handler({
                body: JSON.stringify({
                    action: 'update-progress',
                    userId: 'u4',
                    pathId: 'p1',
                    progressUpdate: { stepId: 'nonexistent', status: 'completed' },
                }),
            });
            expect(res.statusCode).toBe(404);
        });
    });

    describe('Mock Steps', () => {
        it('should return exactly 5 steps', () => {
            const steps = getMockSteps('Frontend Engineer', [{ skill: 'React', currentLevel: 'none', targetLevel: 'advanced', priority: 'critical' }]);
            expect(steps.length).toBe(5);
        });

        it('should have first step unlocked and rest locked', () => {
            const steps = getMockSteps('Software Engineer', []);
            expect(steps[0].status).toBe('unlocked');
            steps.slice(1).forEach(s => expect(s.status).toBe('locked'));
        });
    });
});
