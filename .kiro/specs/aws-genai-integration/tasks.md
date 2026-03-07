# Implementation Plan: AWS Generative AI Integration

## Overview

This implementation plan covers the integration of AWS Generative AI services into the Navixa career guidance application. The implementation replaces existing Gemini/Ollama AI services with Amazon Bedrock, establishes serverless backend infrastructure using AWS Lambda and API Gateway, implements a RAG system with Bedrock Knowledge Base, deploys AI Agents for personalized recommendations, and migrates the Next.js frontend to use AWS services.

The implementation follows a phased approach: infrastructure setup, backend services, AI integration, frontend migration, security hardening, and deployment with monitoring.

## Tasks

- [x] 1. AWS CDK Infrastructure Setup
  - [x] 1.1 Initialize AWS CDK project and configure TypeScript
    - Create CDK app structure in `infrastructure/` directory
    - Configure CDK context for development and production environments
    - Set up AWS account and region configuration
    - Install required CDK packages (@aws-cdk/aws-lambda, @aws-cdk/aws-apigateway, etc.)
    - _Requirements: 8.1, 8.2_

  - [x] 1.2 Define DynamoDB tables with CDK constructs
    - Create UserProfile table with userId partition key
    - Create ChatSession table with sessionId partition key and timestamp sort key
    - Create LearningPathProgress table with userId partition key and pathId sort key
    - Create RAGQueryCache table with queryHash partition key
    - Configure on-demand billing mode and point-in-time recovery
    - Set up TTL for ChatSession (90 days) and RAGQueryCache (1 hour)
    - _Requirements: 6.2, 6.3, 6.4, 6.8, 6.9, 6.10_

  - [x] 1.3 Define S3 buckets with security policies
    - Create resume documents bucket with server-side encryption
    - Create career knowledge base bucket with versioning enabled
    - Configure bucket policies to restrict public access
    - Set up lifecycle policies for archiving to Glacier after 365 days
    - Configure CORS for frontend uploads
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.8, 7.9_

  - [x] 1.4 Configure Amazon Bedrock permissions and IAM roles
    - Create IAM role for Lambda functions with Bedrock access
    - Grant bedrock:InvokeModel permission for Claude 3 models
    - Grant bedrock:Retrieve permission for Knowledge Base access
    - Grant bedrock:InvokeAgent permission for AI Agents
    - Configure least-privilege permissions for DynamoDB and S3 access
    - _Requirements: 8.7, 12.1_

  - [x] 1.5 Define API Gateway REST API with Lambda integrations
    - Create REST API with resource-based routing structure
    - Configure API key authentication
    - Set up request throttling at 100 requests/second
    - Configure CORS for Navixa application domain
    - Enable request validation with JSON schemas
    - Set up CloudWatch logging for all requests
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.9_

  - [x] 1.6 Write property test for CDK infrastructure deployment
    - **Property 8: CDK creates all resources in AWS account**
    - **Validates: Requirements 8.9**

- [ ] 2. Bedrock Request Lambda Function
  - [x] 2.1 Implement Lambda handler for Bedrock API calls
    - Create handler function accepting BedrockRequestEvent
    - Implement model selection logic (Claude 3 Sonnet vs Haiku)
    - Configure model parameters (temperature, maxTokens, topP)
    - Invoke Bedrock Runtime API with appropriate model ID
    - Parse and return BedrockRequestResponse
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.10, 4.2_

  - [x] 2.2 Implement conversation context management with DynamoDB
    - Retrieve existing chat session from DynamoDB by sessionId
    - Append new messages to conversation history
    - Include previous messages in Bedrock prompt for context
    - Save updated session back to DynamoDB
    - _Requirements: 1.8, 6.6_

  - [x] 2.3 Implement error handling with retry logic
    - Handle ThrottlingException with exponential backoff retry
    - Handle ValidationException with user-friendly error messages
    - Handle ModelNotReadyException with delayed retry
    - Log all errors to CloudWatch with detailed context
    - Return appropriate HTTP status codes
    - _Requirements: 1.9, 4.10_

  - [x] 2.4 Write unit tests for Bedrock Request Lambda
    - Test Claude 3 Sonnet invocation for chat messages
    - Test error handling for throttling and validation errors
    - Test conversation context persistence
    - Test model parameter configuration
    - _Requirements: 1.4, 1.8, 1.9_

  - [ ] 2.5 Write property test for Bedrock invocation
    - **Property 1: All AI features invoke Amazon Bedrock**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.10**

  - [ ] 2.6 Write property test for conversation context
    - **Property 2: Conversation context persistence**
    - **Validates: Requirements 1.8**

  - [ ] 2.7 Write property test for error handling
    - **Property 3: Error handling with user-friendly messages**
    - **Validates: Requirements 1.9, 4.10, 9.8**

