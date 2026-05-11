/**
 * Integration tests for GET /api/health
 * Requirements: 21.4
 */
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import healthRouter from './health.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/health', healthRouter)
  return app
}

describe('GET /api/health', () => {
  it('returns HTTP 200 with { status: "ok" }', async () => {
    const app = createTestApp()
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns JSON content-type', async () => {
    const app = createTestApp()
    const res = await request(app).get('/api/health')

    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})
