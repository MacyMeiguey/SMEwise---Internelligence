# SMEwise — AI Business Assistant for Malaysian SMEs

SMEwise is an AI-powered web application that provides personalised business guidance to Malaysian SME founders. It uses Anthropic Claude for text generation and Amazon Nova Canvas (via AWS Bedrock) for image and chart generation.

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
- An **Anthropic API key** (for Claude)
- **AWS credentials** with Bedrock access (for Nova Canvas)

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
ANTHROPIC_API_KEY=sk-ant-...
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
| AI Text  | Anthropic Claude (`claude-sonnet-4-20250514`)   |
| AI Image | Amazon Nova Canvas via AWS Bedrock              |
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
| `ANTHROPIC_API_KEY`    | Anthropic API key for Claude                     |
| `AWS_ACCESS_KEY_ID`    | AWS access key ID for Bedrock                    |
| `AWS_SECRET_ACCESS_KEY`| AWS secret access key for Bedrock                |
| `AWS_REGION`           | AWS region (e.g., `us-east-1`)                   |
| `PORT`                 | Server port (optional, defaults to `3001`)       |
| `NODE_ENV`             | Environment (`development` or `production`)      |
