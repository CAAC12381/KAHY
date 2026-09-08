import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'

import siteConfiguration from './.figma/make/site.json'
import { detectSafetySignal } from './src/mock/conversation'

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === 'development'

  // Vite only auto-exposes VITE_-prefixed vars to client code; server-side
  // plugins (like kahyAiApi below) read process.env directly, so .env files
  // must be merged in here explicitly or OPENAI_API_KEY never reaches them.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      kahyAiApi(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: { ignored: ['**/.figma/**'] },
    },
    preview: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})

type KahyChatMessage = { role: 'user' | 'assistant'; content: string }

const KAHY_REPLY_SCHEMA = {
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
      minItems: 2,
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

const KAHY_SYSTEM_PROMPT = `Eres el motor de orientación de KAHY para personas adultas en México. Responde siempre en español claro, cálido y directo.

Tu función es ayudar a ordenar problemas cotidianos, proponer siguientes pasos concretos y facilitar conexión con apoyo humano. No eres psicólogo, médico ni servicio de emergencia. No diagnostiques, no asegures que comprendes emociones, no prometas confidencialidad absoluta y no clasifiques riesgo en bajo/medio/alto.

Reglas:
1. No reduzcas la respuesta a respirar. Separa situación, impacto y siguiente decisión.
2. Usa enfoque informado por trauma y neuroafirmativo. No fuerces detalles ni patologices.
3. Para consumo, no indiques suspensiones bruscas ni ajustes médicos. Señala urgencias físicas y atención profesional.
4. Si existe intención explícita de autolesión, suicidio, violencia actual, sobredosis, inconsciencia o dificultad respiratoria, usa mode=safety, topic=seguridad, openHelp=true. Indica 911, Línea de la Vida 800 911 2000, contacto humano inmediato y alejarse de medios de daño. No continúes con exploración profunda.
5. No inventes especialistas, teléfonos, disponibilidad ni servicios locales. El directorio actual es demostrativo.
6. Haz una sola pregunta de seguimiento y ofrece entre dos y cuatro respuestas rápidas.
7. La lectura de contexto debe describirse como posibilidad, nunca como diagnóstico.
8. Las acciones deben ser observables, realistas y divididas por horizonte temporal.
9. No pidas nombre, domicilio, ubicación exacta ni información identificable.
10. Usa sourceIds únicamente de este catálogo: who-ai-health (gobernanza y límites de IA), nice-self-harm (no usar escalas para predecir o estratificar suicidio), nimh-asq (una señal positiva requiere evaluación humana), mexico-privacy (datos de salud sensibles), linea-vida (recurso oficial 800 911 2000), who-pfa (primeros auxilios psicológicos), who-selfhelp (autoayuda de bajo riesgo), nice-depression, nice-panic-anxiety, nice-ptsd, nice-adhd, nice-autism (guías clínicas NICE por tema), phq9-gad7-mx, pcl5-mx (validación mexicana de instrumentos de tamizaje, nunca los apliques ni los puntúes tú), nida-language (lenguaje sin estigma sobre consumo), conasama-cecosama (red real de centros en Michoacán), inegi-suicidio (estadística nacional).
11. Para el tema medicación, nunca sugieras iniciar, suspender o cambiar una dosis; remite siempre a quien recetó o a un farmacéutico.
12. openHelp debe ser true únicamente cuando mode=safety; en cualquier otro caso debe ser false.
13. No apliques ni puntúes tú mismo cuestionarios como PHQ-9, GAD-7, PCL-5 o ASRS dentro del chat; si preguntan por ellos, remite a la sección de Tamizaje de la app, aclarando que un resultado no es diagnóstico.

Devuelve únicamente el objeto solicitado por el esquema.`

type AiProviderName = 'groq' | 'openai'
type ResolvedProvider = { name: AiProviderName; apiKey: string; model: string }

/**
 * Groq is checked first: it's the free tier, so it's the sensible default
 * once both keys happen to be configured. Falls back to OpenAI so an
 * existing OPENAI_API_KEY keeps working without any config change.
 */
function resolveProvider(): ResolvedProvider | null {
  if (process.env.GROQ_API_KEY) {
    return { name: 'groq', apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' }
  }
  if (process.env.OPENAI_API_KEY) {
    return { name: 'openai', apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-5.5' }
  }
  return null
}

function kahyAiApi(): Plugin {
  const requestLog = new Map<string, number[]>()

  return {
    name: 'kahy-ai-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/kahy/status', (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        const resolved = resolveProvider()
        res.end(JSON.stringify({
          configured: Boolean(resolved),
          provider: resolved?.name === 'groq' ? 'Groq' : 'OpenAI',
          model: resolved?.model,
        }))
      })

      server.middlewares.use('/api/kahy/chat', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'Método no permitido.' }))
        }

        const resolved = resolveProvider()
        if (!resolved) {
          res.statusCode = 503
          return res.end(JSON.stringify({ code: 'AI_NOT_CONFIGURED', error: 'La IA todavía no tiene una clave configurada en el servidor.' }))
        }

        const clientId = req.socket.remoteAddress || 'local'
        const now = Date.now()
        const recent = (requestLog.get(clientId) || []).filter((time) => now - time < 60_000)
        if (recent.length >= 12) {
          res.statusCode = 429
          return res.end(JSON.stringify({ code: 'RATE_LIMIT', error: 'Espera un momento antes de enviar otro mensaje.' }))
        }
        recent.push(now)
        requestLog.set(clientId, recent)

        try {
          const body = await readJsonBody(req)
          const messages = sanitizeMessages(body?.messages)
          const latest = [...messages].reverse().find((message) => message.role === 'user')?.content || ''
          const safetyContext = messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content).join('\n')
          if (!latest) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Escribe un mensaje para continuar.' }))
          }

          // The moderation endpoint is OpenAI-specific; local regex coverage
          // (safetyPatterns in src/mock/conversation.ts, mirrored here) is
          // what actually catches the Groq path.
          const safetyDetected = localSafetyCheck(safetyContext)
            || (resolved.name === 'openai' && await moderationSafetyCheck(resolved.apiKey, safetyContext))
          if (safetyDetected) return res.end(JSON.stringify({ reply: serverSafetyReply(), provider: 'safety-protocol' }))

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
          res.end(JSON.stringify({ reply, provider: resolved.name }))
        } catch (error) {
          console.error('[KAHY AI]', error instanceof Error ? error.message : error)
          res.statusCode = 502
          res.end(JSON.stringify({ code: 'AI_UNAVAILABLE', error: 'La IA no está disponible en este momento. Se usará la orientación local.' }))
        }
      })
    },
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

