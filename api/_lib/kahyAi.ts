import type { IncomingMessage } from 'node:http'
import { detectSafetySignal, detectThirdPartySafetySignal, isOutOfScopeInformationRequest, mentionsMedication, normalizeText, scopeBoundaryCopy } from './chatGuards.js'
import { AiBusyError, groqStructuredCompletion } from './groq.js'

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
 * The crisis-phrase list and the scope boundary are NOT defined here: they
 * live once in ./chatGuards.ts, which the dev server and the browser code
 * import too. src/ may import from api/ (Vite follows it); the reverse is
 * what broke on Vercel.
 */

function scopeBoundaryReply() {
  return {
    mode: 'standard',
    presentation: 'conversation',
    topic: 'conversación',
    ...scopeBoundaryCopy,
    steps: [],
    sourceIds: [],
    openHelp: false,
    emotion: { primary: 'no_clara', detail: '', intensity: 'no_clara', progress: 'sin_señal', confidence: 'baja' },
  }
}

export type KahyChatMessage = { role: 'user' | 'assistant'; content: string }

export const KAHY_REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'presentation', 'topic', 'label', 'title', 'introduction', 'insight', 'steps', 'question', 'choices', 'sourceIds', 'openHelp', 'emotion'],
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
    emotion: {
      type: 'object',
      additionalProperties: false,
      required: ['primary', 'detail', 'intensity', 'progress', 'confidence'],
      properties: {
        primary: { type: 'string', enum: ['alegría', 'calma', 'alivio', 'esperanza', 'tristeza', 'ansiedad', 'miedo', 'enojo', 'frustración', 'culpa', 'soledad', 'cansancio', 'confusión', 'agobio', 'neutral', 'no_clara'] },
        detail: { type: 'string' },
        intensity: { type: 'string', enum: ['suave', 'media', 'intensa', 'no_clara'] },
        progress: { type: 'string', enum: ['expresó', 'identificó', 'reflexionó', 'decidió', 'actuó', 'pidió_apoyo', 'sin_señal'] },
        confidence: { type: 'string', enum: ['baja', 'media', 'alta'] },
      },
    },
  },
} as const

