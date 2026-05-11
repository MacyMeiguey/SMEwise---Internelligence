/**
 * Claude API proxy routes
 * Requirements: 20.1, 20.2, 20.3, 20.5
 */

import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-20250514'

// ─── POST /api/claude/stream ──────────────────────────────────────────────────
// Streams a Claude text response using Server-Sent Events (SSE).
// Requirements: 20.1, 20.3, 20.5
router.post('/stream', async (req: Request, res: Response) => {
  const {
    systemPrompt,
    userMessage,
    temperature = 0.7,
    tools = [],
    maxTokens = 1024,
  } = req.body as {
    systemPrompt?: string
    userMessage: string
    temperature?: number
    tools?: string[]
    maxTokens?: number
  }

  if (!userMessage) {
    res.status(400).json({ error: 'userMessage is required.' })
    return
  }

  // Build tool definitions when web_search is requested
  const anthropicTools: Anthropic.Tool[] = tools.includes('web_search')
    ? [
        {
          name: 'web_search',
          description:
            'Search the web for current information. Use this to verify URLs and retrieve up-to-date data.',
          input_schema: {
            type: 'object' as const,
            properties: {
              query: {
                type: 'string',
                description: 'The search query.',
              },
            },
            required: ['query'],
          },
        },
      ]
    : []

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const streamParams: Anthropic.MessageStreamParams = {
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: userMessage }],
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
    }

    const stream = await client.messages.stream(streamParams)

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const chunk = JSON.stringify({ delta: event.delta.text })
        res.write(`data: ${chunk}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('[SMEwise] /api/claude/stream error:', err)
    // If headers already sent, send error as SSE event
    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ error: 'Something went wrong while generating a response. Please try again.' })}\n\n`,
      )
      res.end()
    } else {
      res.status(500).json({
        error: 'Something went wrong while generating a response. Please try again.',
      })
    }
  }
})

// ─── POST /api/claude/complete ────────────────────────────────────────────────
// Returns the full Claude response as { "content": "string" } (non-streaming).
// Used for Profile Summary Card and Document Generator.
// Requirements: 20.2
router.post('/complete', async (req: Request, res: Response) => {
  const {
    systemPrompt,
    userMessage,
    temperature = 0.7,
    maxTokens = 1024,
  } = req.body as {
    systemPrompt?: string
    userMessage: string
    temperature?: number
    maxTokens?: number
  }

  if (!userMessage) {
    res.status(400).json({ error: 'userMessage is required.' })
    return
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: userMessage }],
      ...(systemPrompt ? { system: systemPrompt } : {}),
    })

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === 'text')
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    res.status(200).json({ content })
  } catch (err) {
    console.error('[SMEwise] /api/claude/complete error:', err)
    res.status(500).json({
      error: 'Something went wrong while generating a response. Please try again.',
    })
  }
})

export default router
