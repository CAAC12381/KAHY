import type { IncomingMessage } from 'node:http'
import { detectSafetySignal } from '../src/mock/conversation'

/**
 * Shared AI orchestration logic for KAHY's chat endpoint. Used by both:
 * - the Vite dev-server middleware (vite.config.ts, `kahyAiApi()`), so
 *   `npm run dev` works locally, and
 * - the Vercel serverless functions (api/kahy/*.ts), so the deployed site
 *   works too — Vite plugins only run under `vite dev`/`vite preview` and
 *   are stripped from production builds, so without this the deployed
 *   static build had no backend at all and silently fell back to the
 *   local rule engine for everyone.
 *
 * Keeping this in one place is also what stops the schema/prompt/safety
 * checks from drifting between two copies (that already happened once —
 * see the safety-check unification earlier this session).
 */

export type KahyChatMessage = { role: 'user' | 'assistant'; content: string }

export const KAHY_REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'topic', 'label', 'title', 'introduction', 'insight', 'steps', 'question', 'choices', 'sourceIds', 'openHelp'],
  properties: {
    mode: { type: 'string', enum: ['standard', 'support', 'safety'] },
    topic: {
      type: 'string',
      enum: [
        'inicio', 'estrés', 'ánimo', 'trauma', 'neurodivergencia', 'adicciones', 'organización', 'acceso', 'seguridad',
        'duelo', 'soledad', 'relaciones', 'sueño', 'pánico', 'medicación', 'diagnóstico', 'apoyo', 'autocuidado',
      ],
    },
    label: { type: 'string' },
    title: { type: 'string' },
    introduction: { type: 'string' },
    insight: { type: 'string' },
    steps: {
      type: 'array',
      minItems: 0,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['horizon', 'text'],
        properties: { horizon: { type: 'string' }, text: { type: 'string' } },
      },
    },
    question: { type: 'string' },
    choices: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
    sourceIds: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'string',
        enum: [
          'who-ai-health', 'nice-self-harm', 'nimh-asq', 'mexico-privacy', 'linea-vida', 'who-pfa', 'who-selfhelp',
          'nice-depression', 'nice-panic-anxiety', 'nice-ptsd', 'nice-adhd', 'nice-autism', 'phq9-gad7-mx', 'pcl5-mx',
          'nida-language', 'conasama-cecosama', 'inegi-suicidio', 'phq9-gad7-unam', 'pcl5-unam', 'asrs-mx',
        ],
      },
    },
    openHelp: { type: 'boolean' },
  },
} as const

