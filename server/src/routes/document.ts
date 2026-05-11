/**
 * POST /api/document/generate
 * Generates a structured business document using Claude's extended thinking
 * (Show_Reasoning / interleaved-thinking) mode.
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
import Anthropic from '@anthropic-ai/sdk'
import type { BusinessProfile } from '../types/index.js'

const router = Router()

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

  try {
    // Use client.messages.create with interleaved-thinking beta headers.
    // The `betas` and `thinking` fields are passed as extra body params since
    // SDK v0.27.x does not yet expose typed beta.messages — casting to `any`
    // lets us forward them directly to the Anthropic API.
    const response = await (client.messages as any).create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 5000,
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      betas: ['interleaved-thinking-2025-05-14'],
    })

    // Extract text content blocks and thinking blocks from the response
    let content = ''
    const thinkingParts: string[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text
      } else if (block.type === 'thinking') {
        thinkingParts.push(block.thinking)
      }
    }

    const thinkingSteps = thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null

    res.status(200).json({ content: content.trim(), thinkingSteps })
  } catch (err: unknown) {
    console.error('[SMEwise] /api/document/generate error:', err)

    // Map known SDK error types to user-safe messages
    const error = err as { status?: number; message?: string }

    if (error.status === 429) {
      res.status(500).json({
        error: 'Our AI service is busy right now. Please wait a moment and try again.',
      })
      return
    }

    if (error.status === 401 || error.status === 403) {
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