- [ ] 3. RAG System with Bedrock Knowledge Base
  - [ ] 3.1 Set up Bedrock Knowledge Base with OpenSearch Serverless
    - Create OpenSearch Serverless collection for vector storage
    - Configure Titan Embeddings G1 as embedding model
    - Set up knowledge base with S3 data source
    - Configure chunking strategy (1000 tokens, 200 overlap)
    - Set retrieval to top-5 documents with hybrid ranking
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8_

  - [ ] 3.2 Populate Career Knowledge Base in S3
    - Create directory structure for career guides, learning resources, job market data
    - Add sample markdown documents with frontmatter metadata
    - Upload documents to S3 knowledge base bucket
    - Trigger knowledge base indexing
    - _Requirements: 2.2, 2.3_

  - [ ] 3.3 Implement RAG Query Lambda function
    - Create handler accepting RAGQueryEvent
    - Query Bedrock Knowledge Base with user question
    - Retrieve top-5 relevant documents from vector store
    - Combine retrieved context with Bedrock generation
    - Return answer with source citations
    - _Requirements: 2.4, 2.5, 2.8, 2.10, 4.3_

  - [ ] 3.4 Implement response caching in DynamoDB
    - Generate hash of query for cache key
    - Check RAGQueryCache table before querying knowledge base
    - Store query results with 1-hour TTL
    - Return cached response if available
    - _Requirements: 13.3, 15.10_

  - [ ] 3.5 Write unit tests for RAG Query Lambda
    - Test document retrieval from knowledge base
    - Test source citation inclusion in responses
    - Test cache hit and miss scenarios
    - Test top-5 document limit
    - _Requirements: 2.4, 2.8, 2.10_

  - [ ] 3.6 Write property test for RAG context retrieval
    - **Property 4: RAG context retrieval**
    - **Validates: Requirements 2.4**

  - [ ] 3.7 Write property test for RAG response combination
    - **Property 5: RAG response combination**
    - **Validates: Requirements 2.5**

  - [ ] 3.8 Write property test for document retrieval limit
    - **Property 6: RAG document retrieval limit**
    - **Validates: Requirements 2.8**

  - [ ] 3.9 Write property test for source citations
    - **Property 7: RAG source citations**
    - **Validates: Requirements 2.10**

  - [ ] 3.10 Write property test for response caching
    - **Property 27: Response caching for identical queries**
    - **Validates: Requirements 13.3, 15.10**

