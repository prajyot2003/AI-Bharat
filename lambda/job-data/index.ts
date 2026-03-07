/**
 * Job Data Lambda Handler
 *
 * Handles job search and market analysis using mock data (Remotive API)
 * and Amazon Bedrock for AI-powered trend analysis.
 *
 * Requirements: 4.4
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

const JOB_CACHE_TABLE = process.env.JOB_CACHE_TABLE || 'navixa-rag-cache';
const CACHE_TTL = 3600; // 1 hour

export interface JobDataRequest {
    action: 'search' | 'analyze' | 'match-skills';
    userId?: string;
    query?: string;
    skills?: string[];
    limit?: number;
}

export interface JobListing {
    id: string;
    role: string;
    company: string;
    location: string;
    type: string;
    link: string;
    description: string;
    requiredSkills: string[];
    matchScore?: number;
}

export interface MarketTrend {
    skill: string;
    growth: number;
    demand: 'Exploding' | 'Very High' | 'High' | 'Stable';
    color: string;
}

interface APIGatewayResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export const handler = async (event: any): Promise<APIGatewayResponse> => {
    console.log('Job Data Lambda event received');

    try {
        const requestBody: JobDataRequest =
            typeof event.body === 'string' ? JSON.parse(event.body) : event;

        if (!requestBody.action) {
            return createErrorResponse(400, 'Missing required field: action');
        }

        switch (requestBody.action) {
            case 'search':
                return handleJobSearch(requestBody);
            case 'analyze':
                return handleMarketAnalysis(requestBody);
            case 'match-skills':
                return handleSkillMatch(requestBody);
            default:
                return createErrorResponse(400, `Unknown action: ${requestBody.action}`);
        }
    } catch (error: any) {
        console.error('Job Data Lambda error:', error.message);
        return createErrorResponse(500, 'Job data service temporarily unavailable.');
    }
};

async function handleJobSearch(request: JobDataRequest): Promise<APIGatewayResponse> {
    const limit = Math.min(request.limit || 20, 50);
    const cacheKey = createHash('md5').update(`jobs:${request.query || 'all'}:${limit}`).digest('hex');

    // Check cache
    const cached = await getFromCache(cacheKey);
    if (cached) {
        return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ...cached, cached: true }) };
    }

    const jobs = getMockJobs(request.query, limit);
    const result = { jobs, total: jobs.length };

    await saveToCache(cacheKey, result);
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ...result, cached: false }) };
}

async function handleMarketAnalysis(request: JobDataRequest): Promise<APIGatewayResponse> {
    const cacheKey = createHash('md5').update('market:trends').digest('hex');
    const cached = await getFromCache(cacheKey);
    if (cached) {
        return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ...cached, cached: true }) };
    }

    const trends = getMarketTrends();

    // Use Bedrock for enhanced analysis
    let aiInsights = 'AI/ML and cloud computing continue to dominate tech hiring in 2025.';
    try {
        const prompt = `Provide 2 sentences of insight about the current tech job market based on these trends: ${JSON.stringify(trends.slice(0, 4))}. Be specific and practical.`;
        const responseBody = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 200,
            temperature: 0.5,
            messages: [{ role: 'user', content: prompt }],
        };
        const result = await bedrockClient.send(new InvokeModelCommand({
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(responseBody),
        }));
        const parsed = JSON.parse(new TextDecoder().decode(result.body));
        aiInsights = parsed.content[0].text;
    } catch {
        console.warn('Bedrock analysis failed, using default insights');
    }

    const data = { trends, aiInsights };
    await saveToCache(cacheKey, data);
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ...data, cached: false }) };
}

async function handleSkillMatch(request: JobDataRequest): Promise<APIGatewayResponse> {
    if (!request.skills || request.skills.length === 0) {
        return createErrorResponse(400, 'Missing required field: skills');
    }

    const jobs = getMockJobs(undefined, 50);
    const skillsLower = request.skills.map(s => s.toLowerCase());

    const matchedJobs = jobs.map(job => {
        const reqSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
        const matchCount = skillsLower.filter(s => reqSkillsLower.some(rs => rs.includes(s) || s.includes(rs))).length;
        const matchScore = Math.round((matchCount / Math.max(reqSkillsLower.length, 1)) * 100);
        return { ...job, matchScore };
    })
        .filter(j => j.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ jobs: matchedJobs, total: matchedJobs.length }) };
}

// Helpers
async function getFromCache(key: string): Promise<any | null> {
    try {
        const result = await dynamoClient.send(new GetCommand({ TableName: JOB_CACHE_TABLE, Key: { queryHash: key } }));
        if (result.Item && (result.Item as any).ttl > Math.floor(Date.now() / 1000)) {
            return (result.Item as any).data;
        }
    } catch { /* ignore */ }
    return null;
}

