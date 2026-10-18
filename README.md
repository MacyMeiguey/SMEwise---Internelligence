# SMEwise — AI Business Assistant for Malaysian SMEs

Starting again after an expired AWS student lab? Follow [AWS_RESTART.md](AWS_RESTART.md)
for the page-by-page AWS inventory, account setup, and restoration order.
https://d21qwulue96ibi.cloudfront.net/ 


SMEwise is an AI-powered web application that provides personalised business guidance to Malaysian SME founders. It uses AWS Bedrock (Claude via Converse API for text generation, Nova Canvas for image generation, and schema-guided Converse calls for business planning).

---

## Project Structure

```
SMEwise/
├── client/          # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── test/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── server/          # Node.js + Express + TypeScript backend
│   ├── src/
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── .env.example     # Environment variable template
├── .gitignore
└── package.json     # Root workspace config
```

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v8 or later
- **AWS credentials** with Bedrock access (for Claude Converse, Nova Canvas, and business planning)

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd SMEwise
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` with your region, local AWS profile or credentials, and the tested
Bedrock model profile. Temporary credentials also require `AWS_SESSION_TOKEN`.
See the restart guide for profile-based authentication without static keys:

```env
AWS_PROFILE=smewise-showcase
AWS_REGION=us-east-1
BEDROCK_CONVERSE_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
```

> **Note:** The `.env` file is gitignored and should never be committed.

### 3. Install dependencies

```bash
npm install
```

This installs dependencies for both `client/` and `server/` via npm workspaces.

---

## Development

Run both the frontend and backend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Frontend only (http://localhost:5173)
npm run dev --workspace=client

# Backend only (http://localhost:3001)
npm run dev --workspace=server
```

The Vite dev server proxies `/api/*` requests to the Express backend automatically.

---

## Testing

```bash
# Run all tests
npm test

# Run client tests only
npm run test --workspace=client

# Run server tests only
npm run test --workspace=server
```

---

## Build

```bash
npm run build
```

---

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS        |
| Backend  | Node.js, Express, TypeScript                    |
| AI Text  | AWS Bedrock Converse API (Claude Haiku 4.5 default) |
| AI Image | Amazon Nova Canvas via AWS Bedrock              |
| Business planning | AWS Bedrock Converse with UI response contracts |
| Testing  | Vitest, Testing Library, fast-check (PBT)       |

---

## Theme

SMEwise uses a dark theme with purple/violet accents:

- **Backgrounds:** `gray-950` (root), `gray-900` (surfaces), `gray-800` (cards)
- **Primary accent:** `purple-500` / `purple-600`
- **Secondary accent:** `violet-600` / `violet-700`

---

## Environment Variables

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `AWS_PROFILE`          | Local AWS SSO/profile name; omit on deployed IAM roles |
| `AWS_ACCESS_KEY_ID`    | AWS access key ID for Bedrock                    |
| `AWS_SECRET_ACCESS_KEY`| AWS secret access key for Bedrock                |
| `AWS_REGION`           | AWS region (e.g., `us-east-1`)                   |
| `BEDROCK_CONVERSE_MODEL_ID` | Optional: override the Converse model       |
| `PORT`                 | Server port (optional, defaults to `3001`)       |
| `NODE_ENV`             | Environment (`development` or `production`)      |
