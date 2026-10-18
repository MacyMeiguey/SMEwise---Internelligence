import { afterEach, describe, expect, it, vi } from 'vitest'
import { FEATURE_CONTRACTS } from './contracts.js'
import { matchesSchema, type JsonSchema } from './schema.js'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class { send = send },
  ConverseCommand: class { constructor(public input: unknown) {} },
  ConverseStreamCommand: class { constructor(public input: unknown) {} },
}))
import { generateFeature, streamAssistantReply } from './generation.js'

function fixture(schema: JsonSchema): unknown {
  if (schema.enum) return schema.enum[0]
  if (schema.anyOf) return fixture(schema.anyOf[0])
  if (schema.type === 'array') return [fixture(schema.items!)]
  if (schema.type === 'object') return Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([key, child]) => [key, fixture(child)]))
  if (schema.type === 'number') return 10
  if (schema.type === 'boolean') return true
  if (schema.type === 'null') return null
  return 'Sample'
}

afterEach(() => { send.mockReset(); vi.unstubAllEnvs() })

describe('structured business generation', () => {
  it.each(Object.keys(FEATURE_CONTRACTS))('accepts the UI response contract for %s', async (feature) => {
    const content = JSON.stringify(fixture(FEATURE_CONTRACTS[feature]))
    send.mockResolvedValue({ stopReason: 'end_turn', output: { message: { content: [{ text: content }] } } })
    expect(JSON.parse(await generateFeature(feature, 'Company: Test SME'))).toEqual(JSON.parse(content))
  })

  it('rejects parseable responses that cannot render in the widget', async () => {
    send.mockResolvedValue({ stopReason: 'end_turn', output: { message: { content: [{ text: '{}' }] } } })
    await expect(generateFeature('startup', 'profile')).rejects.toThrow(SyntaxError)
  })

  it('rejects a truncated response even when its text happens to be JSON', async () => {
    send.mockResolvedValue({ stopReason: 'max_tokens', output: { message: { content: [{ text: '{}' }] } } })
    await expect(generateFeature('startup', 'profile')).rejects.toThrow('did not complete')
  })

  it('rejects an empty pricing object even though its UI fields are individually optional', async () => {
    send.mockResolvedValue({ stopReason: 'end_turn', output: { message: { content: [{ text: '{}' }] } } })
    await expect(generateFeature('smart-pricing', 'profile')).rejects.toThrow('result fields')
  })

  it('accepts a complete JSON object wrapped in explanatory text or markdown', async () => {
    const value = fixture(FEATURE_CONTRACTS['analytics-dashboard'])
    send.mockResolvedValue({ stopReason: 'end_turn', output: { message: {
      content: [{ text: `Planning estimates follow.\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`` }],
    } } })
    expect(JSON.parse(await generateFeature('analytics-dashboard', 'profile'))).toEqual(value)
  })

  it('limits concurrent model calls when the dashboard starts multiple features', async () => {
    let active = 0
    let peak = 0
    const content = JSON.stringify(fixture(FEATURE_CONTRACTS['fund-allocation']))
    send.mockImplementation(async () => {
      active++; peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active--
      return { stopReason: 'end_turn', output: { message: { content: [{ text: content }] } } }
    })
    await Promise.all(Array.from({ length: 5 }, () => generateFeature('fund-allocation', 'profile')))
    expect(peak).toBe(2)
  })

  it('validates nested types, enum values and nullable fields', () => {
    expect(matchesSchema({ x: 1 }, { type: 'object', properties: { x: { type: 'string' } } })).toBe(false)
    expect(matchesSchema('bad', { type: 'string', enum: ['allowed'] })).toBe(false)
    expect(matchesSchema(null, { anyOf: [{ type: 'null' }, { type: 'string' }] })).toBe(true)
  })
})

describe('direct model assistant streaming', () => {
  it('delivers chunks and supplies earlier turns on the next request', async () => {
    send.mockImplementation(async () => ({ stream: (async function* () {
      yield { contentBlockDelta: { delta: { text: 'Hello' } } }
      yield { messageStop: { stopReason: 'end_turn' } }
    })() }))
    const signal = new AbortController().signal
    const chunks: string[] = []
    for await (const chunk of streamAssistantReply('First question', 'test-conversation', signal)) chunks.push(chunk)
    expect(chunks).toEqual(['Hello'])
    for await (const _chunk of streamAssistantReply('Follow-up', 'test-conversation', signal)) { /* consume */ }
    expect(send.mock.calls[1][0].input.messages).toEqual([
      { role: 'user', content: [{ text: 'First question' }] },
      { role: 'assistant', content: [{ text: 'Hello' }] },
      { role: 'user', content: [{ text: 'Follow-up' }] },
    ])
  })

  it('surfaces error events instead of silently reporting an empty success', async () => {
    send.mockResolvedValue({ stream: (async function* () { yield { throttlingException: { message: 'busy' } } })() })
    const consume = async () => {
      for await (const _chunk of streamAssistantReply('Question', 'test-error', new AbortController().signal)) { /* consume */ }
    }
    await expect(consume()).rejects.toThrow('throttlingException')
  })
})
