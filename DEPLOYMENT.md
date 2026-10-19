# SMEwise — AWS Deployment Guide (S3 + CloudFront + App Runner)

## Automated Sandbox-38 deployment

The current deployment is defined in `deployment/hosting.yaml` and
`deployment/deploy.ps1`. It targets account `781897846709` in Singapore
(`ap-southeast-1`), with a private S3 bucket, CloudFront, and a single App Runner
instance. The IAM policies name the application's configured agents and harnesses.

Authenticate with IAM Identity Center using the Elite Academy portal, then verify
`aws sts get-caller-identity --profile sandbox38` before deployment. If the CLI
profile is stored in a temporary config file, set `AWS_CONFIG_FILE` to that file
for each shell session. Never put AWS credentials in this repository or the image.

From the repository root, build with:

```powershell
docker build --provenance=false --platform linux/amd64 -f server/Dockerfile -t smewise-server:20261019 .
```

Build the frontend from `client/` so Vite loads the correct Tailwind configuration.
After checking the local container's `/api/health`, run:

```powershell
./deployment/deploy.ps1 -Profile sandbox38 -LocalImage smewise-server:20261019
```

The dedicated `smewise-server` ECR repository must already exist. Each upload uses
an immutable version tag. The script checks the account, uploads the image,
deploys the hosting stack, uploads the frontend, configures its browser origin,
and invalidates CloudFront. It records resource identifiers in
`deployment/deployed-resources.json` after successful infrastructure deployment.
Verify the public website, direct frontend navigation, API health, API errors,
and an AI request separately before considering deployment complete.

The template uses the tested `global.anthropic.claude-sonnet-4-6` inference profile
through the Singapore Bedrock endpoint. AWS reports the older Sonnet 4 model as
end of life even though its inference-profile metadata still says active.
The legacy Nova Canvas model `amazon.nova-canvas-v1:0` was reported as end of life
by AWS during preparation on 2026-10-19; the existing image-generation endpoint
requires a separate supported-model migration. `NOVA_REGION` configures the image
endpoint independently from the Singapore agent endpoints.

To stop hosting charges after a demo, pause the App Runner service. App Runner
does not automatically scale its provisioned instances to zero. To remove hosting,
review and delete the `smewise-hosting` stack; its frontend bucket is deliberately
retained, and the separately created ECR repository is also retained. Do not
delete the sandbox's existing Bedrock resources or organization-managed stacks.

The following manual walkthrough is a reference; use the current template for
exact policies, region configuration, and safe SPA/API routing.

This guide walks you through deploying the SMEwise application on AWS using the
AWS Management Console. The architecture puts both the React SPA and the Express
API behind a single CloudFront distribution so the browser makes same-origin
requests (no CORS issues, no hardcoded URLs).

```
         ┌──────────── CloudFront (single HTTPS domain) ────────────┐
         │                                                           │
 user ──►│  "/*"  (default)  →  S3 bucket (client/dist)             │
         │  "/api/*"         →  App Runner (Express server)          │
         └───────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- An AWS account with admin access (or at least IAM, S3, CloudFront, ECR,
  App Runner, and Bedrock permissions).
- AWS CLI v2 installed and configured (`aws configure`).
- Docker Desktop installed (for building the server image).
- Node.js 20+ and npm installed locally.

---

## Part 1 — Build the Client (React SPA)

```bash
cd client
npm ci
npm run build
```

This produces `client/dist/` containing `index.html` and hashed assets.

---

## Part 2 — Create an S3 Bucket for the SPA

1. Open **S3** in the AWS Console.
2. Click **Create bucket**.
   - Bucket name: `smewise-web-prod` (must be globally unique — adjust if taken).
   - Region: `ap-southeast-1` for Sandbox-38. CloudFront is a global service.
   - **Block all public access**: ✅ Keep enabled (CloudFront will access it
     privately via Origin Access Control).
3. Click **Create bucket**.

### Upload the build

```bash
aws s3 sync client/dist s3://smewise-web-prod --delete
```

Or use the S3 Console → Upload.

---

## Part 3 — Push the Server Docker Image to ECR

### 3.1 Create an ECR repository

1. Open **ECR** (Elastic Container Registry) in the Console.
2. Click **Create repository**.
   - Visibility: Private.
   - Name: `smewise-server`.
3. Click **Create**.

### 3.2 Build and push

Replace `<ACCOUNT_ID>` with your 12-digit AWS account ID and adjust the region
if needed.

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build the image (run from the repo root)
docker build --platform linux/amd64 -f server/Dockerfile -t smewise-server .

# Tag and push
docker tag smewise-server:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smewise-server:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smewise-server:latest
```

