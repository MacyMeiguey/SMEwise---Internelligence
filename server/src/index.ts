import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import novaRouter from './routes/nova.js'
import healthRouter from './routes/health.js'
import documentRouter from './routes/document.js'
import bedrockRouter from './routes/bedrock.js'
import converseRouter from './routes/converse.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const IS_PROD = process.env.NODE_ENV === 'production'

// ─── Environment validation ──────────────────────────────────────────────────
//
// The SDK resolves environment credentials (including session tokens), local
// AWS profiles / SSO, or a deployed IAM role through its default provider chain.
const requiredEnvVars = ['AWS_REGION']

const missingVars = requiredEnvVars.filter((v) => !process.env[v])
if (missingVars.length > 0) {
  console.error(
    `[SMEwise] Missing required environment variables: ${missingVars.join(', ')}\n` +
    'Please copy .env.example to .env and fill in the values.',
  )
  process.exit(1)
}

// ─── CORS ────────────────────────────────────────────────────────────────────
//
// CORS_ORIGIN accepts a comma-separated list of allowed origins, e.g.:
//   CORS_ORIGIN=https://d123abc.cloudfront.net,https://app.smewise.example.com
//
// When the API is served through the same CloudFront distribution as the SPA,
// browsers send same-origin requests and CORS is effectively unused. Keeping
// it permissive-to-configured-origins still lets tools like curl / Postman
// hit the API directly.
const devOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const allowedOrigins = IS_PROD ? configuredOrigins : devOrigins

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin / server-to-server requests have no Origin header.
      if (!origin) return callback(null, true)
      if (allowedOrigins.length === 0) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  }),
)

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter)
app.use('/api/nova', novaRouter)
app.use('/api/document', documentRouter)
app.use('/api/bedrock', bedrockRouter)
app.use('/api/bedrock/converse', converseRouter)

// ─── Start server ────────────────────────────────────────────────────────────
//
// Bind to 0.0.0.0 so the container/instance is reachable from outside the
// local network namespace (required by App Runner, ECS, EC2).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SMEwise] Server running on http://0.0.0.0:${PORT}`)
})

export default app
