/**
 * Bedrock Request Lambda Handler
 * 
 * Handles direct Amazon Bedrock API calls for chat and generation.
 * Implements model selection logic, conversation context management,
 * and error handling with retry logic.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.10, 4.2
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));

// Environment variables
const CHAT_SESSIONS_TABLE = process.env.CHAT_SESSIONS_TABLE || 'navixa-chat-sessions';

// Types
interface BedrockRequestEvent {
  action: 'chat' | 'generate';
  prompt: string;
  model: 'claude-3-sonnet' | 'claude-3-haiku';
  sessionId?: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

interface BedrockRequestResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  sessionId: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  sessionId: string;
  timestamp: number;
  userId: string;
  messages: ChatMessage[];
  context: Record<string, any>;
  model: string;
  ttl: number;
}

interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Model ID mapping
const MODEL_IDS: Record<string, string> = {
  'claude-3-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
  'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
};

// Default model parameters
const DEFAULT_PARAMETERS = {
  'claude-3-sonnet': {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
  },
  'claude-3-haiku': {
    temperature: 0.5,
    maxTokens: 1024,
    topP: 0.9,
  },
};

/**
 * Main Lambda handler
 */
export const handler = async (event: any): Promise<APIGatewayResponse> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Parse event body if it's from API Gateway
    const requestBody: BedrockRequestEvent = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event;

    // Validate required fields
    if (!requestBody.action || !requestBody.prompt || !requestBody.model) {
      return createErrorResponse(400, 'Missing required fields: action, prompt, model');
    }

    // Generate session ID if not provided
    const sessionId = requestBody.sessionId || generateSessionId();

    // Retrieve conversation context if session exists
    const conversationHistory = await getConversationHistory(sessionId);

    // Invoke Bedrock with retry logic
    const response = await invokeBedrockWithRetry(
      requestBody.model,
      requestBody.prompt,
      conversationHistory,
      requestBody.parameters
    );

    // Save conversation to DynamoDB
    await saveConversation(sessionId, requestBody.prompt, response.content, requestBody.model);

    // Return response
    const result: BedrockRequestResponse = {
      content: response.content,
      model: requestBody.model,
      usage: response.usage,
      sessionId,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Error processing request:', error);
    return handleError(error);
  }
};

/**
 * Invoke Bedrock API with retry logic for transient failures
 */
async function invokeBedrockWithRetry(
  model: string,
  prompt: string,
  conversationHistory: ChatMessage[],
  parameters?: BedrockRequestEvent['parameters'],
  retryCount: number = 0
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    return await invokeBedrock(model, prompt, conversationHistory, parameters);
  } catch (error: any) {
    console.error(`Bedrock invocation error (attempt ${retryCount + 1}):`, error);

    // Handle throttling with exponential backoff
    if (error.name === 'ThrottlingException' && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`Throttled. Retrying in ${delay}ms...`);
      await sleep(delay);
      return invokeBedrockWithRetry(model, prompt, conversationHistory, parameters, retryCount + 1);
    }

    // Handle model not ready with delayed retry
    if (error.name === 'ModelNotReadyException' && retryCount < maxRetries) {
      console.log('Model not ready. Retrying in 5 seconds...');
      await sleep(5000);
      return invokeBedrockWithRetry(model, prompt, conversationHistory, parameters, retryCount + 1);
    }

    // Handle validation errors
    if (error.name === 'ValidationException') {
      throw new Error('Invalid request parameters');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Invoke Bedrock Runtime API
 */
async function invokeBedrock(
  model: string,
  prompt: string,
  conversationHistory: ChatMessage[],
  parameters?: BedrockRequestEvent['parameters']
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const modelId = MODEL_IDS[model];
  if (!modelId) {
    throw new Error(`Unsupported model: ${model}`);
  }

  // Get model parameters
  const modelParams = {
    ...(DEFAULT_PARAMETERS[model as keyof typeof DEFAULT_PARAMETERS] || DEFAULT_PARAMETERS['claude-3-sonnet']),
    ...parameters,
  };

  // Build messages array with conversation history
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Prepare request body for Claude 3 models
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: modelParams.maxTokens,
    temperature: modelParams.temperature,
    top_p: modelParams.topP,
    messages,
  };

  const input: InvokeModelCommandInput = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  };

  console.log(`Invoking Bedrock model: ${modelId}`);
  const command = new InvokeModelCommand(input);
  const response = await bedrockClient.send(command);

  // Parse response
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return {
    content: responseBody.content[0].text,
    usage: {
      inputTokens: responseBody.usage.input_tokens,
      outputTokens: responseBody.usage.output_tokens,
    },
  };
}

/**
 * Retrieve conversation history from DynamoDB
 */
async function getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const command = new GetCommand({
      TableName: CHAT_SESSIONS_TABLE,
      Key: { sessionId },
    });

    const result = await dynamoClient.send(command);
    
    if (result.Item) {
      const session = result.Item as ChatSession;
      return session.messages || [];
    }

    return [];
  } catch (error) {
    console.error('Error retrieving conversation history:', error);
    return [];
  }
}

/**
 * Save conversation to DynamoDB
 */
async function saveConversation(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  model: string
): Promise<void> {
  try {
    const timestamp = Date.now();
    
    // Retrieve existing session
    const existingSession = await getSession(sessionId);
    
    // Build messages array
    const messages: ChatMessage[] = existingSession?.messages || [];
    messages.push(
      {
        role: 'user',
        content: userMessage,
        timestamp,
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp,
      }
    );

    // Create session object
    const session: ChatSession = {
      sessionId,
      timestamp,
      userId: existingSession?.userId || 'anonymous',
      messages,
      context: existingSession?.context || {},
      model,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days from now
    };

    const command = new PutCommand({
      TableName: CHAT_SESSIONS_TABLE,
      Item: session,
    });

    await dynamoClient.send(command);
    console.log(`Saved conversation to session: ${sessionId}`);
  } catch (error) {
    console.error('Error saving conversation:', error);
    // Don't throw - conversation saving failure shouldn't fail the request
  }
}

/**
 * Get existing session from DynamoDB
 */
async function getSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const command = new GetCommand({
      TableName: CHAT_SESSIONS_TABLE,
      Key: { sessionId },
    });

    const result = await dynamoClient.send(command);
    return result.Item ? (result.Item as ChatSession) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle errors and return appropriate API Gateway response
 */
function handleError(error: any): APIGatewayResponse {
  console.error('Error details:', error);

  // Bedrock-specific errors
  if (error.name === 'ThrottlingException') {
    return createErrorResponse(429, 'Too many requests. Please try again later.');
  }

  if (error.name === 'ValidationException' || error.message === 'Invalid request parameters') {
    return createErrorResponse(400, 'Invalid request parameters');
  }

  if (error.name === 'ModelNotReadyException') {
    return createErrorResponse(503, 'AI service is temporarily unavailable. Please try again.');
  }

  if (error.name === 'AccessDeniedException') {
    return createErrorResponse(403, 'Access denied to AI service');
  }

  if (error.name === 'ServiceQuotaExceededException') {
    return createErrorResponse(429, 'Service quota exceeded. Please try again later.');
  }

  // Generic error
  return createErrorResponse(500, 'AI service is temporarily unavailable. Please try again.');
}

/**
 * Create error response
 */
function createErrorResponse(statusCode: number, message: string): APIGatewayResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: message,
    }),
  };
}