---

## Part 4 — Create an IAM Role for App Runner

The server needs permissions to call Bedrock. Instead of baking AWS keys into
environment variables, attach an IAM role.

1. Open **IAM** → **Roles** → **Create role**.
2. Trusted entity: **AWS service** → **App Runner**.
   - If App Runner isn't listed, choose "Custom trust policy" and paste:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
         "Action": "sts:AssumeRole"
       }]
     }
     ```
3. Attach a policy with these permissions (create an inline policy or a custom
   managed policy):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel",
           "bedrock:InvokeModelWithResponseStream",
           "bedrock:InvokeAgent"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
4. Name the role: `smewise-apprunner-role`.
5. Click **Create role**.

Also create an **ECR access role** for App Runner to pull images:

1. IAM → Roles → Create role.
2. Trusted entity: **AWS service** → **App Runner** (use case: App Runner – ECR access).
   - Trust policy principal: `build.apprunner.amazonaws.com`
3. Attach the AWS-managed policy: `AWSAppRunnerServicePolicyForECRAccess`.
4. Name: `smewise-apprunner-ecr-role`.

---

## Part 5 — Deploy the Server on App Runner

1. Open **App Runner** in the Console → **Create service**.
2. Source:
   - Repository type: **Container registry** → **Amazon ECR**.
   - Image URI: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smewise-server:latest`
   - ECR access role: select `smewise-apprunner-ecr-role`.
   - Deployment trigger: Manual (or Automatic if you want CI/CD).
3. Configure service:
   - Service name: `smewise-server`
   - CPU: 1 vCPU, Memory: 2 GB (adjust as needed)
   - Port: `3001`
   - Environment variables:
     | Key | Value |
     |-----|-------|
     | `NODE_ENV` | `production` |
     | `PORT` | `3001` |
     | `AWS_REGION` | `us-east-1` |
     | `BEDROCK_AGENT_ID` | *(your agent ID, e.g. HOG3CDST5J)* |
     | `BEDROCK_AGENT_ALIAS_ID` | *(your alias ID, e.g. UBOYDO9UHN)* |
     | `CORS_ORIGIN` | *(leave empty for now — fill after CloudFront is created)* |
   - **Do NOT set** `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` — the IAM
     role handles this.
4. Security:
   - Instance role: select `smewise-apprunner-role`.
5. Health check:
   - Protocol: HTTP
   - Path: `/api/health`
   - Interval: 10s, Timeout: 5s
6. Click **Create & deploy**.

Wait for the service to reach **Running** status. Note the default domain:
`https://xxxxxxxx.<region>.awsapprunner.com` — you'll need this for CloudFront.

---

## Part 6 — Create a CloudFront Distribution

### 6.1 Create the distribution

1. Open **CloudFront** → **Create distribution**.

2. **Origin 1 — S3 (SPA)**:
   - Origin domain: select your S3 bucket `smewise-web-prod.s3.us-east-1.amazonaws.com`.
   - Origin access: **Origin access control settings (recommended)**.
     - Click **Create new OAC** → Name: `smewise-s3-oac` → Sign requests: Yes → Create.
   - Leave everything else default.

3. Click **Add origin** to add **Origin 2 — App Runner (API)**:
   - Origin domain: paste the App Runner domain (without `https://`), e.g.
     `xxxxxxxx.us-east-1.awsapprunner.com`.
   - Protocol: **HTTPS only**.
   - Minimum origin SSL protocol: TLSv1.2.

4. **Default cache behavior** (for the S3 origin):
   - Path pattern: `Default (*)`.
   - Origin: S3 origin.
   - Viewer protocol policy: **Redirect HTTP to HTTPS**.
   - Allowed HTTP methods: **GET, HEAD**.
   - Cache policy: `CachingOptimized` (or create one with 86400s default TTL).
   - Response headers policy: (optional) `SecurityHeadersPolicy`.

5. Click **Create behavior** to add the **API behavior**:
   - Path pattern: `/api/*`
   - Origin: App Runner origin.
   - Viewer protocol policy: **Redirect HTTP to HTTPS**.
   - Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**.
   - Cache policy: **CachingDisabled**.
   - Origin request policy: **AllViewerExceptHostHeader** (the origin must receive its own Host header).
   - Response headers policy: None.

6. **Settings**:
   - Default root object: `index.html`.
   - Price class: choose based on your budget (Use all edge locations, or just
     North America + Europe).

7. Click **Create distribution**.

### 6.2 Update the S3 bucket policy