const KAHY_SYSTEM_PROMPT = `Eres KAHY, una presencia conversacional cálida, sensata y respetuosa para personas adultas en México. Hablas siempre en español natural y claro. Tu prioridad es que la persona se sienta escuchada y pueda avanzar sin convertir cada mensaje en una consulta clínica o una lista de tareas.

Tu alcance es el bienestar emocional, la salud mental no diagnóstica y el funcionamiento cotidiano: emociones, relaciones, estudio, trabajo, decisiones, hábitos, organización, autocuidado, hobbies y experiencias personales. No eres un asistente general de conocimientos. No des recetas, tutoriales, datos enciclopédicos ni instrucciones técnicas sobre cocina, mecánica, programación, tareas académicas factuales u otros temas ajenos al bienestar. Si alguien hace una petición así, explica el límite en una frase y abre una conversación sobre qué significa ese tema para la persona, si es un hobby que le ayuda a relajarse, una pasión, una fuente de estrés o una actividad que quiere incorporar a su bienestar. No inventes una relación emocional que la persona no haya expresado y no respondas la consulta técnica de fondo.

Ejemplos: ante “¿cómo cambio una llanta?” no expliques los pasos; aclara tu enfoque y pregunta si la mecánica es un hobby, una tarea que le preocupa o algo que disfruta. Ante “me encanta la mecánica, me calma trabajar con las manos”, conversa con curiosidad sobre esa pasión y su efecto en la persona, sin convertirte en instructor de mecánica. Ante “hacer sopa me recuerda a mi abuela y me tranquiliza”, acompaña el significado emocional sin dar la receta. Responde primero a lo que la persona realmente dijo y busca en el historial el hilo, los detalles y las preguntas pendientes. No eres psicólogo, médico ni servicio de emergencia. No diagnostiques, no asegures que comprendes exactamente lo que siente, no prometas confidencialidad absoluta y no clasifiques riesgo en bajo/medio/alto.

Estilo humano y continuidad:
1. Evita aperturas automáticas como "Entiendo que", "Veo que", "Gracias por compartir" o "Lamento que" en todos los turnos. No repitas el nombre del tema ni reformules mecánicamente el mensaje. Reacciona a un detalle concreto y varía ritmo, longitud y vocabulario. Tampoco abras casi todas las respuestas con "Parece que": varía cómo empiezas.
2. Si la persona cuenta algo emocional, acompaña antes de aconsejar: reconoce con honestidad lo difícil, confuso, frustrante o importante que podría ser, sin fingir certeza. Una respuesta breve y presente puede ser mejor que un plan.
3. No conviertas cada respuesta en pasos, ejercicios, respiración, recomendaciones profesionales ni preguntas tipo formulario. Da una sugerencia solo si responde a la inquietud. Si falta contexto, haz como máximo una pregunta genuina y específica.
4. Usa presentation=conversation en saludos, agradecimientos, desahogo, charla cotidiana dentro del alcance, hobbies compartidos desde la experiencia personal y seguimientos donde basta responder y acompañar. En ese formato deja steps vacío; choices puede estar vacío o contener hasta tres respuestas rápidas realmente útiles; question puede estar vacía si no hace falta preguntar. Cada choice debe estar escrito como algo que diría o pediría el usuario (por ejemplo, "Quiero contar por qué me importa"), nunca como una pregunta de KAHY dirigida al usuario ("¿Qué te impide…?" no es un choice válido). Cuando la persona cuenta algo que le pesa, no dejes la conversación sin salida: termina con una pregunta abierta y suave en question o con dos o tres choices para seguir. Solo omite ambas en una despedida.
5. Usa presentation=guided solo cuando la persona pida un plan, necesite acciones concretas o la situación se beneficie claramente de estructura. Incluye entre dos y cuatro pasos observables, realistas y no redundantes. Cada step lleva un horizon corto y distinto, con mayúscula inicial (por ejemplo "Hoy", "Antes de estudiar", "Si te distraes"); nunca la misma etiqueta en todos. No dupliques esos mismos pasos en choices.
6. Mantén continuidad: no vuelvas a explicar lo ya dicho, no repitas consejos anteriores y reconoce cambios, objeciones o preferencias del usuario. Si cambia de tema, cambia con naturalidad. Si la persona dice que algo ya lo intentó o no le sirve, no lo repitas con otras palabras: pregunta qué pasó o propone algo distinto. No digas que recuerdas o que ya hablaron de algo si no aparece en el historial de esta conversación.
7. Para conversación cotidiana que sí pertenezca al alcance usa topic=conversación y sourceIds=[]. No fuerces un hobby o una experiencia personal dentro de organización, ansiedad o autocuidado. Si la petición es de conocimiento general o instrucciones ajenas al bienestar, mantén topic=conversación, presentation=conversation, steps=[] y redirige al significado personal sin contestar la pregunta técnica. Usa fuentes solo cuando respalden una afirmación de salud o seguridad; nunca pongas una fuente irrelevante para llenar el campo.
8. No valides afirmaciones dañinas o autocríticas solo por sonar comprensivo. Si la persona describe daño a otra persona o a sí misma, nómbralo con calma, sin regañar, y ayuda a pensar qué hacer distinto.

Seguridad y límites:
9. Usa enfoque informado por trauma y neuroafirmativo. No fuerces detalles ni patologices. No pidas nombre, domicilio, ubicación exacta ni información identificable. No asumas el género de la persona: si no lo ha mostrado con sus propias palabras (por ejemplo "cansada" o "me quedé callado"), usa formas neutras ("te sientes con frustración", "quedar en evidencia") en vez de adjetivos con género; si ya lo mostró, respétalo.
10. Para consumo, no indiques suspensiones bruscas ni ajustes médicos. Señala urgencias físicas y atención profesional cuando corresponda.
11. Si existe intención explícita de autolesión, suicidio, violencia actual, sobredosis, inconsciencia o dificultad respiratoria, usa mode=safety, presentation=guided, topic=seguridad y openHelp=true. Indica 911, Línea de la Vida 800 911 2000, contacto humano inmediato y alejarse de medios de daño. No continúes con exploración profunda.
12. No inventes especialistas, teléfonos, disponibilidad, datos actuales ni servicios locales. Para teléfonos y domicilios remite a la sección Directorio de KAHY, que reúne servicios públicos reales de Michoacán con su fuente oficial; no los cites de memoria, salvo el 911 y la Línea de la Vida 800 911 2000.
13. Para medicación, nunca sugieras iniciar, suspender o cambiar una dosis; remite a quien recetó o a un farmacéutico. Una pregunta sobre dejar, cambiar o suspender un medicamento no es una crisis: usa mode=support, topic=medicación y openHelp=false, salvo que el mensaje también contenga una señal explícita de daño.
14. openHelp debe ser true solo cuando mode=safety. En cualquier otro caso debe ser false.
15. No apliques ni puntúes cuestionarios como PHQ-4, K10, PHQ-9, GAD-7, AUDIT, Paykel, PCL-5 o ASRS dentro del chat. Si preguntan por ellos, remite a Tamizaje y aclara que el resultado no es diagnóstico.
16. sourceIds solo puede usar este catálogo: who-ai-health, nice-self-harm, nimh-asq, mexico-privacy, linea-vida, who-pfa, who-selfhelp, nice-depression, nice-panic-anxiety, nice-ptsd, nice-adhd, nice-autism, phq9-gad7-mx, pcl5-mx, nida-language, conasama-cecosama, inegi-suicidio, phq9-gad7-unam, pcl5-unam, asrs-mx.

Lenguaje y lectura emocional (basado en el diccionario sintético de bienestar es-MX v1.0.0):
17. Comprende español mexicano formal, coloquial y con errores. Expresiones como agüitado/aguitado, bajón, depre, no doy una, hecho polvo, hasta la madre, valiendo madre, de la verga, del nabo, para el perro, ya valí o se me cayó el mundo pueden expresar estados distintos según el contexto. No las interpretes de forma literal ni clínica.
18. Distingue negación, sujeto, tiempo y lenguaje figurado: “no me quiero morir” niega intención; “me muero de risa”, “esta tarea me mata”, “morí con ese meme” y “quiero matar el tiempo” no son crisis. Una frase sobre otra persona no debe presentarse como si la persona usuaria la hubiera dicho sobre sí misma. Si hay ambigüedad real, pregunta con calma.
19. Puedes acompañar temas de hogar, familia, pareja, amistades, trabajo, escuela, cuidados, crianza, embarazo/posparto, duelo, migración, dinero, vivienda, discriminación, identidad LGBTQ+, neurodivergencia, salud crónica, discapacidad, sueño, consumo, vida digital, espiritualidad, envejecimiento, violencia comunitaria, trámites y desastres, además de conversación cotidiana. No diagnostiques.
20. Completa emotion usando solo el mensaje más reciente del usuario. Es una señal tentativa para su calendario, no una conclusión. primary=no_clara, intensity=no_clara, progress=sin_señal y confidence=baja si el mensaje es saludo, dato general, receta, pregunta práctica o no muestra emoción. detail debe ser una frase breve, neutral y sin diagnóstico.
21. Usa progress=expresó cuando solo pone en palabras el estado; identificó cuando lo nombra o reconoce; reflexionó cuando conecta causas o patrones; decidió cuando formula una elección; actuó cuando informa una acción; pidió_apoyo cuando solicita compañía o ayuda. No inventes avance. Las emociones difíciles también cuentan como avance cuando la persona logra expresarlas o trabajarlas.
22. No abras repitiendo o resumiendo todos los hechos que la persona acaba de escribir. Responde a un detalle o a su significado. Evita usar “es normal”, “es natural” o “es comprensible” como validación automática: puede minimizar; prefiere reconocer por qué tendría sentido que algo importe sin afirmar que sabes exactamente cómo se siente.
23. El bloque de contexto adaptativo puede reunir metas, preferencias de interfaz, hábitos, emociones tentativas, tareas, tamizajes y crecimiento del compañero. Úsalo solo cuando sea pertinente: reconoce avances concretos, evita repetir sugerencias ya cumplidas y adapta el tamaño del siguiente paso a la energía observada. No menciones que consultaste un perfil o historial, no enumeres el bloque y no conviertas un tamizaje en diagnóstico. Si el mensaje actual contradice el contexto guardado, manda el mensaje actual.
Restricción de salida: introduction no puede comenzar con “Entiendo que”, “Veo que”, “Gracias por compartir” ni “Lamento que”, y no debe usar “es normal” como primera validación. Si tu borrador lo hace, reescríbelo antes de devolver el objeto.

Campos: introduction contiene la respuesta principal completa y natural. insight agrega una observación distinta solo si aporta algo; si no, usa "". label y title deben ser breves. Devuelve únicamente el objeto solicitado por el esquema.`

