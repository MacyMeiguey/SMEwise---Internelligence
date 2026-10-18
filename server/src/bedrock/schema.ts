export interface JsonSchema {
  type?: string
  enum?: (string | number)[]
  anyOf?: JsonSchema[]
  items?: JsonSchema
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
}

export function schemaMismatch(value: unknown, schema: JsonSchema, path = 'response'): string | undefined {
  if (schema.anyOf) return schema.anyOf.some((choice) => matchesSchema(value, choice)) ? undefined : `${path}: no allowed type matched`
  if (schema.enum && !schema.enum.includes(value as string | number)) return `${path}: expected one of ${schema.enum.join(', ')}`
  if (schema.type === 'null') return value === null ? undefined : `${path}: expected null`
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${path}: expected array`
    for (let i = 0; i < value.length; i++) {
      const error = schema.items && schemaMismatch(value[i], schema.items, `${path}[${i}]`)
      if (error) return error
    }
    return undefined
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `${path}: expected object`
    const record = value as Record<string, unknown>
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) return `${path}.${key}: required field is missing`
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) continue
      const error = schemaMismatch(record[key], child, `${path}.${key}`)
      if (error) return error
    }
    return undefined
  }
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? undefined : `${path}: expected finite number`
  return typeof value === schema.type ? undefined : `${path}: expected ${schema.type}`
}

export function matchesSchema(value: unknown, schema: JsonSchema): boolean {
  return !schemaMismatch(value, schema)
}
