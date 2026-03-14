/**
 * RAG Query Lambda Handler
 *
 * Handles RAG (Retrieval-Augmented Generation) queries using Amazon Bedrock
 * Knowledge Base. Implements response caching in DynamoDB.
 *
 * Requirements: 2.1–2.10, 13.3, 15.10
 */

import {
    BedrockAgentRuntimeClient,
    RetrieveCommand,
    RetrievedResultLocation,
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

// Initialize AWS clients
const bedrockAgentClient = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const bedrockRuntimeClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const dynamoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

// Environment variables
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID || '';
const RAG_CACHE_TABLE = process.env.RAG_CACHE_TABLE || 'navixa-rag-cache';
const CACHE_TTL_SECONDS = 3600; // 1 hour
const MAX_RESULTS = 5;

// Types
export interface RAGQueryEvent {
    query: string;
    userId: string;
    maxResults?: number;
    sessionId?: string;
}

export interface RAGSource {
    documentId: string;
    documentTitle: string;
    excerpt: string;
    score: number;
    location?: string;
}

export interface RAGQueryResponse {
    answer: string;
    sources: RAGSource[];
    cached: boolean;
    queryHash: string;
}

interface CacheEntry {
    queryHash: string;
    answer: string;
    sources: RAGSource[];
    ttl: number;
    createdAt: number;
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
    console.log('RAG Query event received:', JSON.stringify({ ...event, body: '[REDACTED]' }));

    try {
        const requestBody: RAGQueryEvent =
            typeof event.body === 'string' ? JSON.parse(event.body) : event;

        // Validate required fields
        if (!requestBody.query || !requestBody.userId) {
            return createErrorResponse(400, 'Missing required fields: query, userId');
        }

        const maxResults = Math.min(requestBody.maxResults || MAX_RESULTS, 5);
        const queryHash = generateQueryHash(requestBody.query);

        // Check cache first
        const cached = await getCachedResponse(queryHash);
        if (cached) {
            console.log(`Cache hit for query hash: ${queryHash}`);
            return {
                statusCode: 200,
                headers: corsHeaders(),
                body: JSON.stringify({
                    answer: cached.answer,
                    sources: cached.sources,
                    cached: true,
                    queryHash,
                } as RAGQueryResponse),
            };
        }

        // Retrieve documents from knowledge base
        const retrievedDocs = await retrieveFromKnowledgeBase(requestBody.query, maxResults);

        // Build context from retrieved documents
        const context = buildContext(retrievedDocs);

        // Generate answer using Bedrock
        const answer = await generateAnswer(requestBody.query, context);

        // Build source citations
        const sources = buildSources(retrievedDocs);

        // Cache the response
        await cacheResponse(queryHash, answer, sources);

        const response: RAGQueryResponse = {
            answer,
            sources,
            cached: false,
            queryHash,
        };

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify(response),
        };
    } catch (error: any) {
        console.error('RAG Query error:', error.message);
        return handleError(error);
    }
};

/**
 * Retrieve documents from Bedrock Knowledge Base
 */
async function retrieveFromKnowledgeBase(
    query: string,
    maxResults: number
): Promise<any[]> {
    if (!KNOWLEDGE_BASE_ID) {
        // Fallback: return mock documents for development
        console.warn('KNOWLEDGE_BASE_ID not set; returning mock documents');
        return getMockDocuments(query);
    }

    const command = new RetrieveCommand({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        retrievalQuery: { text: query },
        retrievalConfiguration: {
            vectorSearchConfiguration: {
                numberOfResults: maxResults,
            },
        },
    });

    const result = await bedrockAgentClient.send(command);
    return result.retrievalResults || [];
}

/**
 * Generate an answer using Bedrock Claude with retrieved context
 */
async function generateAnswer(query: string, context: string): Promise<string> {
    const prompt = `You are a career guidance expert. Use the following context from our knowledge base to answer the user's question. Be specific and cite relevant information.

Context:
${context}

User Question: ${query}

Answer (be concise, practical, and cite specific resources from the context):`;

    const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
    };

    const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
    });

    const response = await bedrockRuntimeClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text;
}

/**
 * Build context string from retrieved documents (max 5)
 */
function buildContext(docs: any[]): string {
    const topDocs = docs.slice(0, MAX_RESULTS);
    return topDocs
        .map((doc: any, i: number) => {
            const content = doc.content?.text || doc.text || '';
            const title = doc.metadata?.title || doc.location?.s3Location?.uri || `Document ${i + 1}`;
            return `[${i + 1}] ${title}\n${content.substring(0, 500)}`;
        })
        .join('\n\n---\n\n');
}

/**
 * Build source citations from retrieved documents
 */
