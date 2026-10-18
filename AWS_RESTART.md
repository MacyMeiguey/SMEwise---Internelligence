# SMEwise showcase AWS restart

Updated 18 October 2026. This guide replaces the earlier agent-recreation plan.

## Current setup

- AWS SSO profile: `smewise-showcase`.
- Account: `781897846709` (ETA-Sandbox-38 / Internelligence).
- Assigned permission set: `myisb_IsbUsersPS`.
- Bedrock region: `us-east-1` (N. Virginia).
- Tested model profile: `us.anthropic.claude-haiku-4-5-20251001-v1:0`.
- A real Converse smoke call returned `OK`, using 12 input and 4 output tokens.
- Local onboarding returned `{ "result": "pass" }` for a sample business profile.
- All 16 business features now use direct Bedrock model calls. No agent IDs or
  aliases are required. The assistant uses ConverseStream and the existing SSE API.
- No persistent hosting resources or new agent were created. The unused IAM role
  created during the failed agent attempt was removed with its inline policy.

## Why the architecture changed

The original app depended on 16 Amazon Bedrock Agents Classic configurations.
AWS stopped admitting new Agents Classic customers on 30 July 2026. This new
sandbox returned the maintenance-mode AccessDeniedException on CreateAgent.
This restriction is separate from the assigned user's permissions: direct Haiku
inference succeeded. The old agent IDs cannot be recreated in this account.

The app now assembles feature instructions and JSON response contracts locally,
then calls Bedrock Converse. Contracts are generated from the actual widget types.
The existing frontend API URLs and response envelopes are preserved. This
reconstructs business planning behavior; it does not recover the old agents'
private instructions, action groups, knowledge bases, or externally sourced data.

For this single-request planning workflow, direct model calls avoid deploying a
separate orchestration runtime. If the product later needs external tools or
managed agent orchestration, assess AgentCore as a separate integration.

## Sandbox limits from the invitation

| Setting | Value |
| --- | --- |
| SSO portal | https://eliteacademy.awsapps.com/start |
| Sandbox portal | https://aws-sandbox.eliteacademy.id |
| Initial shared team credit | $20; check the current balance in the portal |
| Alert / freeze | $4 remaining / $2 remaining |
| Explicit expiry | 1 November 2026; resources deleted on expiry |
| Showcase | 20 October 2026 |
| Allowed service regions | us-east-1, us-west-2, ap-southeast-1, ap-southeast-3, ap-southeast-5 |
| Model restrictions | Sonnet and Opus blocked; Haiku permitted |

The invitation also says 30 days; plan around its explicit expiry and clarify any
conflicting portal date with the administrator. Credit is shared by the whole
team. Save the code, configuration templates and presentation evidence before
expiry. Do not commit passwords, access keys, session tokens, or SSO cache files.

The tested US inference profile lists model destinations in us-east-1, us-east-2,
and us-west-2. Although Ohio is not a general sandbox service region, the direct
profile invocation succeeded under the sandbox's current rules. Keep service
creation in the allowed regions and use the tested profile; do not assume another
geo/global profile has equivalent permissions.

## Run the repo locally

Dependencies have been installed. `server/.env` and `client/.env` were created
from their examples, and Git ignores both files. The server uses these settings:

```env
AWS_PROFILE=smewise-showcase
AWS_REGION=us-east-1
BEDROCK_CONVERSE_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
```

Leave `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` empty
when using SSO. Leave the client's `VITE_API_BASE_URL` empty for the local proxy.
No root-level `.env` or agent ID configuration is needed.

From PowerShell in the repository root:

```powershell
aws sso login --profile smewise-showcase
aws sts get-caller-identity --profile smewise-showcase
npm.cmd run dev
```

Confirm the identity command returns account `781897846709` before calling AWS.
Open http://localhost:5173. The backend runs on port 3001. Health is available at
http://localhost:3001/api/health; it proves process readiness, not model access.

For a new checkout, run `npm.cmd ci` and copy the two `.env.example` files only if
the destination files do not already exist. Preserve existing local settings.

If the SSO profile needs to be recreated:

```powershell
aws configure sso --profile smewise-showcase
```