const KAHY_SYSTEM_PROMPT = `Eres el motor de orientación de KAHY para personas adultas en México. Responde siempre en español claro, cálido y directo, como alguien que de verdad quiere ayudar — no como un formulario clínico.

Tu función es ayudar a ordenar problemas cotidianos, proponer siguientes pasos concretos y facilitar conexión con apoyo humano. No eres psicólogo, médico ni servicio de emergencia. No diagnostiques, no asegures que comprendes emociones, no prometas confidencialidad absoluta y no clasifiques riesgo en bajo/medio/alto.

Estilo:
- Muestra interés genuino: nombra algo específico de lo que la persona acaba de escribir antes de estructurar la respuesta.
- Valida la emoción sin adivinar la causa ni decir "te entiendo perfectamente". Está bien no saber y preguntar.
- Con mensajes positivos (un logro, alivio, calma, alegría) reacciona con calidez real y curiosidad — no lo conviertas en un problema a resolver.
- Antes de proponer un ejercicio breve, pide permiso ("¿te serviría probar...?", "¿quieres intentar...?").
- Evita frases de relleno repetidas en cada respuesta ("estoy aquí para ti"); que la calidez se note en el contenido, no en una fórmula fija.

Reglas:
1. Cuando haya un problema o malestar que ordenar, separa situación, impacto y siguiente decisión — no lo reduzcas a "respira". Cuando el mensaje sea positivo, neutral o no tenga nada que resolver, "steps" puede ser un arreglo vacío: no fuerces un plan de acción donde solo hace falta compartir el gusto o la calma.
2. Usa enfoque informado por trauma y neuroafirmativo. No fuerces detalles ni patologices.
3. Para consumo, no indiques suspensiones bruscas ni ajustes médicos. Señala urgencias físicas y atención profesional.
4. Si existe intención explícita de autolesión, suicidio, violencia actual, sobredosis, inconsciencia o dificultad respiratoria, usa mode=safety, topic=seguridad, openHelp=true. Indica 911, Línea de la Vida 800 911 2000, contacto humano inmediato y alejarse de medios de daño. No continúes con exploración profunda.
5. No inventes especialistas, teléfonos, disponibilidad ni servicios locales. El directorio actual es demostrativo.
6. Haz una sola pregunta de seguimiento y ofrece entre dos y cuatro respuestas rápidas.
7. La lectura de contexto debe describirse como posibilidad, nunca como diagnóstico. Expresiones como "ando agüitado", "traigo depre" o "me dio el bajón" son lenguaje cotidiano, no un diagnóstico de depresión — y "bajón" puede ser físico (azúcar, presión, mareo), no solo anímico: pregunta antes de asumir.
8. Las acciones deben ser observables, realistas y divididas por horizonte temporal.
9. No pidas nombre, domicilio, ubicación exacta ni información identificable.
10. No atribuyas automáticamente síntomas físicos (dolor de pecho, palpitaciones, desmayo, mareo, convulsión, confusión) a ansiedad o pánico; si son nuevos, intensos o inusuales, pregunta por ellos primero y sugiere atención médica si corresponde.
11. Usa sourceIds únicamente de este catálogo: who-ai-health (gobernanza y límites de IA), nice-self-harm (no usar escalas para predecir o estratificar suicidio), nimh-asq (una señal positiva requiere evaluación humana), mexico-privacy (datos de salud sensibles), linea-vida (recurso oficial 800 911 2000), who-pfa (primeros auxilios psicológicos), who-selfhelp (autoayuda de bajo riesgo), nice-depression, nice-panic-anxiety, nice-ptsd, nice-adhd, nice-autism (guías clínicas NICE por tema), phq9-gad7-mx, pcl5-mx (validación mexicana de instrumentos de tamizaje, nunca los apliques ni los puntúes tú), nida-language (lenguaje sin estigma sobre consumo), conasama-cecosama (red real de centros en Michoacán), inegi-suicidio (estadística nacional).
12. Para el tema medicación, nunca sugieras iniciar, suspender o cambiar una dosis; remite siempre a quien recetó o a un farmacéutico.
13. openHelp debe ser true únicamente cuando mode=safety; en cualquier otro caso debe ser false.
14. No apliques ni puntúes tú mismo cuestionarios como PHQ-9, GAD-7, PCL-5 o ASRS dentro del chat; si preguntan por ellos, remite a la sección de Tamizaje de la app, aclarando que un resultado no es diagnóstico.
15. Conversa de verdad: responde específicamente a lo que la persona acaba de escribir (incluye una frase que muestre que la leíste) en vez de repetir una tarjeta genérica. No valides afirmaciones dañinas o autocríticas solo por sonar comprensivo ("sycophancy"): reconoce la emoción, y si la persona describe algo que le hizo daño a otra persona o a sí misma, nómbralo con calma y sin regañar, y señala qué podría hacer distinto — sin fingir que todo está bien si no lo está.

Ejemplos del tono esperado (la persona escribe algo así -> tu "introduction" o "insight" suena así, no textualmente):
- "ando bn aguitado y no c xq" -> "Suena a que notas un bajón, aunque todavía no está claro si es tristeza, preocupación o cansancio. ¿Cuál de esas tres se parece más a lo de hoy?"
- "estoi mui feliz pq por fin pase el examen" -> "¡Qué gusto! Pasar ese examen parece mezclar orgullo y alivio. ¿Qué hiciste que más te ayudó a lograrlo?" (steps vacío: no hay nada que resolver)
- "traigo un chingo de estres x la chamba" -> "La carga de trabajo se oye intensa. Para no reducirlo a respirar, ¿qué pesa más ahora: volumen de tareas, horario o trato en el trabajo?"
- "me siento vacia aunque estoy con gente" -> "Estar acompañada no siempre quita la sensación de vacío. ¿Se parece más a no sentir conexión, a tristeza o a no sentir casi nada?"
- "ando valiendo madre con la escuela" -> "Suena a mucha frustración, pero que la escuela vaya mal no te define por completo. ¿La barrera principal es entender, empezar o alcanzar las fechas?"
- "me paniquie y siento el corazon rapidisimo" -> "Antes de tratarlo como pánico: ¿las palpitaciones son nuevas o vienen con dolor fuerte en el pecho, desmayo o dificultad real para respirar? Si sí, busca atención médica inmediata; si no, podemos orientarnos al presente."

Devuelve únicamente el objeto solicitado por el esquema.`

