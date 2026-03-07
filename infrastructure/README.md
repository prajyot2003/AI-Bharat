# Navixa AWS Infrastructure

This directory contains the AWS CDK infrastructure code for the Navixa career guidance application's AWS GenAI integration.

## Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Setup

1. Install dependencies:
   ```bash
   cd infrastructure
   npm install
   ```

2. Configure your AWS account and region:
   - Edit `cdk.context.json`
   - Replace `REPLACE_WITH_YOUR_AWS_ACCOUNT_ID` with your AWS account ID
   - Adjust region settings if needed

3. Bootstrap CDK (first time only):
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

## Configuration

The infrastructure supports two environments:

- **Development**: Lower resource limits, shorter log retention, optimized for testing
- **Production**: Higher resource limits, longer log retention, optimized for performance

Environment-specific configuration is defined in `cdk.context.json`.

## Deployment

### Development Environment
```bash
npm run deploy:dev
```

### Production Environment
```bash
npm run deploy:prod
```

### Custom Deployment
```bash
npm run cdk deploy -- --context environment=development
```

## Available Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run cdk synth` - Synthesize CloudFormation template
- `npm run cdk diff` - Compare deployed stack with current state
- `npm run deploy:dev` - Deploy to development environment
- `npm run deploy:prod` - Deploy to production environment
- `npm run destroy` - Destroy the stack (use with caution)

## Project Structure

```
infrastructure/
├── bin/
│   └── navixa-infrastructure.ts    # CDK app entry point
├── lib/
│   └── navixa-stack.ts             # Main stack definition
├── cdk.json                         # CDK configuration
├── cdk.context.json                 # Environment-specific settings
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

## AWS Resources

This infrastructure will create the following AWS resources:

- **Lambda Functions**: Serverless compute for backend logic
- **API Gateway**: REST API endpoints for frontend integration
- **DynamoDB Tables**: NoSQL database for application data
- **S3 Buckets**: Object storage for resumes and knowledge base
- **Amazon Bedrock**: Foundation model access for AI features
- **CloudWatch**: Logging and monitoring
- **IAM Roles**: Least-privilege access policies

## Security

- All resources follow AWS security best practices
- IAM roles use least-privilege permissions
- Data encryption at rest and in transit
- API Gateway authentication with API keys
- CloudWatch logging for audit trails

## Cost Optimization

- DynamoDB on-demand billing mode
- Lambda memory allocation based on usage
- S3 lifecycle policies for cost reduction
- API Gateway caching enabled
- CloudWatch log retention policies

## Troubleshooting

### CDK Bootstrap Error
If you encounter bootstrap errors, ensure you have:
1. AWS credentials configured (`aws configure`)
2. Sufficient IAM permissions
3. Run `cdk bootstrap` for your account/region

### Deployment Failures
Check CloudFormation console for detailed error messages:
```bash
aws cloudformation describe-stack-events --stack-name NavixaStack-Dev
```

### Resource Limits
If you hit AWS service quotas, request limit increases through AWS Support.

## Next Steps

After infrastructure setup:
1. Implement Lambda functions (Task 2.x)
2. Configure API Gateway (Task 3.x)
3. Set up DynamoDB tables (Task 4.x)
4. Configure S3 buckets (Task 5.x)
5. Integrate Amazon Bedrock (Task 6.x)

## Support

For issues or questions:
- Check AWS CDK documentation: https://docs.aws.amazon.com/cdk/
- Review CloudFormation events in AWS Console
- Check CloudWatch logs for runtime errors
