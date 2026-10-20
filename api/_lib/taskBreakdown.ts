import { detectSafetySignal } from './chatGuards.js'
import { AiBusyError, groqStructuredCompletion } from './groq.js'
import { isRateLimited, resolveProvider, type ResolvedProvider } from './kahyAi.js'

/**
 * POST /api/kahy/breakdown — divide una tarea (o un paso) en acciones
 * pequeñas. Comparte proveedor, límite de solicitudes y detección de
 * señales de seguridad con el chat (kahyAi.ts). Se mantiene dentro de api/
 * por la misma razón que kahyAi.ts: el empaquetador de funciones de Vercel
 * solo rastrea bien las importaciones que no salen de esta carpeta.
 */

const BREAKDOWN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['steps', 'encouragement'],
  properties: {
    steps: {
      type: 'array',
      minItems: 2,
      maxItems: 7,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'minutes'],
        properties: { text: { type: 'string' }, minutes: { type: 'integer' } },
      },
    },
    encouragement: { type: 'string' },
  },
} as const

const SYSTEM_PROMPT = `Eres KAHY y ayudas a personas adultas en México a dividir una tarea que se siente grande en acciones pequeñas y posibles. Puede tratarse de personas con ansiedad, agobio o TDAH.

Reglas:
1. Devuelve de 3 a 6 pasos (de 2 a 4 si te piden dividir un solo paso). Cada paso es una acción física y observable que empieza con un verbo en infinitivo ("Abrir…", "Escribir…", "Buscar…").
2. Máximo 14 palabras por paso. Nada de pasos vagos como "organizarte", "concentrarte" o "dar lo mejor".
3. El primer paso debe ser tan fácil que tome 5 minutos o menos.
4. minutes es una estimación amable entre 1 y 25. Con energía "poca", usa pasos más cortos y como máximo 4.
5. Respeta el contexto de la tarea: usa sus propias palabras y no inventes detalles que la persona no dio.
6. encouragement es una frase breve (máximo 18 palabras), cálida y sin presión ni productividad tóxica. No uses "¡Tú puedes!" ni signos de exclamación dobles.
7. No des consejos médicos ni clínicos. Español natural de México.
Devuelve únicamente el objeto solicitado por el esquema.`

type Energy = 'poca' | 'media' | 'bastante'
export type BreakdownStep = { text: string; minutes: number }

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

export async function getTaskBreakdown(rawBody: unknown, clientId: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as Record<string, unknown>
  const task = cleanText(body.task, 240)
  const step = cleanText(body.step, 200)
  const energy: Energy = body.energy === 'poca' || body.energy === 'bastante' ? body.energy : 'media'
  if (!task) return { status: 400, body: { error: 'Escribe la tarea que quieres desglosar.' } }

  // La detección de seguridad va antes que todo: no depende de que haya IA configurada.
  if (detectSafetySignal(`${task}\n${step}`)) {
    return { status: 200, body: { safety: true } }
  }

  const provider = resolveProvider()
  if (!provider) return { status: 503, body: { code: 'AI_NOT_CONFIGURED', error: 'La IA todavía no tiene una clave configurada en el servidor.' } }
  if (isRateLimited(clientId)) return { status: 429, body: { code: 'RATE_LIMIT', error: 'Espera un momento antes de pedir otra sugerencia.' } }

  const request = step
    ? `Tarea general: "${task}".\nEste paso todavía se siente grande: "${step}".\nDivídelo en 2 a 4 micro-acciones. Energía disponible: ${energy}.`
    : `Tarea: "${task}".\nEnergía disponible: ${energy}.\nPropón los pasos.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const raw = await callProvider(provider, request, controller.signal)
    const steps = (Array.isArray(raw.steps) ? raw.steps : []).flatMap((item: unknown): BreakdownStep[] => {
      const entry = item as Record<string, unknown>
      const text = cleanText(entry?.text, 140)
      const minutes = Math.min(25, Math.max(1, Math.round(Number(entry?.minutes) || 5)))
      return text ? [{ text, minutes }] : []
    }).slice(0, 7)
    if (steps.length < 2) throw new Error('La IA devolvió muy pocos pasos.')
    return { status: 200, body: { steps, encouragement: cleanText(raw.encouragement, 160), provider: provider.name } }
  } catch (error) {
    if (error instanceof AiBusyError) {
      return { status: 429, body: { code: 'AI_BUSY', retryAfter: error.retryAfterSeconds, error: 'La IA en línea está atendiendo muchas solicitudes.' } }
    }
    console.error('[KAHY breakdown]', error instanceof Error ? error.message : error)
    return { status: 502, body: { code: 'AI_UNAVAILABLE', error: 'La IA no está disponible en este momento.' } }
  } finally {
    clearTimeout(timeout)
  }
}

async function callProvider(provider: ResolvedProvider, request: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  if (provider.name === 'groq') {
    const { data } = await groqStructuredCompletion({
      apiKey: provider.apiKey,
      model: provider.model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: request }],
      schemaName: 'kahy_breakdown',
      schema: BREAKDOWN_SCHEMA,
      maxTokens: 900,
      signal,
    })
    return data
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: provider.model,
      store: false,
      max_output_tokens: 900,
      input: [{ role: 'developer', content: SYSTEM_PROMPT }, { role: 'user', content: request }],
      text: { format: { type: 'json_schema', name: 'kahy_breakdown', strict: true, schema: BREAKDOWN_SCHEMA } },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI respondió ${response.status}`)
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((part) => typeof part.text === 'string')?.text
  if (!text) throw new Error('La respuesta de IA llegó vacía.')
  return JSON.parse(text)
}
