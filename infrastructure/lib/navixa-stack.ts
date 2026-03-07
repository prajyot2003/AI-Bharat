import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as path from 'path';
import { Construct } from 'constructs';

export interface EnvironmentConfig {
  account: string;
  region: string;
  stackName: string;
  bedrockRegion: string;
  apiThrottleRate: number;
  apiThrottleBurst: number;
  lambdaMemorySize: number;
  dynamoDbBillingMode: string;
  enableXRayTracing: boolean;
  logRetentionDays: number;
  alertEmail?: string;
}

export interface NavixaStackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
}

export class NavixaStack extends cdk.Stack {
  public readonly config: EnvironmentConfig;
  public readonly userProfileTable: dynamodb.Table;
  public readonly chatSessionTable: dynamodb.Table;
  public readonly learningPathProgressTable: dynamodb.Table;
  public readonly ragQueryCacheTable: dynamodb.Table;
  public readonly resumeDocumentsBucket: s3.Bucket;
  public readonly careerKnowledgeBaseBucket: s3.Bucket;
  public readonly lambdaExecutionRole: iam.Role;
  public readonly restApi: apigateway.RestApi;
  public readonly apiKey: apigateway.ApiKey;

  // Lambda functions (public for testing/referencing)
  public readonly bedrockRequestFn: lambdaNodejs.NodejsFunction;
  public readonly ragQueryFn: lambdaNodejs.NodejsFunction;
  public readonly aiAgentFn: lambdaNodejs.NodejsFunction;
  public readonly resumeProcessingFn: lambdaNodejs.NodejsFunction;
  public readonly jobDataFn: lambdaNodejs.NodejsFunction;
  public readonly learningPathFn: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: NavixaStackProps) {
    super(scope, id, props);

    this.config = props.environmentConfig;

    // DynamoDB Tables
    this.userProfileTable = this.createUserProfileTable();
    this.chatSessionTable = this.createChatSessionTable();
    this.learningPathProgressTable = this.createLearningPathProgressTable();
    this.ragQueryCacheTable = this.createRAGQueryCacheTable();

    // S3 Buckets
    this.resumeDocumentsBucket = this.createResumeDocumentsBucket();
    this.careerKnowledgeBaseBucket = this.createCareerKnowledgeBaseBucket();

    // IAM Roles
    this.lambdaExecutionRole = this.createLambdaExecutionRole();

    // Lambda Functions (Task 7)
    this.bedrockRequestFn = this.createBedrockRequestLambda();
    this.ragQueryFn = this.createRagQueryLambda();
    this.aiAgentFn = this.createAiAgentLambda();
    this.resumeProcessingFn = this.createResumeProcessingLambda();
    this.jobDataFn = this.createJobDataLambda();
    this.learningPathFn = this.createLearningPathLambda();

    // API Gateway
    this.restApi = this.createRestApi();
    this.apiKey = this.createApiKey();

    // Monitoring (Task 13)
    this.createMonitoring();

    // Outputs
    this.createOutputs();
  }

  // ─── DynamoDB Tables ────────────────────────────────────────────────────────

  private createUserProfileTable(): dynamodb.Table {
    return new dynamodb.Table(this, 'UserProfileTable', {
      tableName: `navixa-user-profiles-${this.config.stackName.toLowerCase()}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
  }

  private createChatSessionTable(): dynamodb.Table {
    return new dynamodb.Table(this, 'ChatSessionTable', {
      tableName: `navixa-chat-sessions-${this.config.stackName.toLowerCase()}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });
  }

  private createLearningPathProgressTable(): dynamodb.Table {
    return new dynamodb.Table(this, 'LearningPathProgressTable', {
      tableName: `navixa-learning-paths-${this.config.stackName.toLowerCase()}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'pathId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
  }

  private createRAGQueryCacheTable(): dynamodb.Table {
    return new dynamodb.Table(this, 'RAGQueryCacheTable', {
      tableName: `navixa-rag-cache-${this.config.stackName.toLowerCase()}`,
      partitionKey: { name: 'queryHash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });
  }

  // ─── S3 Buckets ─────────────────────────────────────────────────────────────

  private createResumeDocumentsBucket(): s3.Bucket {
    return new s3.Bucket(this, 'ResumeDocumentsBucket', {
      bucketName: `navixa-resume-documents-${this.config.stackName.toLowerCase()}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      lifecycleRules: [{
        id: 'ArchiveOldResumesToGlacier',
        enabled: true,
        transitions: [{ storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(365) }],
      }],
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      }],
    });
  }

  private createCareerKnowledgeBaseBucket(): s3.Bucket {
    return new s3.Bucket(this, 'CareerKnowledgeBaseBucket', {
      bucketName: `navixa-knowledge-base-${this.config.stackName.toLowerCase()}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      lifecycleRules: [{
        id: 'ArchiveOldVersionsToGlacier',
        enabled: true,
        noncurrentVersionTransitions: [{ storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(365) }],
      }],
    });
  }

  // ─── IAM Role ───────────────────────────────────────────────────────────────

  private createLambdaExecutionRole(): iam.Role {
    const role = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `navixa-lambda-execution-${this.config.stackName.toLowerCase()}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Navixa Lambda functions with Bedrock, DynamoDB, and S3 access',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockModelInvocation',
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [
        `arn:aws:bedrock:${this.config.bedrockRegion}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
        `arn:aws:bedrock:${this.config.bedrockRegion}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        `arn:aws:bedrock:${this.config.bedrockRegion}::foundation-model/amazon.titan-embed-text-v1`,
      ],
    }));

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockKnowledgeBaseAccess',
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
      resources: [`arn:aws:bedrock:${this.config.bedrockRegion}:${this.account}:knowledge-base/*`],
    }));

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockAgentInvocation',
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeAgent'],
      resources: [
        `arn:aws:bedrock:${this.config.bedrockRegion}:${this.account}:agent/*`,
        `arn:aws:bedrock:${this.config.bedrockRegion}:${this.account}:agent-alias/*/*`,
      ],
    }));

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'DynamoDBTableAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem',
        'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:BatchGetItem', 'dynamodb:BatchWriteItem',
      ],
      resources: [
        this.userProfileTable.tableArn, this.chatSessionTable.tableArn,
        this.learningPathProgressTable.tableArn, this.ragQueryCacheTable.tableArn,
        `${this.userProfileTable.tableArn}/index/*`, `${this.chatSessionTable.tableArn}/index/*`,
        `${this.learningPathProgressTable.tableArn}/index/*`, `${this.ragQueryCacheTable.tableArn}/index/*`,
      ],
    }));

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3ResumeDocumentsAccess',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [this.resumeDocumentsBucket.bucketArn, `${this.resumeDocumentsBucket.bucketArn}/*`],
    }));

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3KnowledgeBaseReadAccess',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:ListBucket'],
      resources: [this.careerKnowledgeBaseBucket.bucketArn, `${this.careerKnowledgeBaseBucket.bucketArn}/*`],
    }));

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchLogsAccess',
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams'],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/navixa-*`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/navixa-*:*`,
      ],
    }));

    if (this.config.enableXRayTracing) {
      role.addToPolicy(new iam.PolicyStatement({
        sid: 'XRayTracingAccess',
        effect: iam.Effect.ALLOW,
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
        resources: ['*'],
      }));
    }

    cdk.Tags.of(role).add('Project', 'Navixa');
    cdk.Tags.of(role).add('Component', 'Lambda');
    return role;
  }

  // ─── Lambda Functions (Task 7) ───────────────────────────────────────────────

  private commonLambdaProps(): Partial<lambdaNodejs.NodejsFunctionProps> {
    return {
      runtime: lambda.Runtime.NODEJS_22_X,
      role: this.lambdaExecutionRole,
      memorySize: this.config.lambdaMemorySize || 512,
      timeout: cdk.Duration.seconds(30),
      tracing: this.config.enableXRayTracing ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      logRetention: logs.RetentionDays.ONE_MONTH,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        LOG_LEVEL: 'INFO',
      },
    };
  }

  private createBedrockRequestLambda(): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, 'BedrockRequestFn', {
      ...this.commonLambdaProps(),
      functionName: `navixa-bedrock-request-${this.config.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../../lambda/bedrock-request/index.ts'),
      handler: 'handler',
      description: 'Handles Bedrock chat and generation requests with context management',
      environment: {
        ...this.commonLambdaProps().environment,
        BEDROCK_REGION: this.config.bedrockRegion,
        CHAT_SESSIONS_TABLE: this.chatSessionTable.tableName,
      },
    });
  }

  private createRagQueryLambda(): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, 'RagQueryFn', {
      ...this.commonLambdaProps(),
      functionName: `navixa-rag-query-${this.config.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../../lambda/rag-query/index.ts'),
      handler: 'handler',
      description: 'RAG query using Bedrock Knowledge Base with DynamoDB caching',
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...this.commonLambdaProps().environment,
        BEDROCK_REGION: this.config.bedrockRegion,
        RAG_CACHE_TABLE: this.ragQueryCacheTable.tableName,
        KNOWLEDGE_BASE_BUCKET: this.careerKnowledgeBaseBucket.bucketName,
      },
    });
  }

  private createAiAgentLambda(): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, 'AiAgentFn', {
      ...this.commonLambdaProps(),
      functionName: `navixa-ai-agent-${this.config.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../../lambda/ai-agent/index.ts'),
      handler: 'handler',
      description: 'AI Agent for personalized career recommendations via Bedrock Agents',
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...this.commonLambdaProps().environment,
        BEDROCK_REGION: this.config.bedrockRegion,
        USER_PROFILES_TABLE: this.userProfileTable.tableName,
      },
    });
  }

  private createResumeProcessingLambda(): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, 'ResumeProcessingFn', {
      ...this.commonLambdaProps(),
      functionName: `navixa-resume-processing-${this.config.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../../lambda/resume-processing/index.ts'),
      handler: 'handler',
      description: 'Resume upload (pre-signed URLs) and AI-powered analysis via Bedrock',
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...this.commonLambdaProps().environment,
        BEDROCK_REGION: this.config.bedrockRegion,
        RESUME_BUCKET: this.resumeDocumentsBucket.bucketName,
        USER_PROFILES_TABLE: this.userProfileTable.tableName,
      },
    });
  }

  private createJobDataLambda(): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, 'JobDataFn', {
      ...this.commonLambdaProps(),
      functionName: `navixa-job-data-${this.config.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../../lambda/job-data/index.ts'),
      handler: 'handler',
      description: 'Job search, market trend analysis, and skill matching',
      environment: {
        ...this.commonLambdaProps().environment,
        BEDROCK_REGION: this.config.bedrockRegion,
        JOB_CACHE_TABLE: this.ragQueryCacheTable.tableName,
      },
    });
  }

  private createLearningPathLambda(): lambdaNodejs.NodejsFunction {
    return new lambdaNodejs.NodejsFunction(this, 'LearningPathFn', {
      ...this.commonLambdaProps(),
      functionName: `navixa-learning-path-${this.config.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../../lambda/learning-path/index.ts'),
      handler: 'handler',
      description: 'Generates and tracks personalized learning paths via Bedrock',
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...this.commonLambdaProps().environment,
        BEDROCK_REGION: this.config.bedrockRegion,
        LEARNING_PATH_TABLE: this.learningPathProgressTable.tableName,
      },
    });
  }

  // ─── API Gateway (Task 7) ────────────────────────────────────────────────────

  private createRestApi(): apigateway.RestApi {
    const logGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      logGroupName: `/aws/apigateway/navixa-${this.config.stackName.toLowerCase()}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const api = new apigateway.RestApi(this, 'NavixaRestApi', {
      restApiName: `navixa-api-${this.config.stackName.toLowerCase()}`,
      description: 'Navixa Career Guidance API with AWS Bedrock integration',
      deployOptions: {
        stageName: 'v1',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true, httpMethod: true, ip: true, protocol: true, requestTime: true,
          resourcePath: true, responseLength: true, status: true, user: true,
        }),
        throttlingRateLimit: this.config.apiThrottleRate,
        throttlingBurstLimit: this.config.apiThrottleBurst,
        tracingEnabled: this.config.enableXRayTracing,
      },
      defaultMethodOptions: { apiKeyRequired: true },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type', 'X-Amz-Date', 'Authorization',
          'X-Api-Key', 'X-Amz-Security-Token', 'X-Amz-User-Agent',
        ],
        maxAge: cdk.Duration.hours(1),
      },
      endpointConfiguration: { types: [apigateway.EndpointType.REGIONAL] },
      cloudWatchRole: true,
    });

    // Lambda integrations
    const bedrockInt = new apigateway.LambdaIntegration(this.bedrockRequestFn, { proxy: true });
    const ragInt = new apigateway.LambdaIntegration(this.ragQueryFn, { proxy: true });
    const agentInt = new apigateway.LambdaIntegration(this.aiAgentFn, { proxy: true });
    const resumeInt = new apigateway.LambdaIntegration(this.resumeProcessingFn, { proxy: true });
    const jobInt = new apigateway.LambdaIntegration(this.jobDataFn, { proxy: true });
    const learningInt = new apigateway.LambdaIntegration(this.learningPathFn, { proxy: true });

    // Request validators
    const bodyValidator = new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: api,
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const paramsValidator = new apigateway.RequestValidator(this, 'ParamsValidator', {
      restApi: api,
      requestValidatorName: 'params-validator',
      validateRequestBody: false,
      validateRequestParameters: true,
    });

    // Request models
    const chatMessageRequestModel = api.addModel('ChatMessageRequest', {
      contentType: 'application/json',
      modelName: 'ChatMessageRequest',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['prompt', 'model'],
        properties: {
          prompt: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          model: { type: apigateway.JsonSchemaType.STRING, enum: ['claude-3-sonnet', 'claude-3-haiku'] },
          sessionId: { type: apigateway.JsonSchemaType.STRING },
          action: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    const ragQueryRequestModel = api.addModel('RAGQueryRequest', {
      contentType: 'application/json',
      modelName: 'RAGQueryRequest',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['query', 'userId'],
        properties: {
          query: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          userId: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          maxResults: { type: apigateway.JsonSchemaType.INTEGER, minimum: 1, maximum: 10 },
        },
      },
    });

    const agentRequestModel = api.addModel('AgentRequest', {
      contentType: 'application/json',
      modelName: 'AgentRequest',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['userId', 'action'],
        properties: {
          userId: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          action: { type: apigateway.JsonSchemaType.STRING, enum: ['recommend', 'analyze-skills', 'suggest-path'] },
          context: { type: apigateway.JsonSchemaType.OBJECT },
        },
      },
    });

    const learningPathRequestModel = api.addModel('LearningPathRequest', {
      contentType: 'application/json',
      modelName: 'LearningPathRequest',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['userId', 'targetRole'],
        properties: {
          userId: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          targetRole: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
          currentSkills: { type: apigateway.JsonSchemaType.ARRAY, items: { type: apigateway.JsonSchemaType.STRING } },
          timeframe: { type: apigateway.JsonSchemaType.INTEGER, minimum: 1 },
          action: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    const stdMethodOptions: apigateway.MethodOptions = {
      apiKeyRequired: true,
      methodResponses: [
        { statusCode: '200', responseModels: { 'application/json': apigateway.Model.EMPTY_MODEL } },
        { statusCode: '400', responseModels: { 'application/json': apigateway.Model.ERROR_MODEL } },
        { statusCode: '401', responseModels: { 'application/json': apigateway.Model.ERROR_MODEL } },
        { statusCode: '429', responseModels: { 'application/json': apigateway.Model.ERROR_MODEL } },
        { statusCode: '500', responseModels: { 'application/json': apigateway.Model.ERROR_MODEL } },
      ],
    };

    // ── Resource tree ──
    const apiV1 = api.root.addResource('api').addResource('v1');

    // /api/v1/chat
    const chatResource = apiV1.addResource('chat');
    chatResource.addResource('message').addMethod('POST', bedrockInt, {
      ...stdMethodOptions,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': chatMessageRequestModel },
    });
    chatResource.addResource('session').addResource('{id}').addMethod('GET', bedrockInt, {
      ...stdMethodOptions,
      requestValidator: paramsValidator,
      requestParameters: { 'method.request.path.id': true },
    });

    // /api/v1/rag
    const ragResource = apiV1.addResource('rag');
    ragResource.addResource('query').addMethod('POST', ragInt, {
      ...stdMethodOptions,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': ragQueryRequestModel },
    });
    ragResource.addResource('sources').addResource('{id}').addMethod('GET', ragInt, {
      ...stdMethodOptions,
      requestValidator: paramsValidator,
      requestParameters: { 'method.request.path.id': true },
    });

    // /api/v1/agent
    const agentResource = apiV1.addResource('agent');
    agentResource.addResource('recommend').addMethod('POST', agentInt, {
      ...stdMethodOptions,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': agentRequestModel },
    });
    agentResource.addResource('analyze').addMethod('POST', agentInt, {
      ...stdMethodOptions,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': agentRequestModel },
    });

    // /api/v1/resume
    const resumeResource = apiV1.addResource('resume');
    resumeResource.addResource('upload').addMethod('POST', resumeInt, {
      ...stdMethodOptions, requestValidator: bodyValidator,
    });
    resumeResource.addResource('analyze').addMethod('POST', resumeInt, {
      ...stdMethodOptions, requestValidator: bodyValidator,
    });
    resumeResource.addResource('enhance').addMethod('POST', resumeInt, {
      ...stdMethodOptions, requestValidator: bodyValidator,
    });

    // /api/v1/learning
    const learningResource = apiV1.addResource('learning');
    learningResource.addResource('generate-path').addMethod('POST', learningInt, {
      ...stdMethodOptions,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': learningPathRequestModel },
    });
    const learningPathRes = learningResource.addResource('path');
    learningPathRes.addResource('{id}').addMethod('GET', learningInt, {
      ...stdMethodOptions,
      requestValidator: paramsValidator,
      requestParameters: { 'method.request.path.id': true },
    });
    learningResource.addResource('progress').addMethod('PUT', learningInt, {
      ...stdMethodOptions, requestValidator: bodyValidator,
    });

    // /api/v1/jobs
    const jobsResource = apiV1.addResource('jobs');
    jobsResource.addResource('search').addMethod('POST', jobInt, {
      ...stdMethodOptions, requestValidator: bodyValidator,
    });
    jobsResource.addResource('analyze').addMethod('POST', jobInt, {
      ...stdMethodOptions, requestValidator: bodyValidator,
    });

    // Gateway-level error responses (Task 7.3)
    api.addGatewayResponse('BadRequestBody', {
      type: apigateway.ResponseType.BAD_REQUEST_BODY,
      statusCode: '400',
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      templates: { 'application/json': '{"error":"Request validation failed: $context.error.validationErrorString"}' },
    });
    api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      templates: { 'application/json': '{"error":"API key required. Include x-api-key header."}' },
    });
    api.addGatewayResponse('Throttled', {
      type: apigateway.ResponseType.THROTTLED,
      statusCode: '429',
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      templates: { 'application/json': '{"error":"Too many requests. Please slow down."}' },
    });
    api.addGatewayResponse('Default5xx', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      statusCode: '500',
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      templates: { 'application/json': '{"error":"Internal server error. Please try again."}' },
    });

    cdk.Tags.of(api).add('Project', 'Navixa');
    cdk.Tags.of(api).add('Component', 'API');
    return api;
  }

  private createApiKey(): apigateway.ApiKey {
    const apiKey = new apigateway.ApiKey(this, 'NavixaApiKey', {
      apiKeyName: `navixa-api-key-${this.config.stackName.toLowerCase()}`,
      description: 'API Key for Navixa frontend application',
      enabled: true,
    });

    const usagePlan = this.restApi.addUsagePlan('NavixaUsagePlan', {
      name: `navixa-usage-plan-${this.config.stackName.toLowerCase()}`,
      description: 'Usage plan for Navixa API with throttling limits',
      throttle: { rateLimit: this.config.apiThrottleRate, burstLimit: this.config.apiThrottleBurst },
      quota: { limit: 10000, period: apigateway.Period.DAY },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({ stage: this.restApi.deploymentStage });

    cdk.Tags.of(apiKey).add('Project', 'Navixa');
    return apiKey;
  }

  // ─── Monitoring & Observability (Task 13) ─────────────────────────────────────

  private createMonitoring(): void {
    // SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'NavixaAlertsTopic', {
      topicName: `navixa-alerts-${this.config.stackName.toLowerCase()}`,
      displayName: 'Navixa Operational Alerts',
    });

    if (this.config.alertEmail) {
      new sns.Subscription(this, 'AlertEmailSubscription', {
        topic: alertTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: this.config.alertEmail,
      });
    }

    const snsAction = new cloudwatchActions.SnsAction(alertTopic);

    // Lambda error-rate alarms (Task 13.3)
    const lambdas = [
      { fn: this.bedrockRequestFn, name: 'BedrockRequest' },
      { fn: this.ragQueryFn, name: 'RagQuery' },
      { fn: this.aiAgentFn, name: 'AiAgent' },
      { fn: this.resumeProcessingFn, name: 'ResumeProcessing' },
      { fn: this.jobDataFn, name: 'JobData' },
      { fn: this.learningPathFn, name: 'LearningPath' },
    ];

    for (const { fn, name } of lambdas) {
      // Error rate alarm (>5% errors in 5 minutes)
      const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `navixa-${name.toLowerCase()}-errors-${this.config.stackName.toLowerCase()}`,
        alarmDescription: `${name} Lambda error rate exceeded 5%`,
        metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(snsAction);

      // Duration alarm (>25 seconds)
      const durationAlarm = new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        alarmName: `navixa-${name.toLowerCase()}-duration-${this.config.stackName.toLowerCase()}`,
        alarmDescription: `${name} Lambda duration exceeded 25 seconds`,
        metric: fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p95' }),
        threshold: 25000, // milliseconds
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      durationAlarm.addAlarmAction(snsAction);
    }

    // API Gateway 5xx alarm
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `navixa-api-5xx-errors-${this.config.stackName.toLowerCase()}`,
      alarmDescription: 'API Gateway 5xx error count exceeded 10 in 1 minute',
      metric: this.restApi.metricServerError({ period: cdk.Duration.minutes(1) }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxAlarm.addAlarmAction(snsAction);

    // API 4xx alarm
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxAlarm', {
      alarmName: `navixa-api-4xx-errors-${this.config.stackName.toLowerCase()}`,
      alarmDescription: 'API Gateway 4xx error count exceeded 50 in 5 minutes',
      metric: this.restApi.metricClientError({ period: cdk.Duration.minutes(5) }),
      threshold: 50,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api4xxAlarm.addAlarmAction(snsAction);

    // CloudWatch Dashboard (Task 13.2)
    const dashboard = new cloudwatch.Dashboard(this, 'NavixaDashboard', {
      dashboardName: `navixa-${this.config.stackName.toLowerCase()}`,
    });

    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# Navixa AI Platform – ${this.config.stackName} Dashboard`,
        width: 24, height: 1,
      }),
      // API Gateway metrics
      new cloudwatch.GraphWidget({
        title: 'API Gateway – Request Count',
        width: 12, height: 6,
        left: [this.restApi.metricCount({ period: cdk.Duration.minutes(5) })],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway – Error Rates',
        width: 12, height: 6,
        left: [
          this.restApi.metricClientError({ period: cdk.Duration.minutes(5) }),
          this.restApi.metricServerError({ period: cdk.Duration.minutes(5) }),
        ],
      }),
      // Lambda invocations
      new cloudwatch.GraphWidget({
        title: 'Lambda – Invocations',
        width: 12, height: 6,
        left: lambdas.map(({ fn, name }) =>
          fn.metricInvocations({ period: cdk.Duration.minutes(5), label: name })
        ),
      }),
      // Lambda errors
      new cloudwatch.GraphWidget({
        title: 'Lambda – Errors',
        width: 12, height: 6,
        left: lambdas.map(({ fn, name }) =>
          fn.metricErrors({ period: cdk.Duration.minutes(5), label: name })
        ),
      }),
      // Lambda durations
      new cloudwatch.GraphWidget({
        title: 'Lambda – P95 Duration (ms)',
        width: 24, height: 6,
        left: lambdas.map(({ fn, name }) =>
          fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p95', label: name })
        ),
      }),
    );

    // Output SNS topic ARN
    new cdk.CfnOutput(this, 'AlertsTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS topic for operational alerts',
      exportName: `${this.stackName}-AlertsTopicArn`,
    });
  }

  // ─── Outputs ─────────────────────────────────────────────────────────────────

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'StackName', { value: this.stackName, description: 'CloudFormation stack name' });
    new cdk.CfnOutput(this, 'Region', { value: this.region, description: 'AWS region' });

    new cdk.CfnOutput(this, 'UserProfileTableName', {
      value: this.userProfileTable.tableName,
      exportName: `${this.stackName}-UserProfileTable`,
    });
    new cdk.CfnOutput(this, 'ChatSessionTableName', {
      value: this.chatSessionTable.tableName,
      exportName: `${this.stackName}-ChatSessionTable`,
    });
    new cdk.CfnOutput(this, 'LearningPathProgressTableName', {
      value: this.learningPathProgressTable.tableName,
      exportName: `${this.stackName}-LearningPathProgressTable`,
    });
    new cdk.CfnOutput(this, 'RAGQueryCacheTableName', {
      value: this.ragQueryCacheTable.tableName,
      exportName: `${this.stackName}-RAGQueryCacheTable`,
    });
    new cdk.CfnOutput(this, 'ResumeDocumentsBucketName', {
      value: this.resumeDocumentsBucket.bucketName,
      exportName: `${this.stackName}-ResumeDocumentsBucket`,
    });
    new cdk.CfnOutput(this, 'CareerKnowledgeBaseBucketName', {
      value: this.careerKnowledgeBaseBucket.bucketName,
      exportName: `${this.stackName}-CareerKnowledgeBaseBucket`,
    });
    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      exportName: `${this.stackName}-LambdaExecutionRole`,
    });
    new cdk.CfnOutput(this, 'RestApiId', {
      value: this.restApi.restApiId,
      exportName: `${this.stackName}-RestApiId`,
    });
    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.restApi.url,
      description: 'Set this as NEXT_PUBLIC_API_GATEWAY_URL in your frontend .env',
      exportName: `${this.stackName}-RestApiUrl`,
    });
    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: this.apiKey.keyId,
      description: 'Use with `aws apigateway get-api-key --api-key <id> --include-value` to retrieve key value',
      exportName: `${this.stackName}-ApiKeyId`,
    });

    // Lambda function ARNs
    new cdk.CfnOutput(this, 'BedrockRequestFunctionArn', { value: this.bedrockRequestFn.functionArn, exportName: `${this.stackName}-BedrockRequestFn` });
    new cdk.CfnOutput(this, 'RagQueryFunctionArn', { value: this.ragQueryFn.functionArn, exportName: `${this.stackName}-RagQueryFn` });
    new cdk.CfnOutput(this, 'AiAgentFunctionArn', { value: this.aiAgentFn.functionArn, exportName: `${this.stackName}-AiAgentFn` });
    new cdk.CfnOutput(this, 'ResumeProcessingFunctionArn', { value: this.resumeProcessingFn.functionArn, exportName: `${this.stackName}-ResumeProcessingFn` });
    new cdk.CfnOutput(this, 'JobDataFunctionArn', { value: this.jobDataFn.functionArn, exportName: `${this.stackName}-JobDataFn` });
    new cdk.CfnOutput(this, 'LearningPathFunctionArn', { value: this.learningPathFn.functionArn, exportName: `${this.stackName}-LearningPathFn` });
  }
}
