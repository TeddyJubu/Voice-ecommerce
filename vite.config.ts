/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import type { Plugin, Connect } from 'vite'
import { request as httpsRequest } from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Vite plugin that proxies POST /api/tts/:voiceId to ElevenLabs for both
 * the dev server (`vite`) and the preview server (`vite preview`).
 * The ElevenLabs API key is read from ELEVENLABS_API_KEY (no VITE_ prefix)
 * so it is never bundled into the client.
 */
function ttsProxyPlugin(apiKey: string): Plugin {
  const middleware: Connect.NextHandleFunction = (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ) => {
    if (req.method !== 'POST' || !req.url?.startsWith('/api/tts/')) {
      return next()
    }

    const voiceId = req.url.slice('/api/tts/'.length).split('?')[0]

    if (!apiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured.' }))
      return
    }

    const upstream = httpsRequest(
      {
        hostname: 'api.elevenlabs.io',
        path:     `/v1/text-to-speech/${voiceId}`,
        method:   'POST',
        headers: {
          'xi-api-key':   apiKey,
          'Content-Type': 'application/json',
          'Accept':        'audio/mpeg',
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 200, {
          'Content-Type':  upstreamRes.headers['content-type'] ?? 'audio/mpeg',
          'Cache-Control': 'no-store',
        })
        upstreamRes.pipe(res)
      }
    )

    upstream.on('error', (err) => {
      console.error('[tts-proxy] upstream error:', err.message)
      if (!res.headersSent) { res.writeHead(502); res.end() }
    })

    req.pipe(upstream)
  }

  return {
    name: 'tts-proxy',
    // Dev server: `vite`
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    // Preview server: `vite preview` (serves the production build locally)
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including those without VITE_ prefix) for server-side use.
  // ELEVENLABS_API_KEY is intentionally NOT prefixed with VITE_ so it is never
  // bundled into the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      ttsProxyPlugin(env.ELEVENLABS_API_KEY ?? ''),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test/setup.ts'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