export function buildSources(docs: any[]): RAGSource[] {
    return docs.slice(0, MAX_RESULTS).map((doc: any, i: number) => ({
        documentId: doc.metadata?.id || `doc-${i}`,
        documentTitle: doc.metadata?.title || doc.location?.s3Location?.uri || `Document ${i + 1}`,
        excerpt: (doc.content?.text || doc.text || '').substring(0, 200),
        score: doc.score || 0,
        location: doc.location?.s3Location?.uri,
    }));
}

/**
 * Get cached RAG response from DynamoDB
 */
export async function getCachedResponse(queryHash: string): Promise<CacheEntry | null> {
    try {
        const command = new GetCommand({
            TableName: RAG_CACHE_TABLE,
            Key: { queryHash },
        });
        const result = await dynamoClient.send(command);
        if (result.Item) {
            const entry = result.Item as CacheEntry;
            // Verify not expired
            if (entry.ttl > Math.floor(Date.now() / 1000)) {
                return entry;
            }
        }
        return null;
    } catch (error) {
        console.error('Cache lookup error:', error);
        return null; // Cache miss on error – proceed normally
    }
}

/**
 * Cache RAG response in DynamoDB
 */
export async function cacheResponse(
    queryHash: string,
    answer: string,
    sources: RAGSource[]
): Promise<void> {
    try {
        const entry: CacheEntry = {
            queryHash,
            answer,
            sources,
            ttl: Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS,
            createdAt: Date.now(),
        };
        const command = new PutCommand({
            TableName: RAG_CACHE_TABLE,
            Item: entry,
        });
        await dynamoClient.send(command);
        console.log(`Cached response for hash: ${queryHash}`);
    } catch (error) {
        console.error('Cache write error:', error);
        // Don't throw – caching failure should not fail the request
    }
}

/**
 * Generate a deterministic hash for a query string
 */
export function generateQueryHash(query: string): string {
    return createHash('sha256').update(query.trim().toLowerCase()).digest('hex').substring(0, 32);
}

/**
 * Return mock documents for development when KB not configured
 */
function getMockDocuments(query: string): any[] {
    const lowerQuery = query.toLowerCase();
    const docs = [
        {
            content: { text: 'Software engineers design, develop and maintain software systems. Key skills include data structures, algorithms, system design, and knowledge of at least one programming language (Python, JavaScript, Java). Entry-level positions require 0-2 years experience.' },
            metadata: { id: 'doc-1', title: 'Software Engineer Career Guide' },
            score: 0.9,
        },
        {
            content: { text: 'Machine learning engineers build ML systems and models. Required skills: Python, TensorFlow/PyTorch, statistics, linear algebra, data wrangling. Typical progression: Junior ML Engineer → ML Engineer → Senior ML Engineer → Principal AI Engineer.' },
            metadata: { id: 'doc-2', title: 'Machine Learning Career Path' },
            score: 0.85,
        },
        {
            content: { text: 'Full Stack Development uses React, Node.js, databases, and cloud services. Online resources: freeCodeCamp, The Odin Project, Udemy Web Dev Bootcamp, JavaScript.info. Estimated time to job-ready: 6–12 months with consistent practice.' },
            metadata: { id: 'doc-3', title: 'Full Stack Learning Resources' },
            score: 0.8,
        },
        {
            content: { text: 'Job market trends Q1 2025: AI/ML roles +45% growth, Cloud Engineering +30%, Full Stack +25%, DevOps +20%. Top companies hiring: Google, Amazon, Meta, Microsoft, startups. Remote positions: 60% of new tech openings.' },
            metadata: { id: 'doc-4', title: 'Job Market Data 2025' },
            score: 0.75,
        },
        {
            content: { text: 'Resume tips for tech roles: quantify achievements, include GitHub/portfolio link, tailor skills section for each role, use action verbs (Built, Designed, Reduced, Improved). ATS keywords: list exact skill names from job description.' },
            metadata: { id: 'doc-5', title: 'Resume Optimization Guide' },
            score: 0.7,
        },
    ];
    // Return all mock docs (in production, KB would rank by relevance)
    return docs;
}

/**
 * Handle errors and return API Gateway response
 */
function handleError(error: any): APIGatewayResponse {
    if (error.name === 'ResourceNotFoundException') {
        return createErrorResponse(404, 'Knowledge base not found. Please configure KNOWLEDGE_BASE_ID.');
    }
    if (error.name === 'AccessDeniedException') {
        return createErrorResponse(403, 'Access denied to knowledge base.');
    }
    if (error.name === 'ThrottlingException') {
        return createErrorResponse(429, 'Too many requests. Please try again later.');
    }
    return createErrorResponse(500, 'Knowledge base query failed. Please try again.');
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