async function saveToCache(key: string, data: any): Promise<void> {
    try {
        await dynamoClient.send(new PutCommand({
            TableName: JOB_CACHE_TABLE,
            Item: { queryHash: key, data, ttl: Math.floor(Date.now() / 1000) + CACHE_TTL },
        }));
    } catch { /* ignore */ }
}

export function getMockJobs(query?: string, limit: number = 20): JobListing[] {
    const allJobs: JobListing[] = [
        { id: '1', role: 'Senior Software Engineer', company: 'TechCorp', location: 'Remote', type: 'Full-time', link: 'https://example.com/1', description: 'Build scalable backend services', requiredSkills: ['Python', 'AWS', 'Docker', 'PostgreSQL'] },
        { id: '2', role: 'ML Engineer', company: 'AI Startup', location: 'San Francisco, CA', type: 'Full-time', link: 'https://example.com/2', description: 'Train and deploy ML models', requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'AWS SageMaker'] },
        { id: '3', role: 'Frontend Engineer', company: 'Product Co', location: 'Remote', type: 'Full-time', link: 'https://example.com/3', description: 'Build React applications', requiredSkills: ['React', 'TypeScript', 'Next.js', 'CSS'] },
        { id: '4', role: 'DevOps Engineer', company: 'CloudSystems', location: 'New York, NY', type: 'Full-time', link: 'https://example.com/4', description: 'Maintain CI/CD pipelines', requiredSkills: ['Kubernetes', 'Docker', 'Terraform', 'AWS'] },
        { id: '5', role: 'Data Scientist', company: 'Analytics Inc', location: 'Remote', type: 'Full-time', link: 'https://example.com/5', description: 'Analyze large datasets', requiredSkills: ['Python', 'SQL', 'Pandas', 'Statistics'] },
        { id: '6', role: 'Full Stack Engineer', company: 'SaaS Startup', location: 'Remote', type: 'Full-time', link: 'https://example.com/6', description: 'Build full-stack web features', requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'AWS'] },
        { id: '7', role: 'Backend Engineer', company: 'FinTech Co', location: 'London, UK', type: 'Full-time', link: 'https://example.com/7', description: 'Build payment systems', requiredSkills: ['Go', 'Kafka', 'PostgreSQL', 'Docker'] },
        { id: '8', role: 'Cloud Architect', company: 'Enterprise Corp', location: 'Remote', type: 'Contract', link: 'https://example.com/8', description: 'Design cloud infrastructure', requiredSkills: ['AWS', 'Azure', 'GCP', 'Terraform', 'Architecture'] },
    ];

    const filtered = query
        ? allJobs.filter(j => j.role.toLowerCase().includes(query.toLowerCase()) || j.requiredSkills.some(s => s.toLowerCase().includes(query.toLowerCase())))
        : allJobs;

    return filtered.slice(0, limit);
}

export function getMarketTrends(): MarketTrend[] {
    return [
        { skill: 'AI/ML', growth: 45, demand: 'Exploding', color: 'bg-purple-500' },
        { skill: 'Cloud (AWS/GCP/Azure)', growth: 35, demand: 'Exploding', color: 'bg-purple-400' },
        { skill: 'TypeScript', growth: 30, demand: 'Very High', color: 'bg-emerald-500' },
        { skill: 'React/Next.js', growth: 25, demand: 'Very High', color: 'bg-emerald-400' },
        { skill: 'Python', growth: 22, demand: 'High', color: 'bg-cyan-500' },
        { skill: 'DevOps/K8s', growth: 20, demand: 'High', color: 'bg-cyan-400' },
        { skill: 'Go', growth: 15, demand: 'High', color: 'bg-blue-500' },
        { skill: 'Rust', growth: 10, demand: 'Stable', color: 'bg-blue-400' },
    ];
}

function createErrorResponse(statusCode: number, message: string): APIGatewayResponse {
    return { statusCode, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

function corsHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}
