import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import claudeRouter from './routes/claude.js'
import novaRouter from './routes/nova.js'
import healthRouter from './routes/health.js'
import documentRouter from './routes/document.js'

const app = express()
const PORT = process.env.PORT ?? 3001

// Validate required environment variables on startup
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
]

const missingVars = requiredEnvVars.filter((v) => !process.env[v])
if (missingVars.length > 0) {
  console.error(
    `[SMEwise] Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the values.',
  )
  process.exit(1)
}

// Middleware
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/health', healthRouter)
app.use('/api/claude', claudeRouter)
app.use('/api/nova', novaRouter)
app.use('/api/document', documentRouter)

// Start server
app.listen(PORT, () => {
  console.log(`[SMEwise] Server running on http://localhost:${PORT}`)
})

export default app