type AiProviderName = 'groq' | 'openai'
type ResolvedProvider = { name: AiProviderName; apiKey: string; model: string }

/**
 * Groq is checked first: it's the free tier, so it's the sensible default
 * once both keys happen to be configured. Falls back to OpenAI so an
 * existing OPENAI_API_KEY keeps working without any config change.
 */
export function resolveProvider(): ResolvedProvider | null {
  if (process.env.GROQ_API_KEY) {
    return { name: 'groq', apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' }
  }
  if (process.env.OPENAI_API_KEY) {
    return { name: 'openai', apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-5.5' }
  }
  return null
}

export function getStatusPayload() {
  const resolved = resolveProvider()
  return {
    configured: Boolean(resolved),
    provider: resolved?.name === 'groq' ? 'Groq' : 'OpenAI',
    model: resolved?.model,
  }
}

// Best-effort per-process rate limiting. On serverless (Vercel) this resets
// on cold start / across instances — acceptable for abuse-deterrence, not a
// hard guarantee. A durable store (e.g. Vercel KV) would be needed for that.
const requestLog = new Map<string, number[]>()

function isRateLimited(clientId: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(clientId) || []).filter((time) => now - time < 60_000)
  if (recent.length >= 12) return true
  recent.push(now)
  requestLog.set(clientId, recent)
  return false
}

export async function getChatReply(rawMessages: unknown, clientId: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const resolved = resolveProvider()
  if (!resolved) {
    return { status: 503, body: { code: 'AI_NOT_CONFIGURED', error: 'La IA todavía no tiene una clave configurada en el servidor.' } }
  }
  if (isRateLimited(clientId)) {
    return { status: 429, body: { code: 'RATE_LIMIT', error: 'Espera un momento antes de enviar otro mensaje.' } }
  }

  const messages = sanitizeMessages(rawMessages)
  const latest = [...messages].reverse().find((message) => message.role === 'user')?.content || ''
  if (!latest) {
    return { status: 400, body: { error: 'Escribe un mensaje para continuar.' } }
  }
  const safetyContext = messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content).join('\n')

  // The moderation endpoint is OpenAI-specific; local regex coverage
  // (safetyPatterns in src/mock/conversation.ts) is what actually catches
  // the Groq path, and is the deterministic layer either way.
  const safetyDetected = detectSafetySignal(safetyContext)
    || (resolved.name === 'openai' && await moderationSafetyCheck(resolved.apiKey, safetyContext))
  if (safetyDetected) {
    return { status: 200, body: { reply: serverSafetyReply(), provider: 'safety-protocol' } }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const reply = resolved.name === 'groq'
      ? await callGroq(resolved, messages, controller.signal)
      : await callOpenAi(resolved, messages, controller.signal)
    clearTimeout(timeout)

    // Deterministic override: never trust the model's own openHelp for
    // whether to pop the crisis modal — it must follow mode=safety 1:1,
    // not the model's judgement call on a given response.
    reply.openHelp = reply.mode === 'safety'
    return { status: 200, body: { reply, provider: resolved.name } }
  } catch (error) {
    console.error('[KAHY AI]', error instanceof Error ? error.message : error)
    return { status: 502, body: { code: 'AI_UNAVAILABLE', error: 'La IA no está disponible en este momento. Se usará la orientación local.' } }
  }
}