- [ ] 4. AI Agent with Bedrock Agents
  - [ ] 4.1 Create Bedrock Agent with foundation model
    - Define NavixaCareerAdvisor agent with Claude 3 Sonnet
    - Configure agent instructions for career guidance
    - Set up agent session state management
    - _Requirements: 3.1, 3.5_

  - [ ] 4.2 Implement agent tool Lambda functions
    - Create fetchJobMarketData tool Lambda
    - Create calculateSkillGap tool Lambda
    - Create searchLearningResources tool Lambda
    - Create analyzeCareerPath tool Lambda
    - Register tools with Bedrock Agent
    - _Requirements: 3.6, 3.7, 4.4_

  - [ ] 4.3 Implement AI Agent Lambda handler
    - Create handler accepting AgentRequestEvent
    - Fetch user profile from DynamoDB
    - Invoke Bedrock Agent with user context
    - Process agent response and tool invocations
    - Return recommendations with reasoning and next steps
    - Store agent session state in DynamoDB
    - _Requirements: 3.2, 3.3, 3.4, 3.9, 3.10_

  - [ ] 4.4 Write unit tests for AI Agent Lambda
    - Test agent invocation with user profile context
    - Test tool invocation for job market data
    - Test actionable recommendations generation
    - Test session state persistence
    - _Requirements: 3.2, 3.4, 3.9, 3.10_

  - [ ] 4.5 Write property test for agent data access
    - **Property 8: AI agent data access**
    - **Validates: Requirements 3.2, 3.3**

  - [ ] 4.6 Write property test for personalized recommendations
    - **Property 9: AI agent personalized recommendations**
    - **Validates: Requirements 3.4**

  - [ ] 4.7 Write property test for agent tool invocation
    - **Property 10: AI agent tool invocation**
    - **Validates: Requirements 3.6, 3.7**

  - [ ] 4.8 Write property test for learning path personalization
    - **Property 11: AI agent learning path personalization**
    - **Validates: Requirements 3.8**

  - [ ] 4.9 Write property test for actionable recommendations
    - **Property 12: AI agent actionable recommendations**
    - **Validates: Requirements 3.9**

  - [ ] 4.10 Write property test for session state persistence
    - **Property 13: AI agent session state persistence**
    - **Validates: Requirements 3.10**

- [ ] 5. Resume Processing Lambda Function
  - [ ] 5.1 Implement resume upload and S3 storage
    - Generate pre-signed S3 URL for resume upload
    - Configure 1-hour expiration for pre-signed URLs
    - Store resume with userId prefix in S3 path
    - Validate file format (PDF, DOCX, TXT only)
    - _Requirements: 7.3, 7.6, 7.10_

  - [ ] 5.2 Implement resume parsing and text extraction
    - Download resume from S3 on upload event trigger
    - Extract text from PDF using pdf-parse library
    - Extract text from DOCX using mammoth library
    - Handle TXT files directly
    - _Requirements: 4.5, 7.7, 7.10_

  - [ ] 5.3 Implement AI-powered resume analysis
    - Use Bedrock to extract skills, experience, education
    - Calculate ATS optimization score
    - Generate improvement suggestions
    - Enhance content with AI-generated improvements
    - Store analysis results in DynamoDB
    - _Requirements: 1.7, 4.5_

  - [ ] 5.4 Write unit tests for Resume Processing Lambda
    - Test pre-signed URL generation with 1-hour expiration
    - Test resume storage with userId prefix
    - Test file format validation
    - Test text extraction from PDF and DOCX
    - _Requirements: 7.3, 7.6, 7.10_

  - [ ] 5.5 Write property test for S3 resume storage
    - **Property 18: S3 resume storage with user prefix**
    - **Validates: Requirements 7.3**

  - [ ] 5.6 Write property test for pre-signed URL expiration
    - **Property 19: S3 pre-signed URL expiration**
    - **Validates: Requirements 7.6**

  - [ ] 5.7 Write property test for S3 upload event trigger
    - **Property 20: S3 upload event triggers Lambda**
    - **Validates: Requirements 7.7**

  - [ ] 5.8 Write property test for file format validation
    - **Property 21: S3 supported file formats**
    - **Validates: Requirements 7.10**

