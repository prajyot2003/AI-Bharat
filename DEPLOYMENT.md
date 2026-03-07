# Navixa AWS Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| AWS CLI | ≥ 2.x | `brew install awscli` |
| AWS CDK | ≥ 2.x | `npm install -g aws-cdk` |
| AWS Account | – | Bedrock Claude 3 access required |

## Quick Start

```bash
# 1. Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)

# 2. Bootstrap CDK for your account/region (one-time)
cd infrastructure
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 3. Install dependencies
npm install

# 4. Deploy to development
npm run deploy:dev

# OR deploy to production
npm run deploy:prod
```

## Environment Configuration

### Development (`cdk.context.json`)
```json
{
  "dev": {
    "account": "YOUR_ACCOUNT_ID",
    "region": "us-east-1",
    "stackName": "NavixaDev",
    "bedrockRegion": "us-east-1",
    "apiThrottleRate": 10,
    "apiThrottleBurst": 20,
    "lambdaMemorySize": 512,
    "enableXRayTracing": false,
    "logRetentionDays": 7
  }
}
```

### Production (`cdk.context.json`)
```json
{
  "prod": {
    "account": "YOUR_ACCOUNT_ID",
    "region": "us-east-1",
    "stackName": "NavixaProd",
    "bedrockRegion": "us-east-1",
    "apiThrottleRate": 100,
    "apiThrottleBurst": 200,
    "lambdaMemorySize": 1024,
    "enableXRayTracing": true,
    "logRetentionDays": 30,
    "alertEmail": "oncall@yourcompany.com"
  }
}
```

## After Deployment – Frontend Setup

After `cdk deploy`, retrieve your API Gateway URL and API Key:

```bash
# Get the API Gateway URL (also shown in CDK output)
aws cloudformation describe-stacks --stack-name NavixaDev \
  --query "Stacks[0].Outputs[?OutputKey=='RestApiUrl'].OutputValue" --output text

# Get the API Key value
API_KEY_ID=$(aws cloudformation describe-stacks --stack-name NavixaDev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiKeyId'].OutputValue" --output text)
aws apigateway get-api-key --api-key $API_KEY_ID --include-value \
  --query "value" --output text
```

Then configure your **`.env.local`** in the Next.js project root:

```bash
NEXT_PUBLIC_USE_BEDROCK=true
NEXT_PUBLIC_API_GATEWAY_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/v1
NEXT_PUBLIC_API_KEY=<api-key-value>
```

Run the Next.js app:
```bash
npm run dev
```

## Bedrock Model Access

You must request access to these models in the AWS Console → Bedrock → Model Access:
- `anthropic.claude-3-haiku-20240307-v1:0` (for chat and RAG)
- `anthropic.claude-3-sonnet-20240229-v1:0` (for learning paths and complex queries)

## Deploy Commands

```bash
cd infrastructure

# Synthesize CloudFormation template (dry run, no deployment)
npm run cdk synth

# Deploy development stack
npm run deploy:dev

# Deploy production stack
npm run deploy:prod

# View differences before deploying
npx cdk diff --context environment=dev

# Destroy development stack (irreversible for RETAIN resources)
npx cdk destroy NavixaDev
```

## Architecture

```
Frontend (Next.js)
        │ x-api-key header
        ▼
API Gateway (REST) ── Request Validation ── Usage Plan (10k req/day)
        │
        ├── POST /api/v1/chat/message ──────► bedrock-request Lambda
        ├── POST /api/v1/rag/query ─────────► rag-query Lambda
        ├── POST /api/v1/agent/recommend ───► ai-agent Lambda
        ├── POST /api/v1/resume/upload ─────► resume-processing Lambda
        ├── POST /api/v1/jobs/search ───────► job-data Lambda
        └── POST /api/v1/learning/generate-path ► learning-path Lambda
                        │
                        ├── Amazon Bedrock (Claude 3 Haiku / Sonnet)
                        ├── DynamoDB (sessions, profiles, learning paths, cache)
                        └── S3 (resume documents, knowledge base)
```

## Rollback

```bash
# Roll back to previous CDK stack version
aws cloudformation continue-update-rollback --stack-name NavixaDev

# Or destroy and redeploy
npx cdk destroy NavixaDev
npm run deploy:dev
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `AccessDeniedException` | Bedrock model access not granted | Enable models in AWS Console → Bedrock → Model Access |
| `401 Unauthorized` | Missing or wrong API key | Check `NEXT_PUBLIC_API_KEY` env var |
| `429 Too Many Requests` | Rate limit exceeded | Reduce request rate or increase usage plan quota |
| `Lambda timeout` | Bedrock response too slow | Increase Lambda timeout in CDK config |
| `CDK bootstrap required` | First-time CDK deploy | Run `npx cdk bootstrap` |
