/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load all env vars (including those without VITE_ prefix) for server-side use.
  // ELEVENLABS_API_KEY is intentionally NOT prefixed with VITE_ so it is never
  // bundled into the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: {
      proxy: {
        // Proxy /api/tts/:voiceId → https://api.elevenlabs.io/v1/text-to-speech/:voiceId
        // The xi-api-key header is injected here (server-side) so the key is
        // never sent to or stored in the browser.
        '/api/tts': {
          target: 'https://api.elevenlabs.io',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/tts/, '/v1/text-to-speech'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = env.ELEVENLABS_API_KEY ?? ''
              if (key) proxyReq.setHeader('xi-api-key', key)
            })
          },
        },
      },
    },

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
