// api/[...path].js — single Vercel Function serving every contract path under /api.
import { matchRoute } from './_lib/router.mjs'
import { getPool } from './_lib/db.mjs'

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x')
  const pathname = url.pathname.replace(/^\/api/, '')
  const route = matchRoute(req.method, pathname)
  if (!route) return res.status(404).json({ message: `No route: ${req.method} ${pathname}` })

  const delay = Number(process.env.SIMULATED_DELAY_MS ?? 0)
  if (delay > 0) await new Promise((r) => setTimeout(r, delay))

  try {
    const result = await route.handler({ query: url.searchParams, body: req.body ?? null, db: getPool() })
    return res.status(200).json(result)
  } catch (e) {
    console.error(route.name, e) // shows in Vercel function logs
    return res.status(500).json({ message: 'Internal error', detail: String(e.message ?? e) })
  }
}
