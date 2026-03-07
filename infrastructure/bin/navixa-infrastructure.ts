#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NavixaStack } from '../lib/navixa-stack';

const app = new cdk.App();

// Get environment from context (default to development)
const environment = app.node.tryGetContext('environment') || 'development';

// Load environment-specific configuration
const envConfig = app.node.tryGetContext('environments')?.[environment];

if (!envConfig) {
  throw new Error(`Environment configuration not found for: ${environment}`);
}

// Validate required configuration
if (envConfig.account === 'REPLACE_WITH_YOUR_AWS_ACCOUNT_ID') {
  console.warn('⚠️  WARNING: Please update the AWS account ID in cdk.context.json');
}

// Create the stack with environment-specific configuration
new NavixaStack(app, envConfig.stackName, {
  env: {
    account: envConfig.account,
    region: envConfig.region,
  },
  description: `Navixa AWS GenAI Integration Stack - ${environment}`,
  tags: {
    Environment: environment,
    Project: 'Navixa',
    ManagedBy: 'AWS CDK',
  },
  environmentConfig: envConfig,
});

app.synth();