- [ ] 6. Job Data and Learning Path Lambda Functions
  - [ ] 6.1 Implement Job Data Lambda function
    - Create handler for job search and market analysis
    - Fetch job data from external APIs (mock for hackathon)
    - Use Bedrock to analyze market trends
    - Match user skills to job requirements
    - Cache results in DynamoDB
    - _Requirements: 4.4_

  - [ ] 6.2 Implement Learning Path Lambda function
    - Create handler accepting LearningPathEvent
    - Analyze skill gaps between current and target role
    - Query knowledge base for learning resources
    - Use Bedrock to structure personalized learning path
    - Store learning path in DynamoDB
    - Track user progress updates
    - _Requirements: 1.5, 3.8, 4.5, 6.7_

  - [ ] 6.3 Write unit tests for Job Data Lambda
    - Test job search functionality
    - Test market trend analysis
    - Test skill matching logic
    - Test result caching
    - _Requirements: 4.4_

  - [ ] 6.4 Write unit tests for Learning Path Lambda
    - Test skill gap analysis
    - Test learning path generation
    - Test progress tracking
    - _Requirements: 1.5, 4.5, 6.7_

- [ ] 7. API Gateway Configuration and Integration
  - [ ] 7.1 Define API Gateway resources and methods
    - Create /chat, /rag, /agent, /resume, /learning, /jobs resources
    - Define POST, GET, PUT methods for each resource
    - Configure Lambda proxy integrations
    - Set up method request validation
    - _Requirements: 5.1, 5.2_

  - [ ] 7.2 Implement API key authentication
    - Create API key for frontend application
    - Configure usage plan with throttling limits
    - Require x-api-key header for all requests
    - Return 401 for missing or invalid API keys
    - _Requirements: 5.4_

  - [ ] 7.3 Configure request validation and error responses
    - Define JSON schemas for request validation
    - Configure gateway responses for 400, 401, 429, 500 errors
    - Return detailed error messages for validation failures
    - _Requirements: 5.7, 5.8_

  - [ ] 7.4 Write integration tests for API Gateway
    - Test request rejection without API key
    - Test request validation before Lambda invocation
    - Test CloudWatch logging for all requests
    - Test CORS configuration
    - _Requirements: 5.4, 5.7, 5.9_

  - [ ] 7.5 Write property test for API Gateway authentication
    - **Property 14: API Gateway authentication enforcement**
    - **Validates: Requirements 5.4**

  - [ ] 7.6 Write property test for request validation
    - **Property 15: API Gateway request validation**
    - **Validates: Requirements 5.7, 5.8**

  - [ ] 7.7 Write property test for request logging
    - **Property 16: API Gateway request logging**
    - **Validates: Requirements 5.9**

- [ ] 8. Checkpoint - Backend Infrastructure Complete
  - Ensure all Lambda functions deploy successfully
  - Verify API Gateway endpoints are accessible
  - Test DynamoDB table operations
  - Test S3 bucket access and permissions
  - Ensure all tests pass, ask the user if questions arise

- [ ] 9. Frontend AI Service Client Migration
  - [ ] 9.1 Create AIServiceClient class for AWS backend
    - Implement sendChatMessage method calling /chat/message endpoint
    - Implement generateLearningPath method calling /learning/generate-path endpoint
    - Implement analyzeJobOpportunities method calling /jobs/analyze endpoint
    - Implement enhanceResume method calling /resume/enhance endpoint
    - Implement getCareerRecommendations method calling /agent/recommend endpoint
    - Configure API Gateway base URL from environment variables
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 9.2 Implement API key authentication in client
    - Add x-api-key header to all requests
    - Load API key from environment configuration
    - Handle 401 authentication errors
    - _Requirements: 9.4_

  - [ ] 9.3 Implement error handling and retry logic
    - Handle network errors with user-friendly messages
    - Implement exponential backoff for transient failures
    - Display loading states during API requests
    - Show error notifications for failed requests
    - _Requirements: 9.8, 9.9, 15.9_

  - [ ] 9.4 Write unit tests for AIServiceClient
    - Test API key inclusion in all requests
    - Test API Gateway endpoint calls
    - Test error handling for various failure scenarios
    - _Requirements: 9.4, 9.5, 9.8_

  - [ ] 9.5 Write property test for frontend API authentication
    - **Property 22: Frontend API authentication**
    - **Validates: Requirements 9.4**

  - [ ] 9.6 Write property test for frontend AWS integration
    - **Property 23: Frontend AWS integration**
    - **Validates: Requirements 9.5, 9.6, 9.7**

