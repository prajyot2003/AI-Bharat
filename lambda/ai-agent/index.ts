/**
 * AI Agent Lambda Handler
 *
 * Handles AI Agent requests using Amazon Bedrock Agents. Provides personalized
 * career recommendations by fetching user profile, invoking the agent, and
 * processing tool-use actions.
 *
 * Requirements: 3.1–3.10
 */

import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS clients
const bedrockAgentClient = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const dynamoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

// Environment variables
const AGENT_ID = process.env.BEDROCK_AGENT_ID || '';
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID';
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'navixa-user-profiles';
const AGENT_SESSIONS_TABLE = process.env.AGENT_SESSIONS_TABLE || 'navixa-chat-sessions';

// Types
export interface AgentRequestEvent {
    userId: string;
    action: 'recommend' | 'analyze-skills' | 'suggest-path';
    context?: {
        targetRole?: string;
        currentSkills?: string[];
        yearsExperience?: number;
        desiredTimeline?: string;
    };
    sessionId?: string;
}

export interface AgentRecommendation {
    type: 'skill' | 'role' | 'learning';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionSteps: string[];
}

export interface AgentResponse {
    recommendations: AgentRecommendation[];
    reasoning: string;
    nextSteps: string[];
    sessionId: string;
}

export interface UserProfile {
    userId: string;
    name?: string;
    currentRole?: string;
    targetRole?: string;
    skills?: string[];
    yearsExperience?: number;
    location?: string;
}

interface APIGatewayResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

/**
 * Main Lambda handler
 */
export const handler = async (event: any): Promise<APIGatewayResponse> => {
    console.log('AI Agent event received:', JSON.stringify({ ...event, body: '[REDACTED]' }));

    try {
        const requestBody: AgentRequestEvent =
            typeof event.body === 'string' ? JSON.parse(event.body) : event;

        if (!requestBody.userId || !requestBody.action) {
            return createErrorResponse(400, 'Missing required fields: userId, action');
        }

        // Fetch user profile
        const userProfile = await getUserProfile(requestBody.userId);

        // Generate session ID if not provided
        const sessionId = requestBody.sessionId || generateSessionId();

        // Build context-aware prompt
        const agentInput = buildAgentInput(requestBody, userProfile);

        // Invoke agent (real or mock)
        const agentResult = await invokeAgent(agentInput, sessionId, requestBody.userId);

        // Save session state
        await saveAgentSession(sessionId, requestBody.userId, agentInput, agentResult.reasoning);

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({ ...agentResult, sessionId }),
        };
    } catch (error: any) {
        console.error('AI Agent error:', error.message);
        return handleError(error);
    }
};

/**
 * Fetch user profile from DynamoDB
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
    try {
        const command = new GetCommand({
            TableName: USER_PROFILES_TABLE,
            Key: { userId },
        });
        const result = await dynamoClient.send(command);
        if (result.Item) {
            return result.Item as UserProfile;
        }
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
    }
    return { userId }; // Return minimal profile if not found
}

/**
 * Build agent input from request and profile
 */
export function buildAgentInput(request: AgentRequestEvent, profile: UserProfile): string {
    const ctx = request.context || {};
    const skills = ctx.currentSkills || profile.skills || [];
    const targetRole = ctx.targetRole || profile.targetRole || 'a tech role';
    const currentRole = profile.currentRole || 'unknown role';
    const years = ctx.yearsExperience ?? profile.yearsExperience ?? 0;

    return `User ID: ${request.userId}
Action: ${request.action}
Current Role: ${currentRole}
Target Role: ${targetRole}
Current Skills: ${skills.length > 0 ? skills.join(', ') : 'Not specified'}
Years of Experience: ${years}
${ctx.desiredTimeline ? `Desired Timeline: ${ctx.desiredTimeline}` : ''}

Please provide personalized career recommendations for this user.`;
}

/**
 * Invoke Bedrock Agent or fall back to structured mock response
 */
async function invokeAgent(
    input: string,
    sessionId: string,
    userId: string
): Promise<AgentResponse> {
    if (!AGENT_ID) {
        console.warn('BEDROCK_AGENT_ID not set; using mock agent response');
        return generateMockAgentResponse(input);
    }

    try {
        const command = new InvokeAgentCommand({
            agentId: AGENT_ID,
            agentAliasId: AGENT_ALIAS_ID,
            sessionId,
            inputText: input,
        });

        const response = await bedrockAgentClient.send(command);

        // Collect streaming response
        let fullText = '';
        if (response.completion) {
            for await (const chunk of response.completion) {
                if (chunk.chunk?.bytes) {
                    fullText += new TextDecoder().decode(chunk.chunk.bytes);
                }
            }
        }

        return parseAgentResponse(fullText);
    } catch (error) {
        console.error('Bedrock Agent invocation failed, falling back to mock:', error);
        return generateMockAgentResponse(input);
    }
}

