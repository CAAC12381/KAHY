import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

import siteConfiguration from './.figma/make/site.json'
import { getChatReply, getStatusPayload, readJsonBody } from './server/kahyAi'
import {
  ensureSchema, getProfile, upsertProfile, deleteAllDataForDevice,
  listScreenings, addScreening,
  listChatMemory, addChatMemory, clearChatMemory,
  getPetGarden, upsertPetGarden,
} from './api/_lib/db'

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
      kahyDataApi(),
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

/**
 * Dev-server middleware: the actual chat/status logic lives in
 * server/kahyAi.ts, shared with the Vercel serverless functions under
 * api/kahy/ that serve the deployed production build (Vite plugins with
 * `apply: 'serve'` never run outside `vite dev`/`vite preview`).
 */
function kahyAiApi(): Plugin {
  return {
    name: 'kahy-ai-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/kahy/status', (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(getStatusPayload()))
      })

      server.middlewares.use('/api/kahy/chat', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'Método no permitido.' }))
        }

        const body = await readJsonBody(req) as { messages?: unknown; context?: unknown }
        const clientId = req.socket.remoteAddress || 'local'
        const { status, body: responseBody } = await getChatReply(body?.messages, clientId, body?.context)
        res.statusCode = status
        res.end(JSON.stringify(responseBody))
      })
    },
  }
}

/**
 * Dev-server equivalent of api/data/*.ts (Postgres-backed persistence) —
 * same reasoning as kahyAiApi() above: Vite plugins never run in the
 * deployed build, so the real routes Vercel serves live under api/data/.
 * This just gives `npm run dev` the same endpoints, reusing api/_lib/db.ts
 * directly (Vite's own resolver has no trouble crossing this boundary —
 * it's specifically Vercel's function bundler that can't, see kahyAi.ts).
 */
function kahyDataApi(): Plugin {
  function getDeviceIdFromQuery(url: string | undefined): string | null {
    const query = new URLSearchParams((url || '').split('?')[1] || '')
    return query.get('deviceId')
  }

  return {
    name: 'kahy-data-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/data/profile', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        await ensureSchema()
        if (req.method === 'GET') {
          const deviceId = getDeviceIdFromQuery(req.url)
          if (!deviceId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId.' })) }
          const profile = await getProfile(deviceId)
          return res.end(JSON.stringify({ profile }))
        }
        if (req.method === 'PUT') {
          const body = await readJsonBody(req) as { deviceId?: string; profile?: Record<string, unknown> }
          if (!body.deviceId || !body.profile) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId o profile.' })) }
          await upsertProfile(body.deviceId, {
            name: typeof body.profile.name === 'string' ? body.profile.name : 'Invitado',
            companionType: typeof body.profile.companionType === 'string' ? body.profile.companionType : 'mascota',
            mascot: typeof body.profile.mascot === 'string' ? body.profile.mascot : 'vaca',
            flower: typeof body.profile.flower === 'string' ? body.profile.flower : 'Clavel',
            city: typeof body.profile.city === 'string' ? body.profile.city : 'Morelia',
            goals: Array.isArray(body.profile.goals) ? body.profile.goals as string[] : [],
            preferences: (body.profile.preferences as Record<string, unknown> | undefined) || {},
          })
          return res.end(JSON.stringify({ ok: true }))
        }
        if (req.method === 'DELETE') {
          const deviceId = getDeviceIdFromQuery(req.url)
          if (!deviceId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId.' })) }
          await deleteAllDataForDevice(deviceId)
          return res.end(JSON.stringify({ ok: true }))
        }
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Método no permitido.' }))
      })

      server.middlewares.use('/api/data/screenings', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        await ensureSchema()
        if (req.method === 'GET') {
          const deviceId = getDeviceIdFromQuery(req.url)
          if (!deviceId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId.' })) }
          const results = await listScreenings(deviceId)
          return res.end(JSON.stringify({ results }))
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req) as { deviceId?: string; result?: Record<string, unknown> }
          const result = body.result
          if (!body.deviceId || !result || typeof result.id !== 'string' || typeof result.completedAt !== 'number' || !Array.isArray(result.answers) || typeof result.score !== 'number' || typeof result.band !== 'string') {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Falta deviceId o el resultado es inválido.' }))
          }
          await addScreening(body.deviceId, {
            id: result.id, completedAt: result.completedAt, answers: result.answers as number[],
            score: result.score, band: result.band, item9Positive: result.item9Positive as boolean | undefined,
          })
          return res.end(JSON.stringify({ ok: true }))
        }
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Método no permitido.' }))
      })

      server.middlewares.use('/api/data/chat-memory', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        await ensureSchema()
        if (req.method === 'GET') {
          const deviceId = getDeviceIdFromQuery(req.url)
          if (!deviceId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId.' })) }
          const entries = await listChatMemory(deviceId)
          return res.end(JSON.stringify({ entries }))
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req) as { deviceId?: string; topic?: string }
          if (!body.deviceId || typeof body.topic !== 'string' || !body.topic) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Falta deviceId o topic.' }))
          }
          await addChatMemory(body.deviceId, body.topic)
          return res.end(JSON.stringify({ ok: true }))
        }
        if (req.method === 'DELETE') {
          const deviceId = getDeviceIdFromQuery(req.url)
          if (!deviceId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId.' })) }
          await clearChatMemory(deviceId)
          return res.end(JSON.stringify({ ok: true }))
        }
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Método no permitido.' }))
      })

      server.middlewares.use('/api/data/pet-garden', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        await ensureSchema()
        if (req.method === 'GET') {
          const deviceId = getDeviceIdFromQuery(req.url)
          if (!deviceId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Falta deviceId.' })) }
          const state = await getPetGarden(deviceId)
          return res.end(JSON.stringify({ state }))
        }
        if (req.method === 'PUT') {
          const body = await readJsonBody(req) as { deviceId?: string; state?: Record<string, unknown> }
          const state = body.state
          if (!body.deviceId || !state || typeof state.happiness !== 'number' || typeof state.bond !== 'number' || typeof state.progress !== 'number' || typeof state.lastCare !== 'number') {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Falta deviceId o el estado es inválido.' }))
          }
          await upsertPetGarden(body.deviceId, {
            happiness: state.happiness, bond: state.bond, progress: state.progress,
            careCounts: (state.careCounts as Record<string, number>) || {}, lastCare: state.lastCare,
          })
          return res.end(JSON.stringify({ ok: true }))
        }
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Método no permitido.' }))
      })
    },
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