- [ ] 10. Frontend Route Migration
  - [ ] 10.1 Replace /api/gemini route with AWS backend
    - Update chat components to use AIServiceClient
    - Remove Gemini API client code
    - Update environment variables for API Gateway URL
    - Test chat functionality with Bedrock backend
    - _Requirements: 9.1, 9.5, 14.5_

  - [ ] 10.2 Replace /api/ollama route with AWS backend
    - Update AI generation components to use AIServiceClient
    - Remove Ollama API client code
    - Test learning path generation with Bedrock backend
    - _Requirements: 9.2, 9.6, 14.5_

  - [ ] 10.3 Implement feature flags for gradual migration
    - Add USE_BEDROCK environment variable
    - Create adapter functions for request/response format mapping
    - Route requests based on feature flag
    - Maintain backward compatibility during transition
    - _Requirements: 14.2, 14.3, 14.4_

  - [ ] 10.4 Update resume upload flow for S3
    - Request pre-signed URL from /resume/upload endpoint
    - Upload file directly to S3 using pre-signed URL
    - Display upload progress
    - Handle upload errors gracefully
    - _Requirements: 9.7_

  - [ ] 10.5 Write integration tests for frontend migration
    - Test chat functionality with AWS backend
    - Test learning path generation with AWS backend
    - Test resume upload to S3
    - Test feature flag routing
    - _Requirements: 9.5, 9.6, 9.7, 14.2_

  - [ ] 10.6 Write property test for migration backward compatibility
    - **Property 28: Migration backward compatibility**
    - **Validates: Requirements 14.1**

  - [ ] 10.7 Write property test for feature flag routing
    - **Property 29: Feature flag backend selection**
    - **Validates: Requirements 14.2**

- [ ] 11. Security Implementation
  - [ ] 11.1 Implement input sanitization for AI prompts
    - Create sanitizeInput function to remove malicious patterns
    - Strip HTML tags and script elements
    - Detect and block prompt injection attempts
    - Apply sanitization before all Bedrock API calls
    - _Requirements: 12.4, 12.5_

  - [ ] 11.2 Configure encryption for data at rest and in transit
    - Enable SSE-S3 encryption for all S3 buckets
    - Verify DynamoDB encryption at rest (enabled by default)
    - Enforce HTTPS/TLS 1.2+ for all API Gateway endpoints
    - _Requirements: 12.2, 12.3_

  - [ ] 11.3 Implement secure logging practices
    - Create logger utility that filters sensitive data
    - Exclude passwords, API keys, PII from CloudWatch logs
    - Log only user IDs, not full user data
    - _Requirements: 12.7_

  - [ ] 11.4 Configure AWS Secrets Manager for credentials
    - Store API keys in Secrets Manager
    - Store database credentials in Secrets Manager
    - Update Lambda functions to retrieve secrets at runtime
    - Rotate secrets periodically
    - _Requirements: 12.9_

  - [ ] 11.5 Write security tests
    - Test input sanitization with malicious patterns
    - Test sensitive data exclusion from logs
    - Test encryption configuration
    - _Requirements: 12.4, 12.5, 12.7_

  - [ ] 11.6 Write property test for input sanitization
    - **Property 24: Input sanitization for AI prompts**
    - **Validates: Requirements 12.4, 12.5**

  - [ ] 11.7 Write property test for secure logging
    - **Property 25: Sensitive data exclusion from logs**
    - **Validates: Requirements 12.7**