async function readJsonBody(req: IncomingMessage) {
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

/**
 * Delegates to the same safetyPatterns used by the client-side local
 * fallback (src/mock/conversation.ts) so the two never drift apart — a
 * phrase missed here is a false negative on a real crisis signal (see
 * KAHY's evidence guide, rule: never rely on model judgement alone for
 * this layer).
 */
function localSafetyCheck(text: string) {
  return detectSafetySignal(text)
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

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const googleAnalyticsId = sanitizeHtmlValue(config.analytics?.googleAnalyticsId)
  const headStart = config.customScripts?.headStart ?? ''
  const headEnd = config.customScripts?.headEnd ?? ''
  const bodyStart = config.customScripts?.bodyStart ?? ''
  const bodyEnd = config.customScripts?.bodyEnd ?? ''
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'figma-site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, 'figma:lang', language)
        result = replaceHtmlCommentSlot(result, 'figma:title', escapeHtmlText(title))
        result = replaceHtmlCommentSlot(result, 'figma:head-start', headStart)
        result = replaceHtmlCommentSlot(result, 'figma:head-end', headEnd)
        result = replaceHtmlCommentSlot(result, 'figma:body-start', bodyStart)
        result = replaceHtmlCommentSlot(result, 'figma:body-end', bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (favicon) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'figma-bypass-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: 'figma-error-overlay-replay',
    apply: 'serve',
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (...args: any[]) => void
      server.ws.send = ((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === 'error') {
            lastError = payload as object
          } else if (type === 'update' || type === 'full-reload') {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send

      server.ws.on('connection', (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'figma-react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: { storiesGlob: string | string[] }): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob) ? options.storiesGlob : [options.storiesGlob]
  const ROUTE = '/.figma/make/kit.html'
  const VIRTUAL_ID = 'virtual:figma-stories'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: 'figma-make-kit',
    apply: 'serve',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.split('?')[0] !== ROUTE) return next()

        try {
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}
