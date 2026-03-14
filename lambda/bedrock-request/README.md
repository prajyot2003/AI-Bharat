# Bedrock Request Lambda Function

This Lambda function handles direct Amazon Bedrock API calls for chat and generation features in the Navixa application.

## Features

- **Model Selection**: Supports Claude 3 Sonnet and Claude 3 Haiku models
- **Conversation Context**: Maintains conversation history across multiple messages
- **Error Handling**: Implements retry logic with exponential backoff for transient failures
- **DynamoDB Integration**: Stores and retrieves chat sessions
- **Configurable Parameters**: Supports custom temperature, maxTokens, and topP settings

## Requirements

This Lambda function implements the following requirements:
- 1.1: Use Amazon Bedrock as primary Foundation Model provider
- 1.2: Support Claude 3 Sonnet as primary model
- 1.3: Support Claude 3 Haiku as secondary model
- 1.4: Invoke Amazon Bedrock API for chat messages
- 1.10: Configure Bedrock API calls with appropriate parameters
- 4.2: Lambda function for handling Bedrock API requests

## Event Structure

```typescript
{
  "action": "chat" | "generate",
  "prompt": "User message or generation prompt",
  "model": "claude-3.5-sonnet" | "claude-3.5-haiku",
  "sessionId": "optional-session-id",
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 2048,
    "topP": 0.9
  }
}
```

## Response Structure

```typescript
{
  "content": "AI-generated response",
  "model": "claude-3.5-sonnet",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 300
  },
  "sessionId": "session-123456"
}
```

## Environment Variables

- `AWS_REGION`: AWS region for Bedrock and DynamoDB (default: us-east-1)
- `CHAT_SESSIONS_TABLE`: DynamoDB table name for chat sessions (default: navixa-chat-sessions)

## Error Handling

The function handles the following error scenarios:

- **ThrottlingException**: Retries with exponential backoff (up to 3 attempts)
- **ModelNotReadyException**: Retries after 5-second delay
- **ValidationException**: Returns 400 Bad Request with user-friendly message
- **AccessDeniedException**: Returns 403 Forbidden
- **ServiceQuotaExceededException**: Returns 429 Too Many Requests

All errors are logged to CloudWatch with detailed context for debugging.

## Model Parameters

### Claude 3 Sonnet (Default)
- Temperature: 0.7
- Max Tokens: 2048
- Top P: 0.9

### Claude 3 Haiku (Default)
- Temperature: 0.5
- Max Tokens: 1024
- Top P: 0.9

## Conversation Context

The function maintains conversation history by:
1. Retrieving existing session from DynamoDB
2. Including previous messages in the Bedrock API call
3. Appending new messages to the session
4. Saving updated session back to DynamoDB

Sessions automatically expire after 90 days using DynamoDB TTL.

## Development

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Deploy
This function is deployed as part of the CDK infrastructure stack. See the main infrastructure README for deployment instructions.
