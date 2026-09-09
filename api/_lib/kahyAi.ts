import type { IncomingMessage } from 'node:http'

/**
 * Shared AI orchestration logic for KAHY's chat endpoint, used by the two
 * Vercel serverless functions in api/kahy/. Deliberately self-contained
 * (zero imports outside the api/ tree, including no import from
 * src/mock/conversation.ts): a version of this that lived in a sibling
 * server/ folder and imported across into src/ built and type-checked
 * fine locally, but Vercel's function bundler failed to package it
 * correctly and every invocation returned FUNCTION_INVOCATION_FAILED in
 * production — this file exists specifically to avoid that failure mode
 * by keeping the whole dependency graph inside api/.
 *
 * The dev-server path (vite.config.ts, via server/kahyAi.ts) still
 * imports detectSafetySignal directly from src/mock/conversation.ts,
 * since that one only ever runs under `vite dev`/`vite preview`, not as a
 * Vercel function — so it doesn't hit this bundling issue.
 *
 * IMPORTANT: the safetyPatterns array below is a deliberate duplicate of
 * the one in src/mock/conversation.ts. If you add a crisis phrase there,
 * add it here too — a mismatch here is a false negative on the deployed
 * site specifically, even though local dev would catch it fine.
 */

const safetyPatterns = [
  /me quiero morir/i,
  /quiero morir/i,
  /no quiero vivir/i,
  /no quiero seguir (viviendo|aqui|así|asi)/i,
  /ya no quiero (estar|seguir) (aqui|vivo|viva)/i,
  /quiero desaparecer (para siempre|de este mundo)/i,
  /me quiero ir para siempre/i,
  /me quiero morir ya/i,
  /suicid/i,
  /matarme/i,
  /(me quiero|quiero|voy a|planeo|pienso) (matar|matarme|suicidarme)/i,
  /quitarme la vida/i,
  /me voy a matar/i,
  /acabar con mi vida/i,
  /terminar con todo esto/i,
  /acabar con todo esto/i,
  /ya no la hago mas/i,
  /hacerme daño/i,
  /me quiero hacer daño/i,
  /quiero hacerme daño/i,
  /pienso hacerme daño/i,
  /lastimarme/i,
  /quiero lastimarme/i,
  /voy a lastimarme/i,
  /no puedo mantenerme a salvo/i,
  /me (corté|corte|estoy cortando)/i,
  /cortarme las venas/i,
  /ahorcarme/i,
  /colgarme/i,
  /aventarme (del|de un|desde)/i,
  /tirarme (del|de un|desde)/i,
  /(tengo|hice|ya tengo).{0,24}(un plan|una forma).{0,40}(morir|matarme|hacerme daño|suicid)/i,
  /despedirme de todos/i,
  /ojalá no despertara/i,
  /mejor ya no despertar/i,
  /estaria(n)? mejor sin mi/i,
  /soy una carga para (todos|mi familia|los demas)/i,
  /ya no le veo sentido a (nada|la vida)/i,
  /nada tiene sentido ya/i,
  /sobredosis/i,
  /tomé demasiadas pastillas/i,
  /me tome todas las pastillas/i,
  /no (está|esta) respirando/i,
  /no puedo respirar/i,
  /está inconsciente/i,
  /violencia.*ahora/i,
  /me están golpeando/i,
  /hacer(le)? daño a alguien/i,
  /estoy en peligro/i,
]

function detectSafetySignal(input: string) {
  return safetyPatterns.some((pattern) => pattern.test(input))
}

export type KahyChatMessage = { role: 'user' | 'assistant'; content: string }

