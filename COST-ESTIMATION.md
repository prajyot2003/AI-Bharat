# Navixa AWS Cost Estimation

## Monthly Cost Breakdown (Estimated)

Assuming: **1,000 daily active users**, 10 AI interactions/day each = 10,000 AI requests/day.

---

### Amazon Bedrock

| Model | Use Case | Avg Tokens (in/out) | Daily Calls | Monthly Cost |
|-------|----------|---------------------|-------------|--------------|
| Claude 3 Haiku | Chat, RAG answers | 500 in / 300 out | 7,000 | ~$12 |
| Claude 3 Sonnet | Learning paths, complex analysis | 1,000 in / 800 out | 3,000 | ~$45 |
| **Total Bedrock** | | | 10,000/day | **~$57/month** |

*Pricing: Haiku $0.00025/1K input tokens, $0.00125/1K output. Sonnet $0.003/$0.015.*

### AWS Lambda

| Function | Avg Duration | Memory | Invocations/mo | Cost |
|----------|-------------|--------|----------------|------|
| bedrock-request | 2s | 512 MB | 210,000 | ~$2.50 |
| rag-query | 3s | 512 MB | 90,000 | ~$1.60 |
| ai-agent | 4s | 512 MB | 60,000 | ~$1.40 |
| resume-processing | 5s | 512 MB | 30,000 | ~$0.90 |
| job-data | 1s | 512 MB | 60,000 | ~$0.35 |
| learning-path | 3s | 512 MB | 60,000 | ~$1.00 |
| **Total Lambda** | | | 510,000 | **~$7.75/month** |

*First 1M requests/month free. 400,000 GB-seconds/month free.*

### API Gateway

| Tier | Calls/month | Cost |
|------|-------------|------|
| REST API calls | 300,000 | ~$1.05 |
| Data transfer out | ~5 GB | ~$0.45 |
| **Total API GW** | | **~$1.50/month** |

### DynamoDB

| Table | Operations/mo | Storage | Cost |
|-------|--------------|---------|------|
| ChatSessions | 600,000 reads + writes | ~500 MB | ~$0.60 |
| UserProfiles | 120,000 reads + writes | ~200 MB | ~$0.15 |
| LearningPaths | 180,000 reads + writes | ~300 MB | ~$0.20 |
| RAGQueryCache | 600,000 reads + writes | ~1 GB | ~$0.65 |
| **Total DynamoDB** | | | **~$1.60/month** |

*25 GB free storage and 25 WCU/25 RCU always free.*

### Amazon S3

| Bucket | Storage | Requests | Cost |
|--------|---------|----------|------|
| Resume documents | ~10 GB | 30,000 | ~$0.45 |
| Knowledge base | ~1 GB | 60,000 | ~$0.05 |
| **Total S3** | | | **~$0.50/month** |

### CloudWatch

| Service | Usage | Cost |
|---------|-------|------|
| Logs ingestion (10 GB) | Lambda + API GW logs | ~$5.00 |
| Dashboard (1) | Basic monitoring | ~$3.00 |
| Alarms (14) | Lambda + API alarms | ~$4.20 |
| **Total CloudWatch** | | **~$12.20/month** |

---

## Total Monthly Estimate

| Service | Monthly Cost |
|---------|-------------|
| Amazon Bedrock | $57.00 |
| AWS Lambda | $7.75 |
| API Gateway | $1.50 |
| DynamoDB | $1.60 |
| S3 | $0.50 |
| CloudWatch | $12.20 |
| SNS (alerts) | ~$0.10 |
| **TOTAL** | **~$80.65/month** |

**Per user: ~$0.08/month** (very cost-effective)

---

## Cost Optimization Strategies Implemented

1. **Intelligent Model Selection**: Simple queries use Claude 3 Haiku (~16× cheaper than Sonnet). Only complex requests (learning paths, detailed analysis) use Sonnet. **Estimated savings: 60%** vs using Sonnet for all requests.

2. **DynamoDB Caching**: RAG responses and job market data cached with 1-hour TTL. Identical queries served from cache at ~0.01× the cost of a Bedrock call. **Estimated savings: 40%** on RAG calls.

3. **Lambda Memory Tuning**: 512 MB default (can be tuned after profiling with CloudWatch metrics). AWS Lambda pricing is proportional to GB-seconds, so right-sizing is critical.

4. **S3 Lifecycle Policies**: Resumes automatically archived to Glacier after 365 days (10× cheaper storage).

5. **API Gateway Caching**: GET responses cacheable at API Gateway layer (5-minute TTL) to reduce Lambda invocations.

## Setting Up Cost Anomaly Detection

```bash
# Create a cost anomaly monitor for the Navixa project
aws ce create-anomaly-monitor --anomaly-monitor '{
  "MonitorName": "NavixaAnomalyMonitor",
  "MonitorType": "DIMENSIONAL",
  "MonitorDimension": "SERVICE"
}'

# Create an alert for costs exceeding $20/day
aws ce create-anomaly-subscription --anomaly-subscription '{
  "SubscriptionName": "NavixaCostAlert",
  "MonitorArnList": ["YOUR_MONITOR_ARN"],
  "Subscribers": [{"Address": "your@email.com", "Type": "EMAIL"}],
  "Threshold": 20,
  "Frequency": "DAILY"
}'
```
