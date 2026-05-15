# SMEwise — How to Update the Application

This guide covers how to deploy code changes to the live application after modifying the frontend or backend.

## Prerequisites

- AWS SSO session active: `aws sso login --profile deploy-profile`
- Docker Desktop running (for backend updates)
- Verify your session: `aws sts get-caller-identity --profile deploy-profile`

---

## Updating the Frontend (React SPA)

When you modify any file in `client/src/`:

```bash
# 1. Build the production bundle
cd client
npm run build

# 2. Upload to S3 (replaces all files)
aws s3 sync dist s3://smewise-web-prod-516769757910 --delete --profile deploy-profile

# 3. Invalidate CloudFront cache so users see the new version immediately
aws cloudfront create-invalidation --distribution-id EQSPWPK1S4VC6 --paths "/*" --profile deploy-profile
```

The invalidation takes 1–2 minutes to propagate globally. Until then, some users may see the old version.

---

## Adding or Upgrading a Server Dependency

The repo uses npm workspaces (root `package.json` lists `client` and `server`), but the `server/Dockerfile` runs `npm ci` against a standalone `server/package-lock.json`. Both lockfiles need to stay in sync, otherwise the Docker build will fail with `npm error code EUSAGE — npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync`.

When adding or upgrading any package in `server/package.json`, run from inside `server/`:

```bash
# Add a new dependency
npm install --workspaces=false <package-name>

# Upgrade an existing dependency
npm install --workspaces=false <package-name>@<version>

# Or, after editing server/package.json by hand, refresh the lockfile only
npm install --workspaces=false --package-lock-only
```

The `--workspaces=false` flag stops npm from walking up to the root and using the workspaces lockfile — it forces npm to write a standalone `server/package-lock.json` based purely on `server/package.json`.

Then commit both files together:

```bash
git add server/package.json server/package-lock.json
git commit -m "deps: bump <package>"
```

After that, the standard backend deploy steps below will succeed.

---

## Updating the Backend (Express Server)

When you modify any file in `server/src/`:

```bash
# 1. Re-authenticate Docker to ECR (token expires after 12 hours)
aws ecr get-login-password --region ap-southeast-1 --profile deploy-profile | docker login --username AWS --password-stdin 516769757910.dkr.ecr.ap-southeast-1.amazonaws.com

# 2. Build the new Docker image
docker build -t smewise-server ./server

# 3. Tag and push to ECR
docker tag smewise-server:latest 516769757910.dkr.ecr.ap-southeast-1.amazonaws.com/smewise-server:latest
docker push 516769757910.dkr.ecr.ap-southeast-1.amazonaws.com/smewise-server:latest

# 4. Trigger a new deployment on App Runner
aws apprunner start-deployment --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile
```

App Runner will pull the new image and deploy it. This takes 3–5 minutes. The old version continues serving traffic until the new one passes health checks.

### Check deployment status

```bash
aws apprunner describe-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile --query "Service.Status" --output text
```

Wait until it returns `RUNNING`.

---

## Updating Both Frontend and Backend

Run the backend steps first (since the frontend may depend on new API endpoints), wait for App Runner to reach `RUNNING`, then deploy the frontend.

---

## Updating Environment Variables

If you need to add or change environment variables on the server:

1. Go to **AWS Console** → **App Runner** → `smewise-server` → **Configuration** → **Edit**
2. Modify the environment variables
3. Click **Save and deploy**

Or via CLI (replace/add variables as needed):

```bash
aws apprunner update-service --service-arn "arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7" --region ap-southeast-1 --profile deploy-profile --source-configuration "{\"ImageRepository\":{\"ImageIdentifier\":\"516769757910.dkr.ecr.ap-southeast-1.amazonaws.com/smewise-server:latest\",\"ImageConfiguration\":{\"Port\":\"3001\",\"RuntimeEnvironmentVariables\":{\"NODE_ENV\":\"production\",\"PORT\":\"3001\",\"AWS_REGION\":\"ap-southeast-1\",\"CORS_ORIGIN\":\"https://d21qwulue96ibi.cloudfront.net\",\"NEW_VAR\":\"value\"}},\"ImageRepositoryType\":\"ECR\"},\"AutoDeploymentsEnabled\":false,\"AuthenticationConfiguration\":{\"AccessRoleArn\":\"arn:aws:iam::516769757910:role/smewise-apprunner-ecr-role\"}}"
```

---

## Quick Reference

| Resource | Identifier |
|----------|-----------|
| S3 Bucket | `smewise-web-prod-516769757910` |
| ECR Repository | `516769757910.dkr.ecr.ap-southeast-1.amazonaws.com/smewise-server` |
| App Runner Service ARN | `arn:aws:apprunner:ap-southeast-1:516769757910:service/smewise-server/9e0c756210c94c98a85979e0ec7476f7` |
| App Runner URL | `https://gimne2mbx2.ap-southeast-1.awsapprunner.com` |
| CloudFront Distribution ID | `EQSPWPK1S4VC6` |
| CloudFront Domain | `https://d21qwulue96ibi.cloudfront.net` |
| AWS Region | `ap-southeast-1` |
| AWS Profile | `deploy-profile` |

---

## Verification After Update

```bash
# Check API health
curl https://d21qwulue96ibi.cloudfront.net/api/health

# Should return: {"status":"ok"}
```

Then open `https://d21qwulue96ibi.cloudfront.net` in your browser to verify the frontend.
