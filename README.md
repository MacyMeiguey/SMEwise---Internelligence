# SMEwise — AI Business Assistant for Malaysian SMEs
https://d21qwulue96ibi.cloudfront.net/ 


SMEwise is an AI-powered web application that provides personalised business guidance to Malaysian SME founders. It uses AWS Bedrock (Claude via Converse API for text generation, Nova Canvas for image generation, and Bedrock Agents for marketing plans).

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
- **AWS credentials** with Bedrock access (for Claude Converse, Nova Canvas, and Bedrock Agents)

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd SMEwise
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys:

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
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
| AI Text  | AWS Bedrock Converse API (Claude Sonnet 4)      |
| AI Image | Amazon Nova Canvas via AWS Bedrock              |
| AI Agent | AWS Bedrock Agents (Marketing Plan)             |
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
| `AWS_ACCESS_KEY_ID`    | AWS access key ID for Bedrock                    |
| `AWS_SECRET_ACCESS_KEY`| AWS secret access key for Bedrock                |
| `AWS_REGION`           | AWS region (e.g., `us-east-1`)                   |
| `BEDROCK_CONVERSE_MODEL_ID` | Optional: override the Converse model       |
| `BEDROCK_AGENT_ID`     | Bedrock Agent ID for marketing plans             |
| `BEDROCK_AGENT_ALIAS_ID` | Bedrock Agent Alias ID                         |
| `PORT`                 | Server port (optional, defaults to `3001`)       |
| `NODE_ENV`             | Environment (`development` or `production`)      |