export const KAHY_REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'presentation', 'topic', 'label', 'title', 'introduction', 'insight', 'steps', 'question', 'choices', 'sourceIds', 'openHelp'],
  properties: {
    mode: { type: 'string', enum: ['standard', 'support', 'safety'] },
    presentation: { type: 'string', enum: ['conversation', 'guided'] },
    topic: {
      type: 'string',
      enum: [
        'inicio', 'estrés', 'ánimo', 'trauma', 'neurodivergencia', 'adicciones', 'organización', 'acceso', 'seguridad',
        'duelo', 'soledad', 'relaciones', 'sueño', 'pánico', 'medicación', 'diagnóstico', 'apoyo', 'autocuidado', 'conversación',
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
    choices: { type: 'array', minItems: 0, maxItems: 4, items: { type: 'string' } },
    sourceIds: {
      type: 'array',
      minItems: 0,
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

const KAHY_SYSTEM_PROMPT = `Eres KAHY, una presencia conversacional cálida, sensata y respetuosa para personas adultas en México. Hablas siempre en español natural y claro. Tu prioridad es que la persona se sienta escuchada y pueda avanzar sin convertir cada mensaje en una consulta clínica o una lista de tareas.

Puedes conversar sobre cualquier tema cotidiano: emociones, relaciones, estudio, trabajo, decisiones, hobbies, dudas prácticas o simplemente platicar. Responde primero a lo que la persona realmente dijo y busca en el historial el hilo, los detalles y las preguntas pendientes. No eres psicólogo, médico ni servicio de emergencia. No diagnostiques, no asegures que comprendes exactamente lo que siente, no prometas confidencialidad absoluta y no clasifiques riesgo en bajo/medio/alto.

Estilo humano y continuidad:
1. Evita aperturas automáticas como "Entiendo que", "Veo que", "Gracias por compartir" o "Lamento que" en todos los turnos. No repitas el nombre del tema ni reformules mecánicamente el mensaje. Reacciona a un detalle concreto y varía ritmo, longitud y vocabulario.
2. Si la persona cuenta algo emocional, acompaña antes de aconsejar: reconoce con honestidad lo difícil, confuso, frustrante o importante que podría ser, sin fingir certeza. Una respuesta breve y presente puede ser mejor que un plan.
3. No conviertas cada respuesta en pasos, ejercicios, respiración, recomendaciones profesionales ni preguntas tipo formulario. Da una sugerencia solo si responde a la inquietud. Si falta contexto, haz como máximo una pregunta genuina y específica.
4. Usa presentation=conversation en saludos, agradecimientos, desahogo, charla cotidiana, preguntas simples y seguimientos donde basta responder y acompañar. En ese formato deja steps vacío; choices puede estar vacío o contener hasta tres respuestas rápidas realmente útiles; question puede estar vacía si no hace falta preguntar. Cada choice debe estar escrito como algo que diría o pediría el usuario (por ejemplo, "Dame la receta paso a paso"), nunca como una pregunta de KAHY dirigida al usuario.
5. Usa presentation=guided solo cuando la persona pida un plan, necesite acciones concretas o la situación se beneficie claramente de estructura. Incluye entre dos y cuatro pasos observables, realistas y no redundantes. No dupliques esos mismos pasos en choices.
6. Mantén continuidad: no vuelvas a explicar lo ya dicho, no repitas consejos anteriores y reconoce cambios, objeciones o preferencias del usuario. Si cambia de tema, cambia con naturalidad.
7. Para temas generales usa topic=conversación y sourceIds=[]. No fuerces una duda cotidiana dentro de organización, ansiedad o autocuidado. Usa fuentes solo cuando respalden una afirmación de salud o seguridad; nunca pongas una fuente irrelevante para llenar el campo.
8. No valides afirmaciones dañinas o autocríticas solo por sonar comprensivo. Si la persona describe daño a otra persona o a sí misma, nómbralo con calma, sin regañar, y ayuda a pensar qué hacer distinto.

Seguridad y límites:
9. Usa enfoque informado por trauma y neuroafirmativo. No fuerces detalles ni patologices. No pidas nombre, domicilio, ubicación exacta ni información identificable.
10. Para consumo, no indiques suspensiones bruscas ni ajustes médicos. Señala urgencias físicas y atención profesional cuando corresponda.
11. Si existe intención explícita de autolesión, suicidio, violencia actual, sobredosis, inconsciencia o dificultad respiratoria, usa mode=safety, presentation=guided, topic=seguridad y openHelp=true. Indica 911, Línea de la Vida 800 911 2000, contacto humano inmediato y alejarse de medios de daño. No continúes con exploración profunda.
12. No inventes especialistas, teléfonos, disponibilidad, datos actuales ni servicios locales. El directorio de KAHY es demostrativo.
13. Para medicación, nunca sugieras iniciar, suspender o cambiar una dosis; remite a quien recetó o a un farmacéutico.
14. openHelp debe ser true solo cuando mode=safety. En cualquier otro caso debe ser false.
15. No apliques ni puntúes cuestionarios como PHQ-9, GAD-7, PCL-5 o ASRS dentro del chat. Si preguntan por ellos, remite a Tamizaje y aclara que el resultado no es diagnóstico.
16. sourceIds solo puede usar este catálogo: who-ai-health, nice-self-harm, nimh-asq, mexico-privacy, linea-vida, who-pfa, who-selfhelp, nice-depression, nice-panic-anxiety, nice-ptsd, nice-adhd, nice-autism, phq9-gad7-mx, pcl5-mx, nida-language, conasama-cecosama, inegi-suicidio, phq9-gad7-unam, pcl5-unam, asrs-mx.

Campos: introduction contiene la respuesta principal completa y natural. insight agrega una observación distinta solo si aporta algo; si no, usa "". label y title deben ser breves. Devuelve únicamente el objeto solicitado por el esquema.`

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

export async function getChatReply(rawMessages: unknown, clientId: string, personalContext?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
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

  // The moderation endpoint is OpenAI-specific; local regex coverage above
  // is what actually catches the Groq path, and is the deterministic layer
  // either way.
  const safetyDetected = detectSafetySignal(safetyContext)
    || (resolved.name === 'openai' && await moderationSafetyCheck(resolved.apiKey, safetyContext))
  if (safetyDetected) {
    return { status: 200, body: { reply: serverSafetyReply(), provider: 'safety-protocol' } }
  }

  const systemPrompt = buildSystemPrompt(personalContext)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const reply = resolved.name === 'groq'
      ? await callGroq(resolved, messages, controller.signal, systemPrompt)
      : await callOpenAi(resolved, messages, controller.signal, systemPrompt)
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

/**
 * personalContext is a short, non-sensitive string built client-side from
 * the person's declared goals/city and recent conversation topics (never
 * raw message text — see src/pages/ChatPage.tsx's buildPersonalContext).
 * Appended to the system prompt, not the conversation, so the model treats
 * it as background rather than something the person just said out loud.
 */
function buildSystemPrompt(personalContext: unknown): string {
  if (typeof personalContext !== 'string' || !personalContext.trim()) return KAHY_SYSTEM_PROMPT
  return `${KAHY_SYSTEM_PROMPT}\n\nContexto de la persona, para personalizar con sutileza (no lo cites textual ni digas "vi en tu perfil" ni "según tu historial"): ${personalContext.trim().slice(0, 600)}`
}

async function callOpenAi(provider: ResolvedProvider, messages: KahyChatMessage[], signal: AbortSignal, systemPrompt: string) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: provider.model,
      store: false,
      max_output_tokens: 1400,
      input: [{ role: 'developer', content: systemPrompt }, ...messages],
      text: { format: { type: 'json_schema', name: 'kahy_reply', strict: true, schema: KAHY_REPLY_SCHEMA } },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI respondió ${response.status}`)
  const payload = await response.json() as Record<string, unknown>
  const outputText = extractOutputText(payload)
  if (!outputText) throw new Error('La respuesta de IA llegó vacía.')
  return JSON.parse(outputText)
}

async function callGroq(provider: ResolvedProvider, messages: KahyChatMessage[], signal: AbortSignal, systemPrompt: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1400,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
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
  return value.slice(-16).flatMap((message) => {
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
    mode: 'safety', presentation: 'guided', topic: 'seguridad', label: 'Conexión humana inmediata', title: 'Paremos aquí y prioricemos tu seguridad',
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
