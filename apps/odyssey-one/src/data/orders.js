import orders from './orders.json'

// ─── Orders list (statically imported; regenerate via `npm run generate-orders`) ───

export function getAllOrders() {
  return orders
}
