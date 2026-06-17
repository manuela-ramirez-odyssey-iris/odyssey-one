// tools/domain-usage.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractOdysseyImports } from './domain-usage.mjs'

test('single-line named import', () => {
  assert.deepEqual(
    extractOdysseyImports(`import { Button, EmptyState } from '@odyssey/ui'`),
    ['Button', 'EmptyState'],
  )
})

test('multi-line import block', () => {
  const src = `import {\n  Widget,\n  WidgetCtaRow,\n} from '@odyssey/ui'`
  assert.deepEqual(extractOdysseyImports(src), ['Widget', 'WidgetCtaRow'])
})

test('strips aliases to the imported (export) name', () => {
  assert.deepEqual(
    extractOdysseyImports(`import { Button as Btn } from '@odyssey/ui'`),
    ['Button'],
  )
})

test('multiple @odyssey/ui imports in one file are unioned', () => {
  const src = `import { Button } from '@odyssey/ui'\nconst x = 1\nimport { Badge } from '@odyssey/ui'`
  assert.deepEqual(extractOdysseyImports(src).sort(), ['Badge', 'Button'])
})

test('ignores imports from other packages and returns [] when none', () => {
  assert.deepEqual(extractOdysseyImports(`import { useState } from 'react'`), [])
})
