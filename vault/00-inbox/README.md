---
title: Inbox
type: meta
status: active
---

# 00 — Inbox

Drag any file here (PDF, DOCX, PPTX, XLSX, MD, image…) and ping Claude.

## Workflow

1. **Drop** — drag the file into this folder.
2. **Convert** — Claude runs MarkItDown if the file is binary (PDF / DOCX / PPTX / XLSX). The converted `.md` lands here too.
3. **Validate** — Claude proposes:
   - Destination folder (which domain or cross-cutting topic)
   - Filename in lowercase-kebab
   - Frontmatter (`domain`, `type`, `tags`, `date`)
   - One-paragraph summary
4. **Approve** — say yes or redirect.
5. **File** — Claude moves the file to its final home. Inbox stays empty.

## Frontmatter standard

Every migrated `.md` gets:

```yaml
---
title: <human-readable>
domain: <home | shipments | tracking | orders | carriers | users | cross-cutting | meta>
type: <info | idea | decision | source | task>
tags: [<topic>, <topic>]
date: <YYYY-MM-DD>
status: <active | archived | superseded>
---
```

Binary files (PDF, PPTX, DOCX, images, VTT) don't get frontmatter — they're referenced by their converted .md or by notes elsewhere.