- [ ] 12. Model Selection and Cost Optimization
  - [ ] 12.1 Implement model selection logic
    - Create calculateComplexity function for query analysis
    - Create selectModel function using complexity threshold
    - Use Claude 3 Haiku for complexity < 0.7
    - Use Claude 3 Sonnet for complexity >= 0.7 or learning-path requests
    - _Requirements: 13.1, 13.2_

  - [ ] 12.2 Implement response caching strategy
    - Cache AI responses in DynamoDB with 1-hour TTL
    - Cache API Gateway GET requests with 5-minute TTL
    - Implement cache key generation from request parameters
    - _Requirements: 13.3, 13.7_

  - [ ] 12.3 Configure Lambda memory optimization
    - Set initial memory allocation to 512MB for all functions
    - Monitor CloudWatch metrics for memory usage
    - Adjust memory based on actual usage patterns
    - _Requirements: 13.6_

  - [ ] 12.4 Write unit tests for model selection
    - Test Haiku selection for simple queries
    - Test Sonnet selection for complex reasoning
    - Test complexity calculation
    - _Requirements: 13.1, 13.2_

  - [ ] 12.5 Write property test for model selection
    - **Property 26: Model selection based on complexity**
    - **Validates: Requirements 13.1, 13.2**

- [ ] 13. Monitoring and Observability
  - [ ] 13.1 Configure CloudWatch Logs for all Lambda functions
    - Enable CloudWatch Logs for all Lambda functions
    - Set log retention to 30 days
    - Create structured log format with JSON
    - Include requestId, userId, function name in all logs
    - _Requirements: 10.3, 10.10_

  - [ ] 13.2 Configure CloudWatch Metrics and Dashboard
    - Create custom metrics for API request counts
    - Create custom metrics for Bedrock invocation counts
    - Create custom metrics for cache hit rates
    - Build CloudWatch Dashboard with key performance metrics
    - _Requirements: 10.4, 10.5_

  - [ ] 13.3 Configure CloudWatch Alarms
    - Create alarm for Lambda error rate > 5% (5-minute period)
    - Create alarm for API Gateway 5xx errors > 10 (1-minute period)
    - Create alarm for Lambda duration > 25 seconds
    - Create alarm for Bedrock throttling errors > 5 (1-minute period)
    - Configure SNS topic for alarm notifications
    - _Requirements: 10.6, 10.7, 10.8_

  - [ ] 13.4 Enable AWS X-Ray tracing
    - Enable X-Ray for all Lambda functions
    - Enable X-Ray for API Gateway
    - Configure X-Ray sampling rules
    - Instrument Bedrock, DynamoDB, and S3 SDK calls
    - _Requirements: 10.9_

- [ ] 14. Checkpoint - Testing and Validation
  - Run all unit tests and verify passing
  - Run all property-based tests and verify passing
  - Test end-to-end user workflows in development environment
  - Verify monitoring dashboards and alarms
  - Ensure all tests pass, ask the user if questions arise

- [ ] 15. Deployment Configuration
  - [ ] 15.1 Configure CDK deployment for development environment
    - Set up CDK context for dev environment
    - Configure environment-specific parameters (table names, bucket names)
    - Deploy CDK stack to development AWS account
    - Verify all resources created successfully
    - Output API Gateway endpoint URL
    - _Requirements: 8.8, 8.9, 8.10_

  - [ ] 15.2 Configure CDK deployment for production environment
    - Set up CDK context for prod environment
    - Configure production parameters with appropriate scaling
    - Enable provisioned concurrency for critical Lambda functions
    - Configure production API Gateway with custom domain
    - _Requirements: 8.8_

  - [ ] 15.3 Configure Next.js frontend deployment
    - Set up AWS Amplify Hosting for Next.js application
    - Configure build settings and environment variables
    - Set API Gateway URL in production environment variables
    - Configure custom domain for frontend
    - _Requirements: 10.1, 10.2_

  - [ ] 15.4 Create deployment documentation
    - Document CDK deployment commands
    - Document environment variable configuration
    - Document AWS account setup requirements
    - Document rollback procedures
    - _Requirements: 14.7_

