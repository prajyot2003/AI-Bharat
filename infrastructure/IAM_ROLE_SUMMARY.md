# IAM Role Configuration Summary

## Overview
This document summarizes the IAM role configuration for Navixa Lambda functions with Amazon Bedrock permissions.

## Lambda Execution Role

**Role Name:** `navixa-lambda-execution-{environment}`

**Purpose:** Provides Lambda functions with least-privilege access to AWS services including Amazon Bedrock, DynamoDB, S3, CloudWatch Logs, and X-Ray.

## Permissions Granted

### 1. Amazon Bedrock Permissions

#### Model Invocation (bedrock:InvokeModel)
- **Claude 3 Sonnet:** `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Claude 3 Haiku:** `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Titan Embeddings:** `amazon.titan-embed-text-v1`

**Actions:**
- `bedrock:InvokeModel` - Invoke foundation models
- `bedrock:InvokeModelWithResponseStream` - Invoke models with streaming responses

#### Knowledge Base Access (bedrock:Retrieve)
**Actions:**
- `bedrock:Retrieve` - Retrieve documents from knowledge base
- `bedrock:RetrieveAndGenerate` - Retrieve and generate responses using RAG

**Resources:** All knowledge bases in the account

#### AI Agent Access (bedrock:InvokeAgent)
**Actions:**
- `bedrock:InvokeAgent` - Invoke Bedrock agents

**Resources:** All agents and agent aliases in the account

### 2. DynamoDB Permissions

**Tables with Full CRUD Access:**
- `navixa-user-profiles-{environment}`
- `navixa-chat-sessions-{environment}`
- `navixa-learning-paths-{environment}`
- `navixa-rag-cache-{environment}`

**Actions:**
- `dynamodb:GetItem` - Read single items
- `dynamodb:PutItem` - Create/update items
- `dynamodb:UpdateItem` - Update specific attributes
- `dynamodb:DeleteItem` - Delete items
- `dynamodb:Query` - Query with partition/sort keys
- `dynamodb:Scan` - Scan entire table
- `dynamodb:BatchGetItem` - Batch read operations
- `dynamodb:BatchWriteItem` - Batch write operations

**Note:** Includes access to all table indexes

### 3. S3 Permissions

#### Resume Documents Bucket (Read/Write)
**Bucket:** `navixa-resume-documents-{environment}`

**Actions:**
- `s3:GetObject` - Download resume files
- `s3:PutObject` - Upload resume files
- `s3:DeleteObject` - Delete resume files
- `s3:ListBucket` - List bucket contents

#### Career Knowledge Base Bucket (Read-Only)
**Bucket:** `navixa-knowledge-base-{environment}`

**Actions:**
- `s3:GetObject` - Read knowledge base documents
- `s3:ListBucket` - List bucket contents

**Note:** Write access restricted to prevent accidental modification of knowledge base

### 4. CloudWatch Logs Permissions

**Actions:**
- `logs:CreateLogGroup` - Create log groups
- `logs:CreateLogStream` - Create log streams
- `logs:PutLogEvents` - Write log events
- `logs:DescribeLogStreams` - Describe log streams

**Resources:** All Lambda function log groups matching `/aws/lambda/navixa-*`

### 5. AWS X-Ray Permissions (Conditional)

**Enabled when:** `enableXRayTracing` is true in environment config

**Actions:**
- `xray:PutTraceSegments` - Send trace data
- `xray:PutTelemetryRecords` - Send telemetry data

**Resources:** All resources (required for X-Ray)

## Managed Policies

**AWS Managed Policy:**
- `AWSLambdaBasicExecutionRole` - Basic Lambda execution permissions for CloudWatch Logs

## Security Best Practices

### Least-Privilege Access
- Permissions scoped to specific resources where possible
- Read-only access to knowledge base bucket
- DynamoDB access limited to specific tables
- Bedrock access limited to specific models

### Resource Tagging
All IAM resources are tagged with:
- `Project: Navixa`
- `Component: Lambda`
- `ManagedBy: CDK`

### Encryption
- All data at rest encrypted (DynamoDB, S3)
- All data in transit uses TLS 1.2+
- CloudWatch Logs encrypted by default

## Usage in Lambda Functions

Lambda functions can reference this role during creation:

```typescript
const lambdaFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  role: stack.lambdaExecutionRole, // Use the pre-configured role
});
```

## CloudFormation Outputs

The role ARN is exported as a CloudFormation output:

**Output Name:** `LambdaExecutionRoleArn`
**Export Name:** `{StackName}-LambdaExecutionRole`

## Requirements Validation

This IAM role configuration satisfies the following requirements:

- **Requirement 8.7:** Configure Amazon Bedrock permissions for Lambda execution roles ✓
- **Requirement 12.1:** Implement IAM roles with least-privilege permissions ✓

## Next Steps

1. Lambda functions will be created in subsequent tasks (Tasks 2.x, 3.x, 4.x, 5.x, 6.x)
2. Each Lambda function will use this execution role
3. Additional permissions can be added as needed for specific Lambda functions
4. Consider creating separate roles for different Lambda function types if more granular control is needed

## Verification

The IAM role has been verified through:
1. TypeScript compilation (no errors)
2. CDK synthesis (successful CloudFormation template generation)
3. Policy validation (all required permissions included)

To view the generated CloudFormation template:
```bash
cd infrastructure
npm run cdk synth
```