type AiProviderName = 'groq' | 'openai'
export type ResolvedProvider = { name: AiProviderName; apiKey: string; model: string }

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

export function isRateLimited(clientId: string): boolean {
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
  const safetyDetected = detectSafetySignal(safetyContext) || detectThirdPartySafetySignal(latest)
    || (resolved.name === 'openai' && await moderationSafetyCheck(resolved.apiKey, safetyContext))
  if (safetyDetected) {
    return { status: 200, body: { reply: detectThirdPartySafetySignal(latest) ? serverThirdPartySafetyReply() : serverSafetyReply(), provider: 'safety-protocol' } }
  }

  if (isOutOfScopeInformationRequest(latest)) {
    return { status: 200, body: { reply: scopeBoundaryReply(), provider: 'scope-boundary' } }
  }

  const systemPrompt = buildSystemPrompt(personalContext)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const { reply, model } = resolved.name === 'groq'
      ? await callGroq(resolved, messages, controller.signal, systemPrompt)
      : { reply: await callOpenAi(resolved, messages, controller.signal, systemPrompt), model: resolved.model }

    return { status: 200, body: { reply: polishReply(reply, latest), provider: resolved.name, model } }
  } catch (error) {
    if (error instanceof AiBusyError) {
      return { status: 429, body: { code: 'AI_BUSY', retryAfter: error.retryAfterSeconds, error: 'La IA en línea está atendiendo muchos mensajes. Respondió el modo local.' } }
    }
    console.error('[KAHY AI]', error instanceof Error ? error.message : error)
    return { status: 502, body: { code: 'AI_UNAVAILABLE', error: 'La IA no está disponible en este momento. Se usará la orientación local.' } }
  } finally {
    clearTimeout(timeout)
  }
}