After creating the distribution, CloudFront shows a banner asking you to update
the S3 bucket policy. Click **Copy policy** and apply it:

1. Go to **S3** → `smewise-web-prod` → **Permissions** → **Bucket policy**.
2. Paste the policy CloudFront generated (it grants `s3:GetObject` to the
   CloudFront distribution's OAC).
3. Save.

### 6.3 Configure SPA fallback (custom error responses)

React Router navigation needs `index.html`. Associate the viewer-request
CloudFront function from `deployment/hosting.yaml` with the default frontend
behavior. It rewrites extensionless HTML navigation requests while preserving
asset paths and `/api/*` errors. Do not configure distribution-wide 403/404
rewrites, because those can turn API failures into misleading HTML success pages.

### 6.4 Update App Runner CORS_ORIGIN

Now that you have the CloudFront domain (e.g. `https://d1234abcdef.cloudfront.net`):

1. Go back to **App Runner** → your service → **Configuration** → **Edit**.
2. Set `CORS_ORIGIN` to your CloudFront domain (e.g.
   `https://d1234abcdef.cloudfront.net`).
3. Save and deploy.

---

## Part 7 — Verify the Deployment

1. Wait for the CloudFront distribution status to change to **Deployed** (takes
   5–15 minutes).
2. Open `https://<your-cloudfront-domain>/` — you should see the SMEwise app.
3. Open `https://<your-cloudfront-domain>/api/health` — should return
   `{"status":"ok"}`.
4. Test a widget that calls the API (e.g. generate a business summary).

---

## Part 8 — Updating the App

### Client updates

```bash
cd client
npm run build
aws s3 sync dist s3://smewise-web-prod --delete
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### Server updates

```bash
docker build --platform linux/amd64 -f server/Dockerfile -t smewise-server .
docker tag smewise-server:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smewise-server:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smewise-server:latest
```

Then in App Runner Console → your service → **Deploy** (or it auto-deploys if
you enabled automatic deployment).

---

## Part 9 — Optional: Custom Domain + HTTPS

1. **Request a certificate** in **ACM** (AWS Certificate Manager):
   - Region: **us-east-1** (required for CloudFront).
   - Domain: `app.smewise.example.com` (or your domain).
   - Validation: DNS (add the CNAME record ACM gives you).
2. In CloudFront → your distribution → **General** → **Edit**:
   - Alternate domain name (CNAME): `app.smewise.example.com`.
   - Custom SSL certificate: select the ACM cert.
3. In your DNS provider (Route 53 or external):
   - Add a CNAME or Alias record: `app.smewise.example.com` →
     `d1234abcdef.cloudfront.net`.

---

## Part 10 — Important Notes for SSE Streaming

Your app uses Server-Sent Events (SSE) for `/api/claude/stream`. To ensure
streaming works through CloudFront:

- The `/api/*` behavior must have **caching disabled** (already done above).
- Do **not** enable response compression on the `/api/*` behavior — compression
  can buffer SSE chunks.
- App Runner supports streaming responses natively, so no extra config needed
  on that side.

If you ever see streaming responses arriving in large batches instead of
token-by-token, check that no intermediate layer is buffering (WAF rules,
Lambda@Edge, etc.).

---

## Architecture Summary

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| React SPA | S3 + CloudFront | Static hosting with global CDN |
| Express API | App Runner + ECR | Containerised Node.js server |
| AI Models | Bedrock (Nova Canvas) | Image generation |
| AI Models | Bedrock Agent | Marketing plan generation |
| AI Chat | Bedrock Converse API | Claude streaming responses via Bedrock |
| CDN + Routing | CloudFront | Single domain, path-based routing |
| Auth to AWS | IAM Role | No static keys in production |

---

## Cost Estimate (approximate)

| Service | Estimated monthly cost |
|---------|----------------------|
| S3 | < $1 (small static site) |
| CloudFront | $0–5 (depends on traffic, first 1TB/month free tier) |
| App Runner (1 vCPU, 2GB) | Provisioned memory and active compute charges; pause after demos |
| ECR | < $1 (image storage) |
| Bedrock | Pay-per-use (varies by model and volume) |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 403 on SPA routes | Add custom error responses (403 → /index.html, 200) |
| API returns 502 | Check App Runner logs; ensure PORT=3001 matches |
| CORS errors in browser | Verify CORS_ORIGIN env var matches CloudFront domain exactly |
| SSE streaming buffered | Disable compression on /api/* behavior; ensure CachingDisabled |
| Bedrock access denied | Verify the IAM role has bedrock:InvokeModel permission |
| Images not generating | Ensure the Bedrock model (Nova Canvas) is enabled in your region |
