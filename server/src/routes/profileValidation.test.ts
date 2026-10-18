import { afterEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class { send = send },
  ConverseCommand: class { constructor(public input: unknown) {} },
}))

import { verifyBusinessProfile } from './profileValidation.js'

afterEach(() => {
  send.mockReset()
  vi.unstubAllEnvs()
})

describe('direct Bedrock onboarding validation', () => {
  it('uses the configured model and preserves the pass response contract', async () => {
    vi.stubEnv('BEDROCK_CONVERSE_MODEL_ID', 'tested-haiku-profile')
    send.mockResolvedValue({
      stopReason: 'end_turn', output: { message: { content: [{ text: 'pass\n' }] } },
    })
    expect(await verifyBusinessProfile('Company: Kedai Kopi Maju')).toBe('pass')
    expect(send.mock.calls[0][0].input).toMatchObject({
      modelId: 'tested-haiku-profile',
      messages: [{ role: 'user', content: [{ text: 'Company: Kedai Kopi Maju' }] }],
      inferenceConfig: { maxTokens: 128, temperature: 0 },
    })
    expect(send.mock.calls[0][1].abortSignal).toBeInstanceOf(AbortSignal)
  })

  it('returns the model correction reason for an invalid profile', async () => {
    send.mockResolvedValue({
      stopReason: 'end_turn',
      output: { message: { content: [{ text: 'Current funds must be at least RM 1,000.' }] } },
    })
    expect(await verifyBusinessProfile('Current Funds: RM 0')).toContain('at least RM 1,000')
  })

  it('fails closed for interrupted responses and empty output', async () => {
    send.mockResolvedValueOnce({
      stopReason: 'max_tokens', output: { message: { content: [{ text: 'pass' }] } },
    })
    await expect(verifyBusinessProfile('profile')).rejects.toThrow('did not complete')
    send.mockResolvedValueOnce({ stopReason: 'end_turn', output: { message: { content: [] } } })
    await expect(verifyBusinessProfile('profile')).rejects.toThrow('empty response')
  })
})