Use the supplied SSO portal URL, the SSO directory region shown in the portal's
Access keys panel, registration scope `sso:account:access`, the account and role
above, default client region `us-east-1`, and JSON output. The SSO directory region
can differ from the Bedrock service region. Do not guess it or create root keys.

## Every page and its backend dependencies

All listed feature paths are under `/api/bedrock/`.

| Frontend route | Feature endpoints |
| --- | --- |
| `/` | Static landing page |
| `/onboarding` | `profile-verification` |
| `/workspace/overview` | Reads browser caches; mounted dashboard starts Operations, Financial and Marketing generation |
| `/workspace/operations` | `startup`, `office-location`, `risk-analyzer` |
| `/workspace/financial` | `fund-allocation`, `revenue-projection`, `loans-funding`, `investor-funding` |
| `/workspace/pricing` | `competitor-pricing`, `smart-pricing`; local pricing history |
| `/workspace/marketing` | `marketing`, `marketing-guidelines`, `marketing-forecast` |
| `/workspace/owner` | `analytics-dashboard`, `document-generator` |
| Workspace assistant panel | `assistant`, streamed over SSE |

Fund Allocation feeds Revenue and Marketing. Marketing Strategy feeds Guidelines
and Forecast. The workspace's automatic pipeline makes multiple model calls on a
fresh profile; avoid repeatedly clearing caches or generating everything while
sharing the team's remaining credit. Structured generation is limited to two
concurrent model calls and validates JSON against the widget contracts.

Business profiles, widget results and pricing history are stored in browser
localStorage. They do not sync across devices or site domains. The assistant keeps
up to three prior conversation turns in bounded process memory with a ten-minute
idle expiry. Restarting the server loses that conversation memory.

Other existing endpoints:

- `/api/bedrock/converse/complete` and `/stream`: direct text calls.
- `/api/document/generate`: legacy direct document endpoint; Owner Tools uses the
  separate `/api/bedrock/document-generator` endpoint.
- `/api/nova`: Nova Canvas endpoint. ProductVisualWidget is not mounted in the
  current dashboard, and its `/api/nova/image` URL does not match this server
  route. Reconcile the route before enabling product images.

The current app does not require Cognito, DynamoDB, RDS, Lambda or API Gateway.
It has no application login system or connected live market/research tools.
Generated prices, projections and analytics are planning estimates. Verify funding
availability, competitor data and official requirements against current sources.

## Verification and maintenance

```powershell
npm.cmd run build
npm.cmd run test --workspace=server
```

Contracts are checked into `server/src/bedrock/contracts.ts`. When changing a
widget's output interface, regenerate and rebuild:

```powershell
node scripts/generate-bedrock-contracts.mjs
npm.cmd run build --workspace=server
```

For a live endpoint smoke check against the running local server:

```powershell
node scripts/check-bedrock.mjs
```

This invokes the real model for each business feature and uses shared credit.
Do not run it repeatedly as a routine unit test. It checks response contracts,
allocation totals, twelve aligned forecast months and the assistant's SSE output.
Do not edit watched backend source files during the live check: the dev server
will restart and interrupt requests. `SMEWISE_CHECK_SKIP` accepts a comma-separated
list of already-verified features when resuming an interrupted check.

The small standalone model smoke request is in `scripts/aws/haiku-smoke.json`:

```powershell
aws bedrock-runtime converse --profile smewise-showcase --region us-east-1 --cli-input-json file://scripts/aws/haiku-smoke.json
```

## Hosting later

For the shared-credit showcase, run frontend and backend on the laptop first.
Persistent hosting is a separate decision after checking the actual remaining
credit and presentation requirements.

`DEPLOYMENT.md` is a legacy App Runner reference. App Runner stopped accepting new
customers on 30 April 2026. A supported alternative for later evaluation is ECR
plus ECS Express Mode for the API and private S3 plus CloudFront for the frontend.
That adds compute/load-balancer costs; the old App Runner cost estimate does not
apply. A deployed backend needs a task role for model invocation, not local SSO
cache files or static access keys. Review application access controls and request
limits before exposing a paid generation API publicly.

## Official references

- [Agents Classic maintenance mode](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-classic-maintenance-mode.html)
- [Haiku 4.5 model support](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)
- [CLI SSO configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [App Runner availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)
- [ECS Express Mode resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html)
