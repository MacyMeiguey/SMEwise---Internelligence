# SMEwise AWS Deployment Implementation Plan

**Goal:** Deploy the current SMEwise frontend and backend to ETA-Sandbox-38, account `781897846709`.

**Approved architecture:** Private S3 frontend origin and App Runner backend behind one CloudFront HTTPS domain; ECR stores the backend image. Use Singapore (`ap-southeast-1`) where sandbox policy permits. Keep Bedrock configuration aligned with the existing model and harness regions.

**Constraints:** Preserve existing local changes. Never upload `.env` or static AWS credentials. Authenticate locally with IAM Identity Center. Attach an application IAM role with only the Bedrock and AgentCore actions required by the app. Verify permissions before creating resources; do not change sandbox guardrails.

## 1. Local prerequisites and authentication

- [x] Confirm AWS CLI and Docker CLI are installed.
- [x] Check AWS identity: CLI reports no credentials; browser login alone is insufficient.
- [x] Check Docker: Linux engine pipe is unavailable.
- [x] Start Docker Desktop and wait for `docker info` to succeed.
- [ ] Run `aws configure sso --profile sandbox38` with portal `https://eliteacademy.awsapps.com/start/`, SSO region `ap-southeast-1`, account `781897846709`, and assigned role `myisb_IsbUsersPS`. Use default client region `ap-southeast-1` and output `json`.
- [x] Run `aws sso login --profile sandbox38` and finish browser authorization (temporary `AWS_CONFIG_FILE`, no repository credentials).
- [x] Verify `aws sts get-caller-identity --profile sandbox38` returns the approved account.
- [x] Inspect existing S3, CloudFront, App Runner, ECR, and IAM resources before creating duplicates.

## 2. Build and package

- [x] Build client and server using the bundled Node runtime if the user's nvm shim is unavailable.
- [x] Build the server image using `server/Dockerfile`; run it locally with an IAM-compatible environment and verify `/api/health`.
- [x] Confirm the Docker context excludes `.env` and credentials.

## 3. Deploy backend

- [x] Reuse or create a dedicated ECR repository and push the verified image with an explicit version tag.
- [x] Prepare narrowly scoped ECR pull and backend execution roles; review their exact policies before applying any access changes.
- [x] Configure App Runner port `3001`, HTTP health check `/api/health`, `NODE_ENV=production`, and required region/model/harness configuration. Do not copy AWS keys into service variables.
- [ ] Wait for Running and verify the HTTPS health endpoint.

## 4. Deploy frontend and routing

- [ ] Create or reuse a private S3 bucket with public access blocked; upload `client/dist` only.
- [ ] Configure CloudFront Origin Access Control for the S3 origin.
- [ ] Route `/api/*` to App Runner over HTTPS with caching disabled, all required methods enabled, and an origin request policy that excludes the viewer Host header.
- [ ] Rewrite frontend navigation paths to `/index.html` at viewer request time, excluding `/api/*` and asset paths. Avoid distribution-wide error rewriting that masks API errors.
- [ ] Set the backend's allowed browser origin to the CloudFront URL.
- [ ] Wait for CloudFront deployment, then verify homepage, direct navigation, static assets, `/api/health`, an API error, and an authorized Bedrock request.

## Completion evidence

Record resource identifiers, region, image tag, public HTTPS URL, verification results, and teardown instructions after successful deployment. Do not describe the app as deployed until the public URL and backend checks pass.

## Findings during preparation

- Use the root workspace lockfile for the backend container; the legacy server-only lockfile omits AgentCore.
- Docker Hub TLS requests timed out; the AWS Public ECR Node 22 mirror builds successfully.
- Build with `--provenance=false` to publish one architecture manifest compatible with App Runner.
- Patched `proxy-addr`, `body-parser`, and related dependencies through compatible lockfile updates. The pruned production audit reports one remaining moderate `qs` advisory and no critical/high findings.
- AWS reports the legacy Nova Canvas v1 model as end of life. Image-generation migration is a separate feature change; do not claim it passed verification.
