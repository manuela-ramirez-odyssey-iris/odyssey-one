// api/index.js — single Vercel Function serving every contract path under /api.
// The bracket catch-all ([...path].js) fails to match multi-segment paths on this
// setup (Vite app, Root Directory = apps/odyssey-one, custom vercel.json rewrites).
// So vercel.json rewrites /api/(.*) → /api/index?__path=$1, carrying the real path
// explicitly. We read it back below and strip the plumbing param before dispatch.
import { matchRoute } from './_lib/router.mjs'
import { getPool } from './_lib/db.mjs'

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x')
  const viaRewrite = url.searchParams.get('__path')
  const pathname = viaRewrite ? `/${viaRewrite}` : url.pathname.replace(/^\/api/, '')
  url.searchParams.delete('__path') // handlers must never see the plumbing param
  const route = matchRoute(req.method, pathname)
  if (!route) return res.status(404).json({ message: `No route: ${req.method} ${pathname}` })

  const delay = Number(process.env.SIMULATED_DELAY_MS ?? 0)
  if (delay > 0) await new Promise((r) => setTimeout(r, delay))

  try {
    const result = await route.handler({ query: url.searchParams, params: route.params, body: req.body ?? null, db: getPool() })
    return res.status(200).json(result)
  } catch (e) {
    console.error(route.name, e) // shows in Vercel function logs
    const status = e.status ?? 500
    return res.status(status).json({ message: status === 500 ? 'Internal error' : String(e.message), detail: String(e.message ?? e) })
  }
}
