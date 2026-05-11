/**
 * GET /api/health
 * Health check route — returns { "status": "ok" } with HTTP 200.
 * The server only starts if all required env vars are present (validated in index.ts),
 * so reaching this route implies all env vars are set.
 * Requirements: 21.4
 */
import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

export default router
