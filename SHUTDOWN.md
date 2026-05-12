# SMEwise — Cost Management & Shutdown Guide

You have **$50 AWS credit** and are still in development. This guide helps you understand costs and pause/shutdown services to avoid burning through your budget.

---

## Monthly Cost Breakdown (if left running 24/7)

| Service | Estimated Monthly Cost | Notes |
|---------|----------------------|-------|
| **App Runner** | **~$30–50** | 1 vCPU + 2GB RAM. This is your biggest cost. Charges per second while instances are active. |
| CloudFront | $0–1 | Free tier covers 1TB/month. Minimal cost for dev traffic. |
| S3 | < $0.10 | ~1.4MB of static files. Negligible. |
| ECR | < $0.50 | ~147MB image storage. $0.10/GB/month. |
| Bedrock (per use) | Varies | Only charged when you invoke models. No idle cost. |
| **Total (idle)** | **~$30–50/month** | App Runner dominates the cost. |

**At $50 credit, App Runner alone will consume your budget in ~1 month if left running.**

---

## Priority: What to Shut Down First

### 1. PAUSE App Runner (saves ~$30–50/month) — DO THIS FIRST

App Runner is your only significant ongoing cost. Pause it when you're not actively testing the deployed app.

**Pause the service:**
```bash
aws apprunner pause-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile
```

**Resume when you need it again:**
```bash
aws apprunner resume-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile
```

**Use this to check if pause**
```bash
aws apprunner describe-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile --query "Service.Status" --output text
```

When paused:
- The service stops running (no compute charges)
- The URL returns an error page
- Your configuration and image are preserved
- Resume takes 3–5 minutes
- **You still pay for provisioned resources if any** — but the default auto-scaling config (min 1 instance) means pausing effectively stops all compute charges

### 2. Disable CloudFront Distribution (saves $0–1/month, optional)

CloudFront has generous free tier (1TB transfer, 10M requests/month). You likely won't be charged during development. Only disable if you want to fully shut down public access.

**Disable:**
```bash
# Get current config
aws cloudfront get-distribution-config --id EQSPWPK1S4VC6 --profile deploy-profile --query "DistributionConfig" --output json > tmp-cf-config.json

# Edit tmp-cf-config.json: change "Enabled": true → "Enabled": false

# Get ETag
aws cloudfront get-distribution-config --id EQSPWPK1S4VC6 --profile deploy-profile --query "ETag" --output text

# Update (replace <ETAG> with the value above)
aws cloudfront update-distribution --id EQSPWPK1S4VC6 --if-match <ETAG> --distribution-config file://tmp-cf-config.json --profile deploy-profile
```

**Re-enable:** Same process but set `"Enabled": true`.

### 3. S3 and ECR — Leave them (negligible cost)

- S3: < $0.10/month for your tiny static site
- ECR: < $0.50/month for one Docker image

Not worth the hassle of deleting and recreating.

---

## Full Shutdown (Delete Everything)

If you want to completely remove all resources and stop ALL charges:

```bash
# 1. Delete App Runner service
aws apprunner delete-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile

# 2. Disable CloudFront first (required before deletion)
#    Edit config to set Enabled=false, update, wait for "Deployed" status
#    Then delete:
aws cloudfront delete-distribution --id EQSPWPK1S4VC6 --if-match <ETAG> --profile deploy-profile

# 3. Empty and delete S3 bucket
aws s3 rm s3://smewise-web-prod-516769757910 --recursive --profile deploy-profile
aws s3 rb s3://smewise-web-prod-516769757910 --profile deploy-profile

# 4. Delete ECR repository and image
aws ecr delete-repository --repository-name smewise-server --region ap-southeast-1 --force --profile deploy-profile

# 5. Delete IAM roles
aws iam delete-role-policy --role-name smewise-apprunner-role --policy-name BedrockAccess --profile deploy-profile
aws iam delete-role --role-name smewise-apprunner-role --profile deploy-profile
aws iam detach-role-policy --role-name smewise-apprunner-ecr-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess --profile deploy-profile
aws iam delete-role --role-name smewise-apprunner-ecr-role --profile deploy-profile

# 6. Delete OAC
aws cloudfront delete-origin-access-control --id EJMDKP9B5C8VC --if-match ETVPDKIKX0DER --profile deploy-profile
```

---

## Recommended Development Workflow

To maximize your $50 credit:

1. **Develop locally** — Run `npm run dev` in both `client/` and `server/` for day-to-day development. This costs $0.
2. **Pause App Runner** when not actively testing the deployed version.
3. **Resume + deploy** only when you need to test the full cloud setup or demo to someone.
4. **Pause again** immediately after testing.

**Estimated budget with this workflow:**
- If you keep App Runner paused and only run it ~2 hours/day for testing:
  - App Runner: ~$2–4/month (charged per second of active time)
  - Everything else: < $1/month
  - **Total: ~$3–5/month** → your $50 lasts 10+ months

---

## Quick Commands Cheat Sheet

| Action | Command |
|--------|---------|
| Pause App Runner | `aws apprunner pause-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile` |
| Resume App Runner | `aws apprunner resume-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile` |
| Check App Runner status | `aws apprunner describe-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile --query "Service.Status" --output text` |
| Check health | `curl https://d21qwulue96ibi.cloudfront.net/api/health` |
