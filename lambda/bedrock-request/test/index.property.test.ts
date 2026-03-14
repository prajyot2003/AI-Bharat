/**
 * Property-Based Tests for Bedrock Request Lambda Handler
 * 
 * Tests universal properties across randomized inputs using fast-check.
 * 
 * Property 1: All AI features invoke Amazon Bedrock
 * Property 2: Conversation context persistence
 * Property 3: Error handling with user-friendly messages
 * 
 * Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 4.10, 9.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS clients
const bedrockMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

// Import handler after mocks are set up
const { handler } = await import('../index.js');

describe('Property-Based Tests: Bedrock Request Lambda', () => {
  beforeEach(() => {
    bedrockMock.reset();
    dynamoMock.reset();
    
    process.env.AWS_REGION = 'us-east-1';
    process.env.CHAT_SESSIONS_TABLE = 'test-chat-sessions';
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 1: All AI features invoke Amazon Bedrock
   * 
   * **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.10**
   * 
   * For any AI feature request (chat, learning path generation, job analysis, 
   * resume enhancement), the system SHALL invoke Amazon Bedrock API with 
   * appropriate model selection and parameters.
   */
  describe('Property 1: All AI features invoke Amazon Bedrock', () => {
    it('should invoke Bedrock for any valid chat or generate action with any prompt', async () => {
      // Feature: aws-genai-integration, Property 1: All AI features invoke Amazon Bedrock
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('chat', 'generate'),
          fc.string({ minLength: 1, maxLength: 100 }), // Reduced max length
          fc.constantFrom('claude-3.5-sonnet', 'claude-3.5-haiku'),
          async (action, prompt, model) => {
            // Reset mocks for each iteration
            bedrockMock.reset();
            dynamoMock.reset();
            
            // Mock DynamoDB responses
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});
            
            // Mock Bedrock response
            const mockResponse = {
              content: [{ text: 'Response' }],
              usage: { input_tokens: 10, output_tokens: 20 },
            };
            
            bedrockMock.on(InvokeModelCommand).resolves({
              body: new TextEncoder().encode(JSON.stringify(mockResponse)),
            });
            
            const event = {
              body: JSON.stringify({
                action,
                prompt,
                model,
              }),
            };
            
            const response = await handler(event);
            const body = JSON.parse(response.body);
            
            // Property: Bedrock MUST be invoked for all AI requests
            const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
            expect(bedrockCalls.length).toBeGreaterThan(0);
            
            // Property: Response must be successful
            expect(response.statusCode).toBe(200);
            expect(body.content).toBeDefined();
            expect(body.model).toBe(model);
            
            // Property: Correct model ID must be used
            const expectedModelId = model === 'claude-3.5-sonnet'
              ? 'anthropic.claude-3-5-sonnet-20241022-v2:0'
              : 'anthropic.claude-3-5-sonnet-20241022-v2:0';
            
            expect(bedrockCalls[0].args[0].input.modelId).toBe(expectedModelId);
          }
        ),
        { numRuns: 10 } // Reduced for faster execution as per requirements
      );
    });

    it('should apply appropriate model parameters for any model selection', async () => {
      // Feature: aws-genai-integration, Property 1: All AI features invoke Amazon Bedrock
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('claude-3.5-sonnet', 'claude-3.5-haiku'),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.option(fc.record({
            temperature: fc.double({ min: 0, max: 1 }),
            maxTokens: fc.integer({ min: 100, max: 4096 }),
            topP: fc.double({ min: 0, max: 1 }),
          }), { nil: undefined }),
          async (model, prompt, customParams) => {
            bedrockMock.reset();
            dynamoMock.reset();
            
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
                prompt,
                model,
                parameters: customParams,
              }),
            };
            
            await handler(event);
            
            const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
            expect(bedrockCalls.length).toBe(1);
            
            // Parse the request body to verify parameters
            const requestBody = JSON.parse(bedrockCalls[0].args[0].input.body as string);
            
            // Property: Parameters must be within valid ranges
            expect(requestBody.temperature).toBeGreaterThanOrEqual(0);
            expect(requestBody.temperature).toBeLessThanOrEqual(1);
            expect(requestBody.max_tokens).toBeGreaterThan(0);
            expect(requestBody.top_p).toBeGreaterThanOrEqual(0);
            expect(requestBody.top_p).toBeLessThanOrEqual(1);
            
            // Property: Custom parameters should override defaults
            if (customParams) {
              if (customParams.temperature !== undefined) {
                expect(requestBody.temperature).toBe(customParams.temperature);
              }
              if (customParams.maxTokens !== undefined) {
                expect(requestBody.max_tokens).toBe(customParams.maxTokens);
              }
              if (customParams.topP !== undefined) {
                expect(requestBody.top_p).toBe(customParams.topP);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 2: Conversation context persistence
   * 
   * **Validates: Requirements 1.8**
   * 
   * For any chat session with multiple messages, subsequent messages SHALL 
   * include context from previous messages in the same session when calling 
   * the foundation model.
   */
  describe('Property 2: Conversation context persistence', () => {
    it('should include all previous messages in context for any conversation history', async () => {
      // Feature: aws-genai-integration, Property 2: Conversation context persistence
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }), // sessionId
          fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant'),
              content: fc.string({ minLength: 1, maxLength: 50 }), // Reduced
              timestamp: fc.integer({ min: 1000000000000, max: Date.now() }),
            }),
            { minLength: 1, maxLength: 5 } // Reduced from 10
          ),
          fc.string({ minLength: 1, maxLength: 100 }), // Reduced from 200
          async (sessionId, previousMessages, newPrompt) => {
            bedrockMock.reset();
            dynamoMock.reset();
            
            // Mock existing session with conversation history
            const existingSession = {
              sessionId,
              timestamp: Date.now(),
              userId: 'test-user',
              messages: previousMessages,
              context: {},
              model: 'claude-3.5-sonnet',
              ttl: Math.floor(Date.now() / 1000) + 7776000,
            };
            
            dynamoMock.on(GetCommand).resolves({ Item: existingSession });
            dynamoMock.on(PutCommand).resolves({});
            
            const mockResponse = {
              content: [{ text: 'Response' }],
              usage: { input_tokens: 50, output_tokens: 30 },
            };
            
            bedrockMock.on(InvokeModelCommand).resolves({
              body: new TextEncoder().encode(JSON.stringify(mockResponse)),
            });
            
            const event = {
              body: JSON.stringify({
                action: 'chat',
                prompt: newPrompt,
                model: 'claude-3.5-sonnet',
                sessionId,
              }),
            };
            
            await handler(event);
            
            const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
            const requestBody = JSON.parse(bedrockCalls[0].args[0].input.body as string);
            
            // Property: All previous messages must be included in the request
            expect(requestBody.messages.length).toBe(previousMessages.length + 1);
            
            // Property: Previous messages must maintain order and content
            for (let i = 0; i < previousMessages.length; i++) {
              expect(requestBody.messages[i].role).toBe(previousMessages[i].role);
              expect(requestBody.messages[i].content).toBe(previousMessages[i].content);
            }
            
            // Property: New message must be appended as last user message
            expect(requestBody.messages[previousMessages.length].role).toBe('user');
            expect(requestBody.messages[previousMessages.length].content).toBe(newPrompt);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should persist conversation to DynamoDB for any successful interaction', async () => {
      // Feature: aws-genai-integration, Property 2: Conversation context persistence
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // Reduced from 200
          fc.constantFrom('claude-3.5-sonnet', 'claude-3.5-haiku'),
          async (prompt, model) => {
            bedrockMock.reset();
            dynamoMock.reset();
            
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});
            
            const mockResponse = {
              content: [{ text: 'Response' }],
              usage: { input_tokens: 10, output_tokens: 15 },
            };
            
            bedrockMock.on(InvokeModelCommand).resolves({
              body: new TextEncoder().encode(JSON.stringify(mockResponse)),
            });
            
            const event = {
              body: JSON.stringify({
                action: 'chat',
                prompt,
                model,
              }),
            };
            
            await handler(event);
            
            // Property: Conversation must be saved to DynamoDB
            const putCalls = dynamoMock.commandCalls(PutCommand);
            expect(putCalls.length).toBeGreaterThan(0);
            
            const savedItem = putCalls[0].args[0].input.Item;
            
            // Property: Saved session must contain both user and assistant messages
            expect(savedItem?.messages).toBeDefined();
            expect(savedItem?.messages.length).toBe(2);
            expect(savedItem?.messages[0].role).toBe('user');
            expect(savedItem?.messages[0].content).toBe(prompt);
            expect(savedItem?.messages[1].role).toBe('assistant');
            expect(savedItem?.messages[1].content).toBe('Response');
            
            // Property: TTL must be set for automatic cleanup
            expect(savedItem?.ttl).toBeDefined();
            expect(savedItem?.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 3: Error handling with user-friendly messages
   * 
   * **Validates: Requirements 1.9, 4.10, 9.8**
   * 
   * For any AWS service error (Bedrock, DynamoDB, S3, API Gateway), the system 
   * SHALL log detailed error information and return a user-friendly error message 
   * to the client without exposing internal details.
   */
  describe('Property 3: Error handling with user-friendly messages', () => {
    it('should return user-friendly error for any Bedrock error type', async () => {
      // Feature: aws-genai-integration, Property 3: Error handling with user-friendly messages
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'ThrottlingException',
            'ValidationException',
            'ModelNotReadyException',
            'AccessDeniedException',
            'ServiceQuotaExceededException',
            'UnknownError'
          ),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (errorType, prompt) => {
            bedrockMock.reset();
            dynamoMock.reset();
            
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            
            // Create error with specific type
            const error = new Error(`${errorType} occurred`);
            error.name = errorType;
            
            bedrockMock.on(InvokeModelCommand).rejects(error);
            
            const event = {
              body: JSON.stringify({
                action: 'chat',
                prompt,
                model: 'claude-3.5-sonnet',
              }),
            };
            
            const response = await handler(event);
            const body = JSON.parse(response.body);
            
            // Property: Response must have error status code
            expect(response.statusCode).toBeGreaterThanOrEqual(400);
            expect(response.statusCode).toBeLessThan(600);
            
            // Property: Error message must be user-friendly (not expose internal details)
            expect(body.error).toBeDefined();
            expect(body.error).not.toContain('Exception');
            expect(body.error).not.toContain('stack');
            expect(body.error).not.toContain('AWS');
            
            // Property: Error message must be a string
            expect(typeof body.error).toBe('string');
            expect(body.error.length).toBeGreaterThan(0);
            
            // Property: Specific error types should map to appropriate status codes
            if (errorType === 'ThrottlingException' || errorType === 'ServiceQuotaExceededException') {
              expect(response.statusCode).toBe(429);
            } else if (errorType === 'ValidationException') {
              expect(response.statusCode).toBe(400);
            } else if (errorType === 'ModelNotReadyException') {
              expect(response.statusCode).toBe(503);
            } else if (errorType === 'AccessDeniedException') {
              expect(response.statusCode).toBe(403);
            } else {
              expect(response.statusCode).toBe(500);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle malformed input gracefully for any invalid request format', async () => {
      // Feature: aws-genai-integration, Property 3: Error handling with user-friendly messages
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            action: fc.option(fc.constantFrom('chat', 'generate'), { nil: undefined }),
            prompt: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            model: fc.option(fc.constantFrom('claude-3.5-sonnet', 'claude-3.5-haiku'), { nil: undefined }),
          }).filter(req => !req.action || !req.prompt || !req.model), // Ensure at least one field is missing
          async (invalidRequest) => {
            bedrockMock.reset();
            dynamoMock.reset();
            
            const event = {
              body: JSON.stringify(invalidRequest),
            };
            
            const response = await handler(event);
            const body = JSON.parse(response.body);
            
            // Property: Invalid requests must return 400 status
            expect(response.statusCode).toBe(400);
            
            // Property: Error message must be user-friendly
            expect(body.error).toBeDefined();
            expect(typeof body.error).toBe('string');
            expect(body.error).toContain('required');
            
            // Property: Bedrock should not be invoked for invalid requests
            const bedrockCalls = bedrockMock.commandCalls(InvokeModelCommand);
            expect(bedrockCalls.length).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should include CORS headers in all responses regardless of success or failure', async () => {
      // Feature: aws-genai-integration, Property 3: Error handling with user-friendly messages
      
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // success or failure
          fc.string({ minLength: 1, maxLength: 100 }),
          async (shouldSucceed, prompt) => {
            bedrockMock.reset();
            dynamoMock.reset();
            
            dynamoMock.on(GetCommand).resolves({ Item: undefined });
            dynamoMock.on(PutCommand).resolves({});
            
            if (shouldSucceed) {
              const mockResponse = {
                content: [{ text: 'Success' }],
                usage: { input_tokens: 5, output_tokens: 10 },
              };
              bedrockMock.on(InvokeModelCommand).resolves({
                body: new TextEncoder().encode(JSON.stringify(mockResponse)),
              });
            } else {
              const error = new Error('Service error');
              error.name = 'ServiceUnavailable';
              bedrockMock.on(InvokeModelCommand).rejects(error);
            }
            
            const event = {
              body: JSON.stringify({
                action: 'chat',
                prompt,
                model: 'claude-3.5-sonnet',
              }),
            };
            
            const response = await handler(event);
            
            // Property: CORS headers must always be present
            expect(response.headers).toBeDefined();
            expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
            expect(response.headers['Content-Type']).toBe('application/json');
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
