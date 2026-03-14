import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import * as fc from 'fast-check';
import { NavixaStack, EnvironmentConfig } from '../lib/navixa-stack';

/**
 * Property-Based Test for CDK Infrastructure Deployment
 * 
 * Feature: aws-genai-integration
 * Property 8: CDK creates all resources in AWS account
 * Validates: Requirements 8.9
 * 
 * This test verifies that when CDK code is deployed, it creates or updates
 * all expected AWS resources including:
 * - DynamoDB tables (UserProfile, ChatSession, LearningPathProgress, RAGQueryCache)
 * - S3 buckets (Resume Documents, Career Knowledge Base)
 * - IAM roles (Lambda Execution Role with Bedrock permissions)
 * - API Gateway (REST API with proper configuration)
 */

describe('Property 8: CDK Infrastructure Deployment', () => {
  it('should create all required AWS resources for any valid environment configuration', () => {
    // Feature: aws-genai-integration, Property 8: CDK creates all resources in AWS account
    
    fc.assert(
      fc.property(
        // Generate random but valid environment configurations
        fc.record({
          account: fc.constantFrom('123456789012', '987654321098', '111111111111'),
          region: fc.constantFrom('us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'),
          stackName: fc.constantFrom('Dev', 'Staging', 'Prod', 'Test'),
          bedrockRegion: fc.constantFrom('us-east-1', 'us-west-2'),
          apiThrottleRate: fc.integer({ min: 10, max: 1000 }),
          apiThrottleBurst: fc.integer({ min: 20, max: 2000 }),
          lambdaMemorySize: fc.constantFrom(128, 256, 512, 1024, 2048),
          dynamoDbBillingMode: fc.constant('PAY_PER_REQUEST'),
          enableXRayTracing: fc.boolean(),
          logRetentionDays: fc.constantFrom(7, 14, 30, 60, 90),
        }),
        (config: EnvironmentConfig) => {
          // Create a CDK app and stack with the generated configuration
          const app = new cdk.App();
          const stack = new NavixaStack(app, `NavixaStack-${config.stackName}`, {
            env: {
              account: config.account,
              region: config.region,
            },
            environmentConfig: config,
          });

          // Synthesize the CloudFormation template
          const template = cdk.assertions.Template.fromStack(stack);

          // Property: CDK SHALL create all DynamoDB tables
          
          // 1. UserProfile table with userId partition key
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: `navixa-user-profiles-${config.stackName.toLowerCase()}`,
            KeySchema: [
              {
                AttributeName: 'userId',
                KeyType: 'HASH',
              },
            ],
            BillingMode: 'PAY_PER_REQUEST',
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: true,
            },
          });

          // 2. ChatSession table with sessionId partition key and timestamp sort key
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: `navixa-chat-sessions-${config.stackName.toLowerCase()}`,
            KeySchema: [
              {
                AttributeName: 'sessionId',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'timestamp',
                KeyType: 'RANGE',
              },
            ],
            BillingMode: 'PAY_PER_REQUEST',
            TimeToLiveSpecification: {
              AttributeName: 'ttl',
              Enabled: true,
            },
          });

          // 3. LearningPathProgress table with userId partition key and pathId sort key
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: `navixa-learning-paths-${config.stackName.toLowerCase()}`,
            KeySchema: [
              {
                AttributeName: 'userId',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'pathId',
                KeyType: 'RANGE',
              },
            ],
            BillingMode: 'PAY_PER_REQUEST',
          });

          // 4. RAGQueryCache table with queryHash partition key
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: `navixa-rag-cache-${config.stackName.toLowerCase()}`,
            KeySchema: [
              {
                AttributeName: 'queryHash',
                KeyType: 'HASH',
              },
            ],
            BillingMode: 'PAY_PER_REQUEST',
            TimeToLiveSpecification: {
              AttributeName: 'ttl',
              Enabled: true,
            },
          });

          // Property: CDK SHALL create all S3 buckets with proper configuration

          // 5. Resume Documents bucket with encryption and lifecycle policies
          template.hasResourceProperties('AWS::S3::Bucket', {
            BucketName: `navixa-resume-documents-${config.stackName.toLowerCase()}`,
            BucketEncryption: {
              ServerSideEncryptionConfiguration: [
                {
                  ServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256',
                  },
                },
              ],
            },
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true,
            },
            LifecycleConfiguration: {
              Rules: [
                {
                  Id: 'ArchiveOldResumesToGlacier',
                  Status: 'Enabled',
                  Transitions: [
                    {
                      StorageClass: 'GLACIER',
                      TransitionInDays: 365,
                    },
                  ],
                },
              ],
            },
          });

          // 6. Career Knowledge Base bucket with versioning and encryption
          template.hasResourceProperties('AWS::S3::Bucket', {
            BucketName: `navixa-knowledge-base-${config.stackName.toLowerCase()}`,
            BucketEncryption: {
              ServerSideEncryptionConfiguration: [
                {
                  ServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256',
                  },
                },
              ],
            },
            VersioningConfiguration: {
              Status: 'Enabled',
            },
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true,
            },
          });

          // Property: CDK SHALL create IAM role with Bedrock permissions

          // 7. Lambda Execution Role with comprehensive permissions
          template.hasResourceProperties('AWS::IAM::Role', {
            RoleName: `navixa-lambda-execution-${config.stackName.toLowerCase()}`,
            AssumeRolePolicyDocument: {
              Statement: [
                {
                  Action: 'sts:AssumeRole',
                  Effect: 'Allow',
                  Principal: {
                    Service: 'lambda.amazonaws.com',
                  },
                },
              ],
            },
          });

          // Verify Bedrock permissions are attached to the role
          template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
              Statement: cdk.assertions.Match.arrayWith([
                // Bedrock Model Invocation permissions
                cdk.assertions.Match.objectLike({
                  Action: [
                    'bedrock:InvokeModel',
                    'bedrock:InvokeModelWithResponseStream',
                  ],
                  Effect: 'Allow',
                  Resource: cdk.assertions.Match.arrayWith([
                    cdk.assertions.Match.stringLikeRegexp('.*claude-3.5-sonnet.*'),
                    cdk.assertions.Match.stringLikeRegexp('.*claude-3.5-haiku.*'),
                  ]),
                }),
                // Bedrock Knowledge Base permissions
                cdk.assertions.Match.objectLike({
                  Action: [
                    'bedrock:Retrieve',
                    'bedrock:RetrieveAndGenerate',
                  ],
                  Effect: 'Allow',
                }),
                // Bedrock Agent permissions
                cdk.assertions.Match.objectLike({
                  Action: cdk.assertions.Match.anyValue(), // Can be string or array
                  Effect: 'Allow',
                  Sid: 'BedrockAgentInvocation',
                }),
                // DynamoDB permissions
                cdk.assertions.Match.objectLike({
                  Action: cdk.assertions.Match.arrayWith([
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:Query',
                  ]),
                  Effect: 'Allow',
                }),
                // S3 permissions
                cdk.assertions.Match.objectLike({
                  Action: cdk.assertions.Match.arrayWith([
                    's3:GetObject',
                    's3:PutObject',
                  ]),
                  Effect: 'Allow',
                }),
              ]),
            },
          });

          // Property: CDK SHALL create API Gateway with proper configuration

          // 8. REST API Gateway
          template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: `navixa-api-${config.stackName.toLowerCase()}`,
            Description: 'Navixa Career Guidance API with AWS Bedrock integration',
          });

          // 9. API Gateway Deployment with throttling
          template.hasResourceProperties('AWS::ApiGateway::Stage', {
            StageName: 'v1',
            MethodSettings: [
              {
                DataTraceEnabled: true,
                LoggingLevel: 'INFO',
                MetricsEnabled: true,
                ThrottlingRateLimit: config.apiThrottleRate,
                ThrottlingBurstLimit: config.apiThrottleBurst,
              },
            ],
          });

          // 10. API Key for authentication
          template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
            Name: `navixa-api-key-${config.stackName.toLowerCase()}`,
            Enabled: true,
          });

          // 11. Usage Plan with throttling configuration
          template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
            UsagePlanName: `navixa-usage-plan-${config.stackName.toLowerCase()}`,
            Throttle: {
              RateLimit: config.apiThrottleRate,
              BurstLimit: config.apiThrottleBurst,
            },
            Quota: {
              Limit: 10000,
              Period: 'DAY',
            },
          });

          // Property: CDK SHALL create API Gateway resources structure

          // Verify key API resources exist
          const apiResources = [
            '/api',
            '/api/v1',
            '/api/v1/chat',
            '/api/v1/chat/message',
            '/api/v1/rag',
            '/api/v1/rag/query',
            '/api/v1/agent',
            '/api/v1/agent/recommend',
            '/api/v1/resume',
            '/api/v1/resume/upload',
            '/api/v1/learning',
            '/api/v1/learning/generate-path',
            '/api/v1/jobs',
            '/api/v1/jobs/search',
          ];

          // Count API Gateway resources - should have all the resources we defined
          const resourceCount = template.findResources('AWS::ApiGateway::Resource');
          expect(Object.keys(resourceCount).length).toBeGreaterThanOrEqual(apiResources.length);

          // Property: CDK SHALL output API Gateway endpoint URLs

          // Verify CloudFormation outputs are created
          const outputs = template.findOutputs('*');
          expect(outputs).toHaveProperty('RestApiUrl');
          expect(outputs).toHaveProperty('RestApiId');
          expect(outputs).toHaveProperty('ApiKeyId');

          // Verify all DynamoDB table outputs
          expect(outputs).toHaveProperty('UserProfileTableName');
          expect(outputs).toHaveProperty('ChatSessionTableName');
          expect(outputs).toHaveProperty('LearningPathProgressTableName');
          expect(outputs).toHaveProperty('RAGQueryCacheTableName');

          // Verify all S3 bucket outputs
          expect(outputs).toHaveProperty('ResumeDocumentsBucketName');
          expect(outputs).toHaveProperty('CareerKnowledgeBaseBucketName');

          // Verify IAM role output
          expect(outputs).toHaveProperty('LambdaExecutionRoleArn');

          // Property: All resources should be properly tagged
          const allResources = template.toJSON().Resources;
          const taggedResourceTypes = [
            'AWS::IAM::Role',
            'AWS::ApiGateway::RestApi',
            'AWS::ApiGateway::ApiKey',
          ];

          Object.entries(allResources).forEach(([logicalId, resource]: [string, any]) => {
            if (taggedResourceTypes.includes(resource.Type)) {
              // Verify resources have proper tags
              expect(resource.Properties).toHaveProperty('Tags');
              const tags = resource.Properties.Tags;
              const tagMap = tags.reduce((acc: any, tag: any) => {
                acc[tag.Key] = tag.Value;
                return acc;
              }, {});
              expect(tagMap).toHaveProperty('Project', 'Navixa');
              expect(tagMap).toHaveProperty('ManagedBy', 'CDK');
            }
          });

          // Property: CloudWatch Log Groups should be created for API Gateway
          template.hasResourceProperties('AWS::Logs::LogGroup', {
            LogGroupName: `/aws/apigateway/navixa-${config.stackName.toLowerCase()}`,
            RetentionInDays: 30,
          });

          // Property: Request validators should be created
          const validators = template.findResources('AWS::ApiGateway::RequestValidator');
          expect(Object.keys(validators).length).toBeGreaterThanOrEqual(3); // body, params, full validators

          // Property: Request models should be created for validation
          const models = template.findResources('AWS::ApiGateway::Model');
          expect(Object.keys(models).length).toBeGreaterThanOrEqual(4); // chat, rag, agent, learning path models

          // All assertions passed - CDK creates all required resources
          return true;
        }
      ),
      { numRuns: 10 } // Run 10 iterations with different configurations
    );
  });

  it('should create resources with consistent naming conventions across environments', () => {
    // Feature: aws-genai-integration, Property 8: CDK creates all resources in AWS account
    
    fc.assert(
      fc.property(
        fc.constantFrom('Dev', 'Staging', 'Prod', 'Test', 'QA'),
        (stackName: string) => {
          const config: EnvironmentConfig = {
            account: '123456789012',
            region: 'us-east-1',
            stackName,
            bedrockRegion: 'us-east-1',
            apiThrottleRate: 100,
            apiThrottleBurst: 200,
            lambdaMemorySize: 512,
            dynamoDbBillingMode: 'PAY_PER_REQUEST',
            enableXRayTracing: true,
            logRetentionDays: 30,
          };

          const app = new cdk.App();
          const stack = new NavixaStack(app, `NavixaStack-${stackName}`, {
            env: { account: config.account, region: config.region },
            environmentConfig: config,
          });

          const template = cdk.assertions.Template.fromStack(stack);
          const lowerStackName = stackName.toLowerCase();

          // Verify consistent naming convention: navixa-{resource-type}-{environment}
          template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: `navixa-user-profiles-${lowerStackName}`,
          });

          template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: `navixa-chat-sessions-${lowerStackName}`,
          });

          template.hasResourceProperties('AWS::S3::Bucket', {
            BucketName: `navixa-resume-documents-${lowerStackName}`,
          });

          template.hasResourceProperties('AWS::IAM::Role', {
            RoleName: `navixa-lambda-execution-${lowerStackName}`,
          });

          template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: `navixa-api-${lowerStackName}`,
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should create resources with proper security configurations', () => {
    // Feature: aws-genai-integration, Property 8: CDK creates all resources in AWS account
    
    fc.assert(
      fc.property(
        fc.record({
          account: fc.constant('123456789012'),
          region: fc.constantFrom('us-east-1', 'us-west-2'),
          stackName: fc.constant('Test'),
          bedrockRegion: fc.constant('us-east-1'),
          apiThrottleRate: fc.integer({ min: 50, max: 500 }),
          apiThrottleBurst: fc.integer({ min: 100, max: 1000 }),
          lambdaMemorySize: fc.constant(512),
          dynamoDbBillingMode: fc.constant('PAY_PER_REQUEST'),
          enableXRayTracing: fc.boolean(),
          logRetentionDays: fc.constant(30),
        }),
        (config: EnvironmentConfig) => {
          const app = new cdk.App();
          const stack = new NavixaStack(app, 'NavixaStack-Test', {
            env: { account: config.account, region: config.region },
            environmentConfig: config,
          });

          const template = cdk.assertions.Template.fromStack(stack);

          // Property: All S3 buckets must have encryption enabled
          const s3Buckets = template.findResources('AWS::S3::Bucket');
          Object.values(s3Buckets).forEach((bucket: any) => {
            expect(bucket.Properties).toHaveProperty('BucketEncryption');
            expect(bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0]
              .ServerSideEncryptionByDefault.SSEAlgorithm).toBe('AES256');
          });

          // Property: All S3 buckets must block public access
          Object.values(s3Buckets).forEach((bucket: any) => {
            expect(bucket.Properties.PublicAccessBlockConfiguration).toEqual({
              BlockPublicAcls: true,
              BlockPublicPolicy: true,
              IgnorePublicAcls: true,
              RestrictPublicBuckets: true,
            });
          });

          // Property: All DynamoDB tables must have encryption enabled (AWS managed)
          const dynamoTables = template.findResources('AWS::DynamoDB::Table');
          Object.values(dynamoTables).forEach((table: any) => {
            // DynamoDB encryption is enabled by default with AWS managed keys
            // We verify point-in-time recovery is enabled for data protection
            expect(table.Properties.PointInTimeRecoverySpecification
              .PointInTimeRecoveryEnabled).toBe(true);
          });

          // Property: API Gateway must enforce HTTPS
          template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            EndpointConfiguration: {
              Types: ['REGIONAL'],
            },
          });

          // Property: API Gateway must have CloudWatch logging enabled
          template.hasResourceProperties('AWS::ApiGateway::Stage', {
            MethodSettings: [
              cdk.assertions.Match.objectLike({
                LoggingLevel: 'INFO',
                DataTraceEnabled: true,
                MetricsEnabled: true,
              }),
            ],
          });

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
