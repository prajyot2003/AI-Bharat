/**
 * AIServiceClient – Frontend client for AWS API Gateway backend
 *
 * Methods:
 * - sendChatMessage → POST /api/v1/chat/message
 * - generateLearningPath → POST /api/v1/learning/generate-path
 * - analyzeJobOpportunities → POST /api/v1/jobs/analyze
 * - enhanceResume → POST /api/v1/resume/enhance
 * - getCareerRecommendations → POST /api/v1/agent/recommend
 *
 * Requirements: 9.1–9.9, 14.2–14.4, 15.9
 */

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export interface ChatRequest {
    message: string;
    sessionId?: string;
    model?: 'claude-3-sonnet' | 'claude-3-haiku';
}

export interface ChatResponse {
    content: string;
    sessionId: string;
    model: string;
    usage: { inputTokens: number; outputTokens: number };
}

export interface LearningPathRequest {
    userId: string;
    targetRole: string;
    currentSkills?: string[];
    timeframe?: number;
}

export interface AgentRequest {
    userId: string;
    action: 'recommend' | 'analyze-skills' | 'suggest-path';
    context?: {
        targetRole?: string;
        currentSkills?: string[];
    };
}

export interface ResumeEnhanceRequest {
    userId: string;
    fileName: string;
    contentType: 'application/pdf' | 'text/plain' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

// Exponential backoff config
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Exponential backoff retry wrapper
 * Property 30: Retry logic with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = MAX_RETRIES,
    baseDelay = BASE_DELAY_MS
): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            // Don't retry client errors (4xx) – only transient server/network errors
            if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                throw error;
            }
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError!;
}

/**
 * Core fetch wrapper with API key auth and error handling
 */
async function apiFetch<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' = 'POST',
    body?: object
): Promise<T> {
    if (!API_GATEWAY_URL) {
        throw new Error('API_GATEWAY_URL not configured. Set NEXT_PUBLIC_API_GATEWAY_URL env variable.');
    }

    const url = `${API_GATEWAY_URL.replace(/\/$/, '')}${path}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Requirement 9.4: API key authentication
    if (API_KEY) {
        headers['x-api-key'] = API_KEY;
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // Requirement 9.8: Handle 401 authentication errors
    if (response.status === 401) {
        const error: any = new Error('Authentication failed. API key may be invalid or missing.');
        error.statusCode = 401;
        throw error;
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const error: any = new Error(errorData.error || `Request failed: ${response.status}`);
        error.statusCode = response.status;
        throw error;
    }

    return response.json() as Promise<T>;
}

/**
 * Send a chat message to the Bedrock-powered backend
 * Requirement 9.1
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return withRetry(() =>
        apiFetch<ChatResponse>('/api/v1/chat/message', 'POST', {
            action: 'chat',
            prompt: request.message,
            model: request.model || 'claude-3-haiku',
            sessionId: request.sessionId,
        })
    );
}

/**
 * Generate a personalized learning path
 * Requirement 9.2
 */
export async function generateLearningPath(request: LearningPathRequest): Promise<any> {
    return withRetry(() =>
        apiFetch('/api/v1/learning/generate-path', 'POST', {
            action: 'generate',
            ...request,
        })
    );
}

/**
 * Analyze job opportunities and match to user skills
 * Requirement 9.3
 */
export async function analyzeJobOpportunities(userId: string, skills?: string[]): Promise<any> {
    return withRetry(() =>
        apiFetch('/api/v1/jobs/analyze', 'POST', {
            action: skills ? 'match-skills' : 'analyze',
            userId,
            skills,
        })
    );
}

/**
 * Get a pre-signed URL to enhance/upload a resume
 * Requirement 9.7
 */
export async function enhanceResume(request: ResumeEnhanceRequest): Promise<any> {
    return withRetry(() =>
        apiFetch('/api/v1/resume/upload', 'POST', {
            action: 'generate-upload-url',
            ...request,
        })
    );
}

/**
 * Get personalized career recommendations from AI Agent
 * Requirement 9.5
 */
export async function getCareerRecommendations(request: AgentRequest): Promise<any> {
    return withRetry(() =>
        apiFetch('/api/v1/agent/recommend', 'POST', request)
    );
}

/**
 * Query the RAG knowledge base
 */
export async function queryKnowledgeBase(query: string, userId: string): Promise<any> {
    return withRetry(() =>
        apiFetch('/api/v1/rag/query', 'POST', { query, userId })
    );
}
