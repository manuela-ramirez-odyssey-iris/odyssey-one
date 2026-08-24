// Serves api/index.js — the ONE Vercel Function behind every /api path — over a
// plain node:http server, so local dev can run against local API code instead of
// the deployed one.
//
// Why this exists: vite.config.js proxies /api to the deployed function
// (odyssey-one-stage), so ANY change under api/ was invisible locally until a
// prod deploy — you could only see the client half of a full-stack change.
// `vercel dev` is not the answer here: it clobbers vite's module URLs (S92).
// Same Neon database either way — this swaps which COPY OF THE CODE answers,
// never which data.
//
// Usage (two terminals, from apps/odyssey-one):
//   npm run dev:api     # this server, on :3001
//   npm run dev:local   # vite with the proxy pointed at :3001
//
// api/index.js is written against Vercel's req/res, which is Express-shaped:
// a pre-parsed `req.body` and chainable `res.status().json()`. node:http gives
// neither, so the two are shimmed below — that IS the whole adapter.
import { createServer } from 'node:http'
import handler from '../api/index.js'

const port = Number(process.env.PORT ?? 3001)

createServer(async (req, res) => {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (value) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(value))
  }
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString()
    // A malformed body is the CLIENT's error (400), not a crashed dev server —
    // the same distinction the deployed function's own parser makes.
    try {
      req.body = raw ? JSON.parse(raw) : null
    } catch {
      return res.status(400).json({ message: 'Invalid JSON body' })
    }
    await handler(req, res)
  } catch (e) {
    // The deployed function logs to Vercel; here the terminal IS the log.
    console.error(req.method, req.url, e)
    if (!res.headersSent) res.status(500).json({ message: String(e.message ?? e) })
  }
}).listen(port, () => {
  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL is unset — start with: node --env-file=.env.local tools/local-api.mjs')
  }
  console.log(`local API on http://localhost:${port} — point VITE_API_PROXY_TARGET here`)
})
