/**
 * POST /api/nova/image
 * Generates an image via Amazon Nova Canvas (amazon.nova-canvas-v1:0) using AWS Bedrock.
 * Requirements: 8.1, 14.1, 16.1, 17.1
 */

import { Router, Request, Response } from 'express'
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

const router = Router()

const MODEL_ID = 'amazon.nova-canvas-v1:0'

// Initialise the Bedrock client.
// In production the default credential provider chain picks up credentials
// from the attached IAM role; in local dev we fall back to env vars.
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

interface NovaImageRequest {
  prompt: string
  width?: number
  height?: number
}

interface NovaCanvasResponse {
  images: string[]
}

router.post('/', async (req: Request, res: Response) => {
  const { prompt, width = 1024, height = 1024 } = req.body as NovaImageRequest

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    res.status(400).json({ error: 'A non-empty prompt is required.' })
    return
  }

  const requestBody = {
    taskType: 'TEXT_IMAGE',
    textToImageParams: {
      text: prompt.trim(),
    },
    imageGenerationConfig: {
      width,
      height,
      numberOfImages: 1,
    },
  }

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    })

    const response = await bedrockClient.send(command)

    // Decode the response body (Uint8Array → string → JSON)
    const responseText = new TextDecoder().decode(response.body)
    const parsed: NovaCanvasResponse = JSON.parse(responseText)

    const imageBase64 = parsed.images?.[0]
    if (!imageBase64) {
      console.error('[nova/image] No image returned in Bedrock response')
      res.status(500).json({ error: 'Image generation failed. Please try again.' })
      return
    }

    res.json({ imageBase64, mimeType: 'image/png' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[nova/image] Bedrock error: ${message}`)
    res.status(500).json({
      error: 'Image generation is temporarily unavailable. Please try again later.',
    })
  }
})

export default router
