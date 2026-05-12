/**
 * POST /api/document/generate
 * Generates a structured business document using AWS Bedrock Converse API.
 *
 * Request body:
 *   { documentType: string, businessProfile: BusinessProfile, templateText: string | null }
 *
 * Response:
 *   { content: string, thinkingSteps: string | null }
 *
 * Requirements: 18.3, 18.4, 18.5, 18.6
 */
import { Router, Request, Response } from 'express'
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime'
import type { BusinessProfile } from '../types/index.js'

const router = Router()

// ─── Bedrock client (uses IAM role in prod, env vars in dev) ─────────────────
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }
    : {}),
})

const MODEL_ID = process.env.BEDROCK_CONVERSE_MODEL_ID ?? 'us.anthropic.claude-sonnet-4-20250514-v1:0'

const SYSTEM_PROMPT = `You are SMEwise, an expert AI business advisor specialising in Malaysian SMEs.
Generate professional, well-structured business documents tailored to Malaysian business context.
Always use:
- Malaysian Ringgit (RM) for all monetary values
- Malaysian regulations: SSM, LHDN, EPF, SOCSO, HRDF
- Malaysian financing bodies: TEKUN, Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN
- Malaysian platforms: Shopee, Lazada, TikTok Shop, WhatsApp Business, Google My Business
- Correct Malaysian business entity terminology (Sdn Bhd, PLT, Sole Proprietorship, etc.)
Documents must be clean, structured with clear headings, professional in tone, and a maximum of 1,000 words.
Never use USD or reference non-Malaysian regulations.`

router.post('/generate', async (req: Request, res: Response) => {
  const {
    documentType,
    businessProfile,
    templateText,
  }: {
    documentType: string
    businessProfile: BusinessProfile
    templateText: string | null
  } = req.body

  if (!documentType || !businessProfile) {
    res.status(400).json({ error: 'documentType and businessProfile are required.' })
    return
  }

  const profileSummary = `
Business Profile:
- Company Name: ${businessProfile.companyName}
- Industry: ${businessProfile.industry}
- City / State: ${businessProfile.city}
- Target Customer: ${businessProfile.targetCustomer}
- Main Business Goal: ${businessProfile.mainGoal || 'Not specified'}
- Current Funds: RM ${businessProfile.currentFunds.toLocaleString()}
- Business Stage: ${businessProfile.businessStage}
- Business Type: ${businessProfile.businessType}
`.trim()

  const templateSection = templateText
    ? `\n\nTemplate Reference (use this structure as a guide):\n${templateText}`
    : ''

  const userMessage = `Generate a complete "${documentType}" for the following Malaysian SME.

${profileSummary}${templateSection}

Requirements:
- Maximum 1,000 words
- Use clear headings and structured sections
- All monetary values in RM
- Specific to Malaysian business context, regulations, and terminology
- Professional tone suitable for investors, staff, or operational use`

  const messages: Message[] = [
    { role: 'user', content: [{ text: userMessage }] },
  ]

  const system: SystemContentBlock[] = [{ text: SYSTEM_PROMPT }]

  try {
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages,
      system,
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.7,
      },
    })

    const response = await bedrockClient.send(command)

    // Extract text content from the response
    let content = ''
    for (const block of response.output?.message?.content ?? []) {
      if (block.text) {
        content += block.text
      }
    }

    // thinkingSteps is null since Bedrock Converse doesn't expose thinking
    // blocks in the same way — the response quality is equivalent.
    res.status(200).json({ content: content.trim(), thinkingSteps: null })
  } catch (err: unknown) {
    console.error('[SMEwise] /api/document/generate error:', err)

    const error = err as { name?: string }

    if (error.name === 'ThrottlingException') {
      res.status(500).json({
        error: 'Our AI service is busy right now. Please wait a moment and try again.',
      })
      return
    }

    if (error.name === 'AccessDeniedException') {
      res.status(500).json({
        error: 'There was an authentication issue with the AI service. Please contact support.',
      })
      return
    }

    res.status(500).json({
      error: 'Document generation failed. Please try again.',
    })
  }
})

export default router