/**
 * Parse agent text response into structured recommendations
 */
function parseAgentResponse(text: string): AgentResponse {
    // Try to parse if JSON was returned
    try {
        const parsed = JSON.parse(text);
        if (parsed.recommendations) return parsed;
    } catch {
        // Not JSON – treat as reasoning text
    }

    return {
        recommendations: [
            {
                type: 'skill',
                title: 'Build Core Skills',
                description: text.substring(0, 200) || 'Focus on building foundational skills for your target role.',
                priority: 'high',
                actionSteps: ['Identify skill gaps', 'Select learning resources', 'Set weekly goals'],
            },
        ],
        reasoning: text,
        nextSteps: ['Review your skill gaps', 'Create a learning schedule', 'Build portfolio projects'],
        sessionId: '',
    };
}

/**
 * Generate mock agent response for development
 */
export function generateMockAgentResponse(input: string): AgentResponse {
    const isMLPath = input.toLowerCase().includes('machine learning') || input.toLowerCase().includes('ml');
    const isWebPath = input.toLowerCase().includes('web') || input.toLowerCase().includes('frontend') || input.toLowerCase().includes('react');

    const recommendations: AgentRecommendation[] = [
        {
            type: 'skill',
            title: isMLPath ? 'Master Python and ML Libraries' : 'Strengthen JavaScript/TypeScript',
            description: isMLPath
                ? 'Python is the primary language for ML. Focus on NumPy, Pandas, and Scikit-learn.'
                : 'TypeScript is increasingly required for senior frontend roles. Build projects with React and Next.js.',
            priority: 'high',
            actionSteps: [
                isMLPath ? 'Complete Python Data Science Handbook' : 'Complete TypeScript Handbook',
                'Build 2 portfolio projects',
                'Solve 30 LeetCode problems',
            ],
        },
        {
            type: 'role',
            title: 'Target Companies Based on Your Profile',
            description: 'Your experience level matches mid-tier tech companies and high-growth startups.',
            priority: 'medium',
            actionSteps: [
                'Update LinkedIn profile with quantified achievements',
                'Apply to 5 companies per week',
                'Request referrals from network',
            ],
        },
        {
            type: 'learning',
            title: 'Structured 90-Day Learning Plan',
            description: 'A focused 3-month plan will position you for your target role.',
            priority: 'high',
            actionSteps: [
                'Month 1: Core technical skills',
                'Month 2: Projects and portfolio',
                'Month 3: Interview preparation',
            ],
        },
    ];

    return {
        recommendations,
        reasoning: `Based on your profile, I analyzed your current skills, target role, and experience level. ${isMLPath ? 'Machine learning roles require strong Python skills and mathematical foundations.' : 'Web development roles prioritize modern JavaScript frameworks and system design.'} I recommend a structured 90-day approach to close skill gaps and build a strong portfolio.`,
        nextSteps: [
            'Complete skill self-assessment using our Skills Analyzer',
            'Start the recommended learning path in your dashboard',
            'Upload your resume for AI-powered ATS optimization',
        ],
    };
}

/**
 * Save agent session to DynamoDB
 */
async function saveAgentSession(
    sessionId: string,
    userId: string,
    input: string,
    response: string
): Promise<void> {
    try {
        const session = {
            sessionId,
            timestamp: Date.now(),
            userId,
            messages: [
                { role: 'user', content: input, timestamp: Date.now() },
                { role: 'assistant', content: response, timestamp: Date.now() },
            ],
            context: { type: 'agent' },
            model: 'bedrock-agent',
            ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
        };

        await dynamoClient.send(
            new PutCommand({ TableName: AGENT_SESSIONS_TABLE, Item: session })
        );
    } catch (error) {
        console.error('Failed to save agent session:', error);
    }
}

function generateSessionId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function handleError(error: any): APIGatewayResponse {
    if (error.name === 'ThrottlingException') {
        return createErrorResponse(429, 'Too many requests. Please try again later.');
    }
    if (error.name === 'AccessDeniedException') {
        return createErrorResponse(403, 'Access denied to AI agent.');
    }
    return createErrorResponse(500, 'AI agent service temporarily unavailable. Please try again.');
}

function createErrorResponse(statusCode: number, message: string): APIGatewayResponse {
    return {
        statusCode,
        headers: corsHeaders(),
        body: JSON.stringify({ error: message }),
    };
}

function corsHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
}
