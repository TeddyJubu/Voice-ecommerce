/**
 * server.cjs — minimal production server
 *
 * Serves the Vite build output from dist/ and proxies
 * POST /api/tts/:voiceId → https://api.elevenlabs.io/v1/text-to-speech/:voiceId
 * adding the xi-api-key header server-side so the key never reaches the browser.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=<key> node server.cjs
 *   PORT=8080 ELEVENLABS_API_KEY=<key> node server.cjs
 */
'use strict'

const http  = require('http')
const https = require('https')
const fs    = require('fs')
const path  = require('path')
const url   = require('url')

const PORT    = parseInt(process.env.PORT || '3000', 10)
const EL_KEY  = process.env.ELEVENLABS_API_KEY || ''
const DIST    = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.csv':  'text/csv',
}

/** Proxy a TTS request to ElevenLabs, injecting the API key server-side. */
function handleTts(req, res) {
  // URL format: /api/tts/<voiceId>  (strip leading slash from req.url)
  const voiceId = (req.url || '').replace(/^\//, '').split('?')[0]

  if (!EL_KEY) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured on the server.' }))
    return
  }

  const upstream = https.request(
    {
      hostname: 'api.elevenlabs.io',
      path:     `/v1/text-to-speech/${voiceId}`,
      method:   'POST',
      headers: {
        'xi-api-key':   EL_KEY,
        'Content-Type': 'application/json',
        'Accept':        'audio/mpeg',
      },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, {
        'Content-Type':  upstreamRes.headers['content-type'] || 'audio/mpeg',
        'Cache-Control': 'no-store',
      })
      upstreamRes.pipe(res)
    }
  )

  upstream.on('error', (err) => {
    console.error('[tts-proxy] upstream error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end()
    }
  })

  req.pipe(upstream)
}

/** Serve a static file from dist/. Returns false if not found. */
function serveStatic(pathname, res) {
  // Normalise and prevent path traversal
  const rel      = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')
  const filePath = path.join(DIST, rel)

  if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
    res.writeHead(403)
    res.end()
    return true
  }

  let target = filePath
  try {
    const stat = fs.statSync(target)
    if (stat.isDirectory()) target = path.join(target, 'index.html')
  } catch {
    // fall through to SPA fallback
    target = path.join(DIST, 'index.html')
  }

  if (!fs.existsSync(target)) {
    res.writeHead(404)
    res.end('Not found')
    return true
  }

  const ext = path.extname(target)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(target).pipe(res)
  return true
}

http.createServer((req, res) => {
  const parsed   = url.parse(req.url || '/')
  const pathname = parsed.pathname || '/'

  // TTS proxy route
  if (req.method === 'POST' && pathname.startsWith('/api/tts/')) {
    // Pass sub-path (voiceId) without the /api/tts prefix
    req.url = pathname.slice('/api/tts'.length)
    handleTts(req, res)
    return
  }

  serveStatic(pathname, res)
}).listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`)
  console.log(`[server] TTS proxy: ${EL_KEY ? 'enabled' : 'DISABLED — set ELEVENLABS_API_KEY'}`)
})