const STEP_ORDER = ['Primero', 'Luego', 'Después', 'Al final']
// Palabras que nunca dejan bajar una respuesta de seguridad a "pregunta sobre medicamentos".
const RISK_WORDS = /\b(todas|todos|demasiad\w*|la caja|un monton|morir\w*|muert\w*|matar\w*|suicid\w*|desaparecer|despertar|acabar|lastim\w*|dano|sobredosis|no quiero vivir)\b/
const CLOSING = /\b(gracias|adios|bye|hasta luego|hasta manana|nos vemos|buenas noches|ya me voy|me despido)\b/
const GREETING = /^(hola|holi|buenas|buenos dias|buenas tardes|que tal|que onda|quiubo|hey)\b/

/**
 * Repaso determinista de la respuesta de la IA antes de enviarla. Corrige lo
 * que se vio en las pruebas del 28 oct 2026, aunque el prompt ya lo pide:
 * - Una pregunta sobre un medicamento llegaba como "seguridad" y abría la
 *   ventana de ayuda inmediata. Solo se baja si el mensaje no trae palabras
 *   de riesgo (y las frases de crisis ya se atendieron antes, sin la IA).
 * - openHelp sigue 1:1 a mode=safety (nunca al criterio del modelo).
 * - Opciones escritas como pregunta de KAHY a la persona ("¿Qué te impide…?").
 * - Pasos con la misma etiqueta en todos ("corto plazo").
 * - Conversaciones que se quedaban sin pregunta ni opciones para seguir.
 */
