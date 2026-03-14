/**
 * Learning Path Lambda Handler
 *
 * Generates personalized learning paths using skill gap analysis and
 * Amazon Bedrock. Stores and tracks progress in DynamoDB.
 *
 * Requirements: 1.5, 3.8, 4.5, 6.7
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

const LEARNING_PATH_TABLE = process.env.LEARNING_PATH_TABLE || 'navixa-learning-paths';

export interface LearningPathRequest {
    action: 'generate' | 'get' | 'update-progress';
    userId: string;
    targetRole?: string;
    currentSkills?: string[];
    timeframe?: number; // weeks
    pathId?: string;
    progressUpdate?: ProgressUpdate;
}

export interface LearningPathStep {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'article' | 'project' | 'quiz' | 'course';
    status: 'locked' | 'unlocked' | 'in-progress' | 'completed';
    xp: number;
    estimatedHours: number;
    resources: string[];
    skillsGained: string[];
}

export interface SkillGap {
    skill: string;
    currentLevel: 'none' | 'beginner' | 'intermediate';
    targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    priority: 'critical' | 'high' | 'medium';
}

export interface LearningPath {
    pathId: string;
    userId: string;
    targetRole: string;
    skillGaps: SkillGap[];
    steps: LearningPathStep[];
    estimatedWeeks: number;
    totalXP: number;
    completedXP: number;
    createdAt: number;
    updatedAt: number;
}

interface ProgressUpdate {
    stepId: string;
    status: 'in-progress' | 'completed';
}

interface APIGatewayResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export const handler = async (event: any): Promise<APIGatewayResponse> => {
    console.log('Learning Path Lambda event');

    try {
        const req: LearningPathRequest =
            typeof event.body === 'string' ? JSON.parse(event.body) : event;

        if (!req.action || !req.userId) {
            return createErrorResponse(400, 'Missing required fields: action, userId');
        }

        switch (req.action) {
            case 'generate':
                return handleGeneratePath(req);
            case 'get':
                return handleGetPath(req);
            case 'update-progress':
                return handleUpdateProgress(req);
            default:
                return createErrorResponse(400, `Unknown action: ${req.action}`);
        }
    } catch (error: any) {
        console.error('Learning Path Lambda error:', error.message);
        return createErrorResponse(500, 'Learning path service temporarily unavailable.');
    }
};

async function handleGeneratePath(req: LearningPathRequest): Promise<APIGatewayResponse> {
    if (!req.targetRole) {
        return createErrorResponse(400, 'Missing required field: targetRole');
    }

    // Analyze skill gaps
    const skillGaps = analyzeSkillGaps(req.currentSkills || [], req.targetRole);

    // Generate steps using Bedrock
    const steps = await generatePathSteps(req.targetRole, skillGaps, req.timeframe || 12);

    const pathId = `path-${req.userId}-${Date.now()}`;
    const path: LearningPath = {
        pathId,
        userId: req.userId,
        targetRole: req.targetRole,
        skillGaps,
        steps,
        estimatedWeeks: req.timeframe || 12,
        totalXP: steps.reduce((sum, s) => sum + s.xp, 0),
        completedXP: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await saveLearningPath(path);

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(path) };
}

async function handleGetPath(req: LearningPathRequest): Promise<APIGatewayResponse> {
    if (!req.pathId) {
        return createErrorResponse(400, 'Missing required field: pathId');
    }

    try {
        const result = await dynamoClient.send(
            new GetCommand({ TableName: LEARNING_PATH_TABLE, Key: { userId: req.userId, pathId: req.pathId } })
        );
        if (!result.Item) {
            return createErrorResponse(404, 'Learning path not found');
        }
        return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(result.Item) };
    } catch (error) {
        console.error('Failed to get path:', error);
        return createErrorResponse(500, 'Failed to retrieve learning path.');
    }
}

async function handleUpdateProgress(req: LearningPathRequest): Promise<APIGatewayResponse> {
    if (!req.pathId || !req.progressUpdate) {
        return createErrorResponse(400, 'Missing required fields: pathId, progressUpdate');
    }

    try {
        const existing = await dynamoClient.send(
            new GetCommand({ TableName: LEARNING_PATH_TABLE, Key: { userId: req.userId, pathId: req.pathId } })
        );

        if (!existing.Item) {
            return createErrorResponse(404, 'Learning path not found');
        }

        const path = existing.Item as LearningPath;
        const step = path.steps.find(s => s.id === req.progressUpdate!.stepId);
        if (!step) {
            return createErrorResponse(404, 'Step not found');
        }

        const prevStatus = step.status;
        step.status = req.progressUpdate.status;

        // Unlock next step after completing current
        if (req.progressUpdate.status === 'completed' && prevStatus !== 'completed') {
            path.completedXP += step.xp;
            const nextStep = path.steps.find(s => s.status === 'locked');
            if (nextStep) nextStep.status = 'unlocked';
        }

        path.updatedAt = Date.now();
        await saveLearningPath(path);

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({ message: 'Progress updated', completedXP: path.completedXP, totalXP: path.totalXP }),
        };
    } catch (error) {
        console.error('Failed to update progress:', error);
        return createErrorResponse(500, 'Failed to update progress.');
    }
}

/**
 * Analyze skill gaps between current skills and target role requirements
 */
