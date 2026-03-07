# AWS Configuration Guide

This guide helps you configure the Navixa AWS infrastructure for deployment.

## Step 1: AWS Account Setup

### Get Your AWS Account ID

1. Log in to the AWS Console: https://console.aws.amazon.com/
2. Click on your account name in the top-right corner
3. Your 12-digit Account ID is displayed in the dropdown
4. Copy this Account ID

### Configure AWS CLI

If you haven't already, configure the AWS CLI with your credentials:

```bash
aws configure
```

You'll need:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

To verify your configuration:
```bash
aws sts get-caller-identity
```

## Step 2: Update CDK Context

Edit `infrastructure/cdk.context.json` and replace the placeholder account IDs:

```json
{
  "environments": {
    "development": {
      "account": "123456789012",  // Replace with your AWS Account ID
      "region": "us-east-1",       // Change if needed
      ...
    },
    "production": {
      "account": "123456789012",  // Replace with your AWS Account ID
      "region": "us-east-1",       // Change if needed
      ...
    }
  }
}
```

## Step 3: Bootstrap CDK

Bootstrap CDK in your AWS account (only needed once per account/region):

```bash
cd infrastructure
cdk bootstrap aws://YOUR-ACCOUNT-ID/us-east-1
```

Replace `YOUR-ACCOUNT-ID` with your actual AWS Account ID.

## Step 4: Verify Configuration

Test that everything is configured correctly:

```bash
npm run synth
```

You should see CloudFormation template output without errors.

## Environment-Specific Settings

### Development Environment

Optimized for testing and development:
- Lower API throttle limits (100 req/s)
- Smaller Lambda memory (512 MB)
- Shorter log retention (7 days)
- Lower costs

### Production Environment

Optimized for production workloads:
- Higher API throttle limits (1000 req/s)
- Larger Lambda memory (1024 MB)
- Longer log retention (30 days)
- Better performance

## Region Selection

### Recommended Regions for Amazon Bedrock

Amazon Bedrock is available in specific regions. Recommended regions:

- **us-east-1** (N. Virginia) - Most models available
- **us-west-2** (Oregon) - Good alternative
- **eu-central-1** (Frankfurt) - For EU deployments
- **ap-southeast-1** (Singapore) - For APAC deployments

Check current Bedrock availability: https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html#bedrock-regions

## IAM Permissions Required

Your AWS user/role needs these permissions for CDK deployment:

- CloudFormation (full access)
- IAM (create/update roles and policies)
- Lambda (create/update functions)
- API Gateway (create/update APIs)
- DynamoDB (create/update tables)
- S3 (create/update buckets)
- CloudWatch (create/update logs and metrics)
- Bedrock (invoke models and manage knowledge bases)

For development, you can use the `AdministratorAccess` policy, but for production, use least-privilege policies.

## Cost Estimation

### Development Environment (estimated monthly costs)

- Lambda: ~$5-10 (with free tier)
- API Gateway: ~$3-5
- DynamoDB: ~$1-5 (on-demand)
- S3: ~$1-3
- Bedrock: Variable based on usage (~$10-50)
- CloudWatch: ~$1-2

**Total: ~$20-75/month** (excluding Bedrock usage)

### Production Environment

Costs scale with usage. Monitor with AWS Cost Explorer.

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use IAM roles** instead of access keys when possible
3. **Enable MFA** on your AWS account
4. **Review IAM policies** regularly
5. **Enable CloudTrail** for audit logging
6. **Use AWS Secrets Manager** for sensitive data

## Troubleshooting

### "Unable to resolve AWS account"
- Run `aws configure` to set up credentials
- Verify with `aws sts get-caller-identity`

### "Need to perform AWS calls for account"
- Run `cdk bootstrap` for your account/region

### "Access Denied" errors
- Check IAM permissions
- Ensure your user/role has necessary permissions

### "Region not supported"
- Verify Bedrock is available in your selected region
- Change region in `cdk.context.json` if needed

## Next Steps

After configuration:

1. Deploy to development:
   ```bash
   npm run deploy:dev
   ```

2. Verify deployment in AWS Console

3. Note the output values (API Gateway URL, etc.)

4. Update frontend environment variables with AWS endpoints

## Support Resources

- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
- AWS Bedrock Documentation: https://docs.aws.amazon.com/bedrock/
- AWS CLI Documentation: https://docs.aws.amazon.com/cli/
- AWS Free Tier: https://aws.amazon.com/free/
