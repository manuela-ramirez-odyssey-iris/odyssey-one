// tools/domain-usage.mjs
// Extract the component names directly imported from '@odyssey/ui' in a source
// string. Handles single- and multi-line `import { ... } from '@odyssey/ui'`,
// strips `X as Y` aliases to the export name X, and unions repeated imports.
export function extractOdysseyImports(source) {
  const re = /import\s*\{([\s\S]*?)\}\s*from\s*['"]@odyssey\/ui['"]/g
  const names = new Set()
  let m
  while ((m = re.exec(source)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.add(name)
    }
  }
  return [...names]
}