export function analyzeSkillGaps(currentSkills: string[], targetRole: string): SkillGap[] {
    const roleRequirements: Record<string, string[]> = {
        'Machine Learning Engineer': ['Python', 'TensorFlow', 'PyTorch', 'Statistics', 'Linear Algebra', 'AWS SageMaker'],
        'Software Engineer': ['Data Structures', 'Algorithms', 'System Design', 'Git', 'SQL'],
        'Frontend Engineer': ['React', 'TypeScript', 'CSS', 'Next.js', 'Testing'],
        'DevOps Engineer': ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Linux', 'AWS'],
        'Data Scientist': ['Python', 'SQL', 'Statistics', 'Data Visualization', 'Machine Learning'],
        'Full Stack Engineer': ['React', 'Node.js', 'SQL', 'REST APIs', 'Docker', 'Git'],
    };

    // Find closest matching role
    const roleKey = Object.keys(roleRequirements).find(r =>
        r.toLowerCase().includes(targetRole.toLowerCase()) ||
        targetRole.toLowerCase().includes(r.toLowerCase())
    ) || 'Software Engineer';

    const required = roleRequirements[roleKey] || roleRequirements['Software Engineer'];
    const currentLower = currentSkills.map(s => s.toLowerCase());

    return required.map((skill, idx) => ({
        skill,
        currentLevel: currentLower.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))
            ? 'beginner' as const
            : 'none' as const,
        targetLevel: 'advanced' as const,
        priority: idx < 2 ? 'critical' as const : idx < 4 ? 'high' as const : 'medium' as const,
    })).filter(g => g.currentLevel !== 'intermediate');
}

/**
 * Generate learning path steps using Bedrock
 */
async function generatePathSteps(
    targetRole: string,
    skillGaps: SkillGap[],
    timeframeWeeks: number
): Promise<LearningPathStep[]> {
    const criticalSkills = skillGaps.filter(g => g.priority === 'critical' || g.priority === 'high').slice(0, 5);

    try {
        const prompt = `Create a 5-step learning path for someone targeting "${targetRole}" with ${timeframeWeeks} weeks. Focus on: ${criticalSkills.map(s => s.skill).join(', ')}.

Return ONLY a JSON array (no markdown) with exactly 5 objects having these fields:
{"id":"1","title":"Step Title","description":"Brief description","type":"course","status":"unlocked","xp":100,"estimatedHours":8,"resources":["resource1","resource2"],"skillsGained":["skill1"]}

First step status must be "unlocked", rest must be "locked". XP per step: 100-300.`;

        const requestBody = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1200,
            temperature: 0.4,
            messages: [{ role: 'user', content: prompt }],
        };

        const result = await bedrockClient.send(new InvokeModelCommand({
            modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody),
        }));

        const parsed = JSON.parse(new TextDecoder().decode(result.body));
        const text = parsed.content[0].text;

        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            return JSON.parse(text.substring(start, end + 1)) as LearningPathStep[];
        }
    } catch (error) {
        console.warn('Bedrock path generation failed, using mock steps:', error);
    }

    return getMockSteps(targetRole, criticalSkills);
}

export function getMockSteps(targetRole: string, skillGaps: SkillGap[]): LearningPathStep[] {
    const skill0 = skillGaps[0]?.skill || 'Core Skills';
    const skill1 = skillGaps[1]?.skill || 'Advanced Concepts';

    return [
        { id: '1', title: `${skill0} Fundamentals`, description: `Master the basics of ${skill0}`, type: 'course', status: 'unlocked', xp: 100, estimatedHours: 10, resources: ['freeCodeCamp', 'YouTube tutorials'], skillsGained: [skill0] },
        { id: '2', title: `${skill1} Deep Dive`, description: `Advanced ${skill1} techniques`, type: 'video', status: 'locked', xp: 150, estimatedHours: 8, resources: ['Udemy course', 'Official docs'], skillsGained: [skill1] },
        { id: '3', title: 'Portfolio Project', description: `Build a real-world project for ${targetRole}`, type: 'project', status: 'locked', xp: 250, estimatedHours: 20, resources: ['GitHub', 'CodeSandbox'], skillsGained: ['Project Planning', 'Code Quality'] },
        { id: '4', title: 'System Design Prep', description: 'Learn system design for interviews', type: 'article', status: 'locked', xp: 200, estimatedHours: 12, resources: ['Grokking System Design', 'architecturenotes.co'], skillsGained: ['System Design', 'Scalability'] },
        { id: '5', title: 'Interview Mastery', description: 'Practice technical and behavioral interviews', type: 'quiz', status: 'locked', xp: 300, estimatedHours: 15, resources: ['LeetCode', 'Pramp', 'levels.fyi'], skillsGained: ['Algorithms', 'Communication'] },
    ];
}

async function saveLearningPath(path: LearningPath): Promise<void> {
    await dynamoClient.send(new PutCommand({ TableName: LEARNING_PATH_TABLE, Item: path }));
}

function createErrorResponse(statusCode: number, message: string): APIGatewayResponse {
    return { statusCode, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

function corsHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}
