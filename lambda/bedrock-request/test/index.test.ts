/**
 * Unit tests for Bedrock Request Lambda Handler
 * 
 * Tests:
 * - Claude 3 Sonnet invocation for chat messages
 * - Error handling for throttling and validation errors
 * - Conversation context persistence
 * - Model parameter configuration
 * 
 * Requirements: 1.4, 1.8, 1.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS clients
const bedrockMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

// Import handler after mocks are set up
const { handler } = await import('../index.js');

describe('Bedrock Request Lambda Handler', () => {
  beforeEach(() => {
    // Reset mocks before each test
    bedrockMock.reset();
    dynamoMock.reset();
    
    // Set environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.CHAT_SESSIONS_TABLE = 'test-chat-sessions';
    
    // Clear console logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Claude 3 Sonnet Invocation', () => {
    it('should invoke Claude 3 Sonnet with correct model ID and parameters', async () => {
      // Mock DynamoDB - no existing session
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      // Mock Bedrock response
      const mockResponse = {
        content: [{ text: 'Hello! How can I help you today?' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Hello',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.content).toBe('Hello! How can I help you today?');
      expect(body.model).toBe('claude-3-sonnet');
      expect(body.usage.inputTokens).toBe(10);
      expect(body.usage.outputTokens).toBe(20);
      expect(body.sessionId).toBeDefined();

      // Verify Bedrock was called with correct model ID
      const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
      expect(bedrockCalls.length).toBe(1);
      expect(bedrockCalls[0].args[0].input.modelId).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    });

    it('should use default Sonnet parameters when not specified', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      await handler(event);

      const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
      const requestBody = JSON.parse(bedrockCalls[0].args[0].input.body);

      expect(requestBody.temperature).toBe(0.7);
      expect(requestBody.max_tokens).toBe(2048);
      expect(requestBody.top_p).toBe(0.9);
    });

    it('should override default parameters with custom values', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
          parameters: {
            temperature: 0.9,
            maxTokens: 1500,
          },
        }),
      };

      await handler(event);

      const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
      const requestBody = JSON.parse(bedrockCalls[0].args[0].input.body);

      expect(requestBody.temperature).toBe(0.9);
      expect(requestBody.max_tokens).toBe(1500);
      expect(requestBody.top_p).toBe(0.9); // Default value
    });
  });

  describe('Claude 3 Haiku Invocation', () => {
    it('should invoke Claude 3 Haiku with correct model ID and parameters', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Quick response' }],
        usage: { input_tokens: 5, output_tokens: 8 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Quick question',
          model: 'claude-3-haiku',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.model).toBe('claude-3-haiku');

      const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
      expect(bedrockCalls[0].args[0].input.modelId).toBe('anthropic.claude-3-haiku-20240307-v1:0');
    });

    it('should use default Haiku parameters', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-haiku',
        }),
      };

      await handler(event);

      const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
      const requestBody = JSON.parse(bedrockCalls[0].args[0].input.body);

      expect(requestBody.temperature).toBe(0.5);
      expect(requestBody.max_tokens).toBe(1024);
      expect(requestBody.top_p).toBe(0.9);
    });
  });

  describe('Conversation Context Persistence', () => {
    it('should include previous messages in Bedrock prompt', async () => {
      const existingSession = {
        sessionId: 'test-session-123',
        timestamp: Date.now(),
        userId: 'user-123',
        messages: [
          { role: 'user', content: 'What is AI?', timestamp: Date.now() - 1000 },
          { role: 'assistant', content: 'AI stands for Artificial Intelligence.', timestamp: Date.now() - 500 },
        ],
        context: {},
        model: 'claude-3-sonnet',
        ttl: Math.floor(Date.now() / 1000) + 7776000,
      };

      dynamoMock.on(GetCommand).resolves({ Item: existingSession });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Machine learning is a subset of AI.' }],
        usage: { input_tokens: 30, output_tokens: 15 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Tell me about machine learning',
          model: 'claude-3-sonnet',
          sessionId: 'test-session-123',
        }),
      };

      await handler(event);

      const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
      const requestBody = JSON.parse(bedrockCalls[0].args[0].input.body);

      // Verify conversation history is included
      expect(requestBody.messages).toHaveLength(3);
      expect(requestBody.messages[0]).toEqual({
        role: 'user',
        content: 'What is AI?',
      });
      expect(requestBody.messages[1]).toEqual({
        role: 'assistant',
        content: 'AI stands for Artificial Intelligence.',
      });
      expect(requestBody.messages[2]).toEqual({
        role: 'user',
        content: 'Tell me about machine learning',
      });
    });

    it('should save conversation to DynamoDB after successful response', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Hello there!' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Hi',
          model: 'claude-3-sonnet',
        }),
      };

      await handler(event);

      const putCalls = dynamoMock.commandCalls(PutCommand);
      expect(putCalls.length).toBe(1);

      const savedItem = putCalls[0].args[0].input.Item;
      expect(savedItem.messages).toHaveLength(2);
      expect(savedItem.messages[0].role).toBe('user');
      expect(savedItem.messages[0].content).toBe('Hi');
      expect(savedItem.messages[1].role).toBe('assistant');
      expect(savedItem.messages[1].content).toBe('Hello there!');
      expect(savedItem.ttl).toBeDefined();
    });

    it('should append messages to existing session', async () => {
      const existingSession = {
        sessionId: 'test-session-456',
        timestamp: Date.now() - 5000,
        userId: 'user-456',
        messages: [
          { role: 'user', content: 'First message', timestamp: Date.now() - 5000 },
          { role: 'assistant', content: 'First response', timestamp: Date.now() - 4000 },
        ],
        context: { topic: 'career' },
        model: 'claude-3-sonnet',
        ttl: Math.floor(Date.now() / 1000) + 7776000,
      };

      dynamoMock.on(GetCommand).resolves({ Item: existingSession });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Second response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Second message',
          model: 'claude-3-sonnet',
          sessionId: 'test-session-456',
        }),
      };

      await handler(event);

      const putCalls = dynamoMock.commandCalls(PutCommand);
      const savedItem = putCalls[0].args[0].input.Item;

      expect(savedItem.messages).toHaveLength(4);
      expect(savedItem.messages[2].content).toBe('Second message');
      expect(savedItem.messages[3].content).toBe('Second response');
      expect(savedItem.context.topic).toBe('career');
    });
  });

  describe('Error Handling', () => {
    it('should handle ThrottlingException with retry and exponential backoff', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const throttleError = new Error('Rate exceeded');
      throttleError.name = 'ThrottlingException';

      const mockResponse = {
        content: [{ text: 'Success after retry' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      // First call throws throttle error, second succeeds
      bedrockMock
        .on(InvokeModelCommand)
        .rejectsOnce(throttleError)
        .resolvesOnce({
          body: new TextEncoder().encode(JSON.stringify(mockResponse)),
        });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.content).toBe('Success after retry');
      expect(bedrockMock.commandCalls(InvokeModelCommand).length).toBe(2);
    });

    it('should return 429 after max retries for ThrottlingException', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const throttleError = new Error('Rate exceeded');
      throttleError.name = 'ThrottlingException';

      bedrockMock.on(InvokeModelCommand).rejects(throttleError);

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(429);
      expect(body.error).toBe('Too many requests. Please try again later.');
      expect(bedrockMock.commandCalls(InvokeModelCommand).length).toBe(4); // Initial + 3 retries
    }, 10000); // 10 second timeout for retry delays

    it('should handle ValidationException with user-friendly error', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const validationError = new Error('Invalid parameters');
      validationError.name = 'ValidationException';

      bedrockMock.on(InvokeModelCommand).rejects(validationError);

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('Invalid request parameters');
      expect(bedrockMock.commandCalls(InvokeModelCommand).length).toBe(1); // No retry
    });

    it('should handle ModelNotReadyException with delayed retry', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const notReadyError = new Error('Model not ready');
      notReadyError.name = 'ModelNotReadyException';

      const mockResponse = {
        content: [{ text: 'Success after model ready' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock
        .on(InvokeModelCommand)
        .rejectsOnce(notReadyError)
        .resolvesOnce({
          body: new TextEncoder().encode(JSON.stringify(mockResponse)),
        });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.content).toBe('Success after model ready');
      expect(bedrockMock.commandCalls(InvokeModelCommand).length).toBe(2);
    }, 10000); // 10 second timeout for retry delay

    it('should return 503 after max retries for ModelNotReadyException', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const notReadyError = new Error('Model not ready');
      notReadyError.name = 'ModelNotReadyException';

      bedrockMock.on(InvokeModelCommand).rejects(notReadyError);

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(503);
      expect(body.error).toBe('AI service is temporarily unavailable. Please try again.');
    }, 25000); // 25 second timeout for multiple 5-second delays

    it('should handle AccessDeniedException', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const accessError = new Error('Access denied');
      accessError.name = 'AccessDeniedException';

      bedrockMock.on(InvokeModelCommand).rejects(accessError);

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(403);
      expect(body.error).toBe('Access denied to AI service');
    });

    it('should handle ServiceQuotaExceededException', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'ServiceQuotaExceededException';

      bedrockMock.on(InvokeModelCommand).rejects(quotaError);

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(429);
      expect(body.error).toBe('Service quota exceeded. Please try again later.');
    });

    it('should return 500 for unknown errors', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });

      const unknownError = new Error('Something went wrong');

      bedrockMock.on(InvokeModelCommand).rejects(unknownError);

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(500);
      expect(body.error).toBe('AI service is temporarily unavailable. Please try again.');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when action is missing', async () => {
      const event = {
        body: JSON.stringify({
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 when prompt is missing', async () => {
      const event = {
        body: JSON.stringify({
          action: 'chat',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 when model is missing', async () => {
      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should generate session ID when not provided', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);
      const body = JSON.parse(response.body);

      expect(body.sessionId).toBeDefined();
      expect(body.sessionId).toMatch(/^session-/);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in successful response', async () => {
      dynamoMock.on(GetCommand).resolves({ Item: undefined });
      dynamoMock.on(PutCommand).resolves({});

      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      };

      bedrockMock.on(InvokeModelCommand).resolves({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      });

      const event = {
        body: JSON.stringify({
          action: 'chat',
          prompt: 'Test',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    it('should include CORS headers in error response', async () => {
      const event = {
        body: JSON.stringify({
          action: 'chat',
          model: 'claude-3-sonnet',
        }),
      };

      const response = await handler(event);

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });
});