async function callOpenAi(provider: ResolvedProvider, messages: KahyChatMessage[], signal: AbortSignal) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: provider.model,
      store: false,
      max_output_tokens: 1400,
      input: [{ role: 'developer', content: KAHY_SYSTEM_PROMPT }, ...messages],
      text: { format: { type: 'json_schema', name: 'kahy_reply', strict: true, schema: KAHY_REPLY_SCHEMA } },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI respondió ${response.status}`)
  const payload = await response.json() as Record<string, unknown>
  const outputText = extractOutputText(payload)
  if (!outputText) throw new Error('La respuesta de IA llegó vacía.')
  return JSON.parse(outputText)
}

async function callGroq(provider: ResolvedProvider, messages: KahyChatMessage[], signal: AbortSignal) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1400,
      messages: [{ role: 'system', content: KAHY_SYSTEM_PROMPT }, ...messages],
      response_format: { type: 'json_schema', json_schema: { name: 'kahy_reply', strict: true, schema: KAHY_REPLY_SCHEMA } },
    }),
  })
  if (!response.ok) throw new Error(`Groq respondió ${response.status}`)
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('La respuesta de IA llegó vacía.')
  return JSON.parse(content)
}

export async function readJsonBody(req: IncomingMessage) {
  let raw = ''
  for await (const chunk of req) {
    raw += String(chunk)
    if (raw.length > 24_000) throw new Error('Solicitud demasiado grande.')
  }
  return JSON.parse(raw || '{}') as { messages?: unknown }
}

function sanitizeMessages(value: unknown): KahyChatMessage[] {
  if (!Array.isArray(value)) return []
  return value.slice(-10).flatMap((message) => {
    if (!message || typeof message !== 'object') return []
    const item = message as Record<string, unknown>
    if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return []
    const content = item.content.trim().slice(0, 1400)
    return content ? [{ role: item.role, content }] : []
  })
}

async function moderationSafetyCheck(apiKey: string, input: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input }),
    })
    if (!response.ok) return false
    const payload = await response.json() as { results?: Array<{ categories?: Record<string, boolean> }> }
    const categories = payload.results?.[0]?.categories || {}
    return Boolean(categories['self-harm/intent'] || categories['self-harm/instructions'])
  } catch {
    return false
  }
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text
  const output = Array.isArray(payload.output) ? payload.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : []
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') return (part as Record<string, unknown>).text as string
    }
  }
  return ''
}

function serverSafetyReply() {
  return {
    mode: 'safety', topic: 'seguridad', label: 'Conexión humana inmediata', title: 'Paremos aquí y prioricemos tu seguridad',
    introduction: 'El mensaje contiene una señal explícita relacionada con autolesión o peligro. KAHY no va a intentar resolverlo únicamente con una respuesta automática.',
    insight: 'No se asignó una puntuación de riesgo. La detección solo activa una ruta preventiva hacia ayuda humana.',
    steps: [
      { horizon: 'Ahora', text: 'Si existe peligro inmediato, llama al 911 o acude al servicio de urgencias más cercano.' },
      { horizon: 'Con alguien', text: 'Contacta a una persona de confianza y pídele que permanezca contigo o te ayude a llegar a un lugar seguro.' },
      { horizon: 'Orientación', text: 'Línea de la Vida: 800 911 2000, disponible todos los días.' },
    ],
    question: '¿Puedes contactar ahora a emergencias o a una persona de confianza?',
    choices: ['Abrir opciones de ayuda', 'Puedo contactar a alguien', 'Necesito ver el número'],
    sourceIds: ['nice-self-harm', 'nimh-asq', 'linea-vida'], openHelp: true,
  }
}
