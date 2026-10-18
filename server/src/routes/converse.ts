/**
 * Bedrock Converse API proxy routes
 *
 * Replaces the previous Claude/Anthropic SDK routes with AWS Bedrock's
 * ConverseStream and Converse APIs, which support Claude models natively.
 *
 * POST /api/bedrock/converse/stream  — SSE streaming text generation
 * POST /api/bedrock/converse/complete — Non-streaming text generation
 */

import { Router, Request, Response } from 'express'
import {
    BedrockRuntimeClient,
    ConverseStreamCommand,
    ConverseCommand,
    type Message,
    type SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime'

const router = Router()

// ─── Bedrock client (uses IAM role in prod, env vars in dev) ─────────────────
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                // Required for temporary STS credentials (keys starting with "ASIA").
                ...(process.env.AWS_SESSION_TOKEN
                    ? { sessionToken: process.env.AWS_SESSION_TOKEN }
                    : {}),
            },
        }
        : {}),
})

// Model ID — Claude on Bedrock
const MODEL_ID = process.env.BEDROCK_CONVERSE_MODEL_ID ?? 'us.anthropic.claude-sonnet-4-20250514-v1:0'

// ─── POST /stream ────────────────────────────────────────────────────────────
// Streams a text response using Server-Sent Events (SSE).
// Request body: { systemPrompt?, userMessage, temperature?, maxTokens? }
// Response: SSE with data: {"delta":"..."}\n\n chunks, ending with data: [DONE]\n\n
router.post('/stream', async (req: Request, res: Response) => {
    const {
        systemPrompt,
        userMessage,
        temperature = 0.7,
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

    // Build messages array
    const messages: Message[] = [
        { role: 'user', content: [{ text: userMessage }] },
    ]

    // Build system prompt
    const system: SystemContentBlock[] | undefined = systemPrompt
        ? [{ text: systemPrompt }]
        : undefined

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    try {
        const command = new ConverseStreamCommand({
            modelId: MODEL_ID,
            messages,
            ...(system ? { system } : {}),
            inferenceConfig: {
                maxTokens,
                temperature,
            },
        })

        const response = await bedrockClient.send(command)

        if (response.stream) {
            for await (const event of response.stream) {
                if (event.contentBlockDelta?.delta?.text) {
                    const chunk = JSON.stringify({ delta: event.contentBlockDelta.delta.text })
                    res.write(`data: ${chunk}\n\n`)
                }
            }
        }

        res.write('data: [DONE]\n\n')
        res.end()
    } catch (err) {
        console.error('[SMEwise] /api/bedrock/converse/stream error:', err)

        if (res.headersSent) {
            res.write(
                `data: ${JSON.stringify({ error: 'Something went wrong while generating a response. Please try again.' })}\n\n`,
            )
            res.end()
        } else {
            const error = err as { name?: string }
            if (error.name === 'ThrottlingException') {
                res.status(429).json({
                    error: 'Our AI service is busy right now. Please wait a moment and try again.',
                })
            } else {
                res.status(500).json({
                    error: 'Something went wrong while generating a response. Please try again.',
                })
            }
        }
    }
})

// ─── POST /complete ──────────────────────────────────────────────────────────
// Returns the full response as { "content": "string" } (non-streaming).
// Request body: { systemPrompt?, userMessage, temperature?, maxTokens? }
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

    const messages: Message[] = [
        { role: 'user', content: [{ text: userMessage }] },
    ]

    const system: SystemContentBlock[] | undefined = systemPrompt
        ? [{ text: systemPrompt }]
        : undefined

    try {
        const command = new ConverseCommand({
            modelId: MODEL_ID,
            messages,
            ...(system ? { system } : {}),
            inferenceConfig: {
                maxTokens,
                temperature,
            },
        })

        const response = await bedrockClient.send(command)

        // Extract text from the response content blocks
        let content = ''
        for (const block of response.output?.message?.content ?? []) {
            if (block.text) {
                content += block.text
            }
        }

        res.status(200).json({ content })
    } catch (err) {
        console.error('[SMEwise] /api/bedrock/converse/complete error:', err)

        const error = err as { name?: string }
        if (error.name === 'ThrottlingException') {
            res.status(429).json({
                error: 'Our AI service is busy right now. Please wait a moment and try again.',
            })
        } else {
            res.status(500).json({
                error: 'Something went wrong while generating a response. Please try again.',
            })
        }
    }
})

export default router