- [ ] 16. AI Value Proposition Documentation
  - [ ] 16.1 Create AI value documentation
    - Explain why AI is required for personalized career guidance
    - Describe how Bedrock provides adaptive, context-aware advice
    - Describe how RAG grounds responses in verified career knowledge
    - Describe how AI Agents proactively identify skill gaps
    - Describe how AI analyzes job market trends for data-driven insights
    - Describe how AI enhances resumes for ATS optimization
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 16.2 Create architecture diagrams
    - Create high-level architecture diagram showing AWS services
    - Create data flow diagram for RAG system
    - Create sequence diagram for AI agent interactions
    - Include diagrams in documentation
    - _Requirements: 11.7_

  - [ ] 16.3 Document example use cases
    - Document career path planning use case
    - Document skill gap analysis use case
    - Document resume enhancement use case
    - Document job market analysis use case
    - Quantify AI benefits (time saved, accuracy improvements)
    - _Requirements: 11.8, 11.9_

  - [ ] 16.4 Document AWS GenAI capabilities
    - Explain how Bedrock enables features impossible with traditional approaches
    - Highlight RAG system accuracy and source grounding
    - Highlight AI Agent autonomous reasoning and tool use
    - Highlight scalability and reliability of AWS infrastructure
    - _Requirements: 11.10_

- [x] 17. Performance Testing and Optimization
  - [x] 17.1 Implement performance testing
    - Create load testing scripts for API Gateway endpoints
    - Test with 100 concurrent users
    - Measure response times for chat, learning path, RAG queries
    - Verify 95th percentile latency < 5 seconds for chat
    - _Requirements: 15.1, 15.3, 15.5_

  - [ ] 17.2 Optimize Lambda cold starts
    - Minimize Lambda package sizes
    - Implement lazy loading for dependencies
    - Configure provisioned concurrency for critical functions
    - Measure and document cold start improvements
    - _Requirements: 15.4_

  - [ ] 17.3 Implement connection pooling
    - Configure DynamoDB connection pooling in Lambda functions
    - Reuse AWS SDK clients across invocations
    - Monitor connection metrics
    - _Requirements: 15.8_

  - [ ] 17.4 Write property test for retry logic
    - **Property 30: Retry logic with exponential backoff**
    - **Validates: Requirements 15.9**

- [x] 18. Final Integration and Cleanup
  - [x] 18.1 Remove deprecated AI service code
    - Delete /api/gemini route and Gemini client code
    - Delete /api/ollama route and Ollama client code
    - Remove feature flag code after migration validation
    - Update documentation to reflect AWS-only implementation
    - _Requirements: 14.5_

  - [x] 18.2 Verify all requirements coverage
    - Review all 15 requirements and verify implementation
    - Test all acceptance criteria
    - Document any deviations or limitations
    - _Requirements: All_

  - [ ] 18.3 Create cost estimation documentation
    - Document estimated monthly costs for AWS services
    - Break down costs by service (Bedrock, Lambda, DynamoDB, S3)
    - Document cost optimization strategies implemented
    - Set up CloudWatch cost anomaly detection
    - _Requirements: 13.9, 13.10_

- [ ] 19. Final Checkpoint - Production Readiness
  - Verify all features functional with AWS Bedrock
  - Verify all tests passing (unit, property, integration)
  - Verify monitoring and alarms configured
  - Verify security best practices implemented
  - Verify documentation complete
  - Deploy to production environment
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and integration points
- Implementation uses TypeScript for consistency with Next.js codebase
- AWS CDK provides infrastructure as code for reproducible deployments
- Feature flags enable gradual migration from Gemini/Ollama to AWS Bedrock
- Security is implemented throughout with encryption, input sanitization, and least-privilege IAM
- Monitoring provides visibility into system health and performance
- Cost optimization balances performance with budget constraints