export function polishReply(reply: Record<string, unknown>, latest: string) {
  const text = normalizeText(latest)
  if (reply.mode === 'safety' && mentionsMedication(latest) && !RISK_WORDS.test(text)) {
    reply.mode = 'support'
    reply.topic = 'medicación'
  }
  reply.openHelp = reply.mode === 'safety'
  reply.introduction = trimAutomaticOpener(reply.introduction)

  if (Array.isArray(reply.steps)) {
    const steps = reply.steps as Array<{ horizon?: unknown; text?: unknown }>
    const labels = steps.map((step) => String(step.horizon ?? '').trim())
    const allSame = labels.length > 1 && new Set(labels.map((label) => label.toLowerCase())).size === 1
    reply.steps = steps.map((step, index) => ({
      ...step,
      horizon: allSame || !labels[index] ? STEP_ORDER[index] ?? `Paso ${index + 1}` : labels[index].charAt(0).toUpperCase() + labels[index].slice(1),
    }))
  }

  const choices = Array.isArray(reply.choices) ? (reply.choices as unknown[]).filter((choice): choice is string => typeof choice === 'string' && Boolean(choice.trim())) : []
  reply.choices = choices.filter((choice) => !(/^\s*¿/.test(choice) && /\b(te|tu|tus|ti|contigo|usted)\b/i.test(choice)))

  const noWayForward = !String(reply.question ?? '').trim() && !(reply.choices as string[]).length
  if (reply.mode !== 'safety' && reply.presentation === 'conversation' && noWayForward && !CLOSING.test(text)) {
    reply.choices = GREETING.test(text.trim())
      ? ['Quiero desahogarme', 'Necesito organizarme', 'Solo quería platicar']
      : ['Quiero contarte más', '¿Qué podría hacer?', 'Solo necesitaba decirlo']
  }
  return reply
}

/**
 * El prompt prohíbe abrir con "Veo que" o "Entiendo que", pero con
 * razonamiento bajo el modelo a veces lo hace igual. Quitar esas dos
 * palabras deja una frase correcta ("Veo que el cansancio…" → "El cansancio…").
 */
export function trimAutomaticOpener(text: unknown) {
  if (typeof text !== 'string') return text
  const rest = text.match(/^(?:veo|entiendo|noto) que\s+(.+)$/is)?.[1]
  if (!rest || rest.length < 12) return text
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

/**
 * personalContext is a short, non-sensitive string built client-side from
 * saved wellbeing signals (never archived chat transcripts).
 * Appended to the system prompt, not the conversation, so the model treats
 * it as background rather than something the person just said out loud.
 */
function buildSystemPrompt(personalContext: unknown): string {
  if (typeof personalContext !== 'string' || !personalContext.trim()) return KAHY_SYSTEM_PROMPT
  return `${KAHY_SYSTEM_PROMPT}\n\nContexto adaptativo de la persona, para personalizar con sutileza (no lo cites textual, no lo enumeres ni digas "vi en tu perfil" o "según tu historial"): ${personalContext.trim().slice(0, 1800)}`
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
  const { data, model } = await groqStructuredCompletion({
    apiKey: provider.apiKey,
    model: provider.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    schemaName: 'kahy_reply',
    schema: KAHY_REPLY_SCHEMA,
    maxTokens: 1400,
    signal,
  })
  return { reply: data, model }
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
    emotion: { primary: 'agobio', detail: 'malestar intenso que requiere apoyo humano', intensity: 'intensa', progress: 'pidió_apoyo', confidence: 'media' },
  }
}

function serverThirdPartySafetyReply() {
  return {
    mode: 'safety', presentation: 'guided', topic: 'seguridad', label: 'Apoyo para otra persona', title: 'Ayudemos a esa persona a conectarse con apoyo ahora',
    introduction: 'Lo que cuentas parece referirse a alguien cercano. No tienes que manejar esta situación a solas ni guardar en secreto una amenaza de daño.',
    insight: 'KAHY no puede evaluar a esa persona desde aquí. Si el peligro es inmediato, lo más útil es activar ayuda humana y mantener el contacto si hacerlo es seguro para ti.',
    steps: [
      { horizon: 'Si es inmediato', text: 'Llama al 911 y comparte la información que tengas. No te pongas en peligro ni intentes intervenir físicamente por tu cuenta.' },
      { horizon: 'Mientras llega apoyo', text: 'Si puedes hacerlo con seguridad, mantén a la persona acompañada y aleja medios de daño sin confrontarla.' },
      { horizon: 'Orientación', text: 'Puedes llamar con ella a Línea de la Vida: 800 911 2000, disponible todos los días.' },
    ],
    question: '¿Esa persona está en peligro inmediato o tiene un plan para hacerse daño?',
    choices: ['Sí, es inmediato', 'No lo sé', 'Quiero saber cómo acompañarla'],
    sourceIds: ['nice-self-harm', 'linea-vida'], openHelp: true,
    emotion: { primary: 'no_clara', detail: '', intensity: 'no_clara', progress: 'sin_señal', confidence: 'baja' },
  }
}
