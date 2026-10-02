# Odyssey One — Design System (tokens & usage)

> Generated from code. Every value below is read from `packages/tokens/tokens.css`, and every
> "Used for" line from the live Design System Explorer (the per-component token tables).
> Regenerate with `npm run ds:md`; never edit the generated file by hand.
>
> **Who this is for:** people and AI agents (e.g. a Gemini/ChatGPT agent building slides,
> one-pagers or mockups) that need to reproduce the Odyssey One look without access to our code.

## The look and feel, in one paragraph

Odyssey One is an enterprise logistics platform (shipments, orders, carriers, tracking). It looks
**calm, dense and precise**: white cards on a very light cool-gray canvas, a near-black navy as
the one strong color, and small amounts of saturated color reserved for *meaning* (status, links,
charts), never decoration. Type is **Inter** throughout, mostly 12–16px, medium/semibold for labels
and values, regular for body. Corners are small (4–8px), borders are hairline (1px, cool gray),
shadows are faint. There are no gradients, illustrations or brand flourishes inside the product —
the data is the hero.

## How to reproduce it (rules of thumb)

- **Canvas & surfaces:** page background `#F7F8FA` (`--bg-secondary`), cards/panels white
  (`--bg-primary`) with a `#E4E6EB` 1px border (`--border-subtle`) and 8px radius.
- **The one dark color:** Deep Sea Neutral 900 `#1B2537` — the top navigation bar, primary buttons,
  and primary text. Use it for title bars and emphasis blocks in slides.
- **Text hierarchy:** primary `#1B2537`, secondary `#384253`, tertiary/muted `#6B7280`,
  placeholder `#9DA3B0`. Small uppercase muted labels (12px medium, `#6B7280`) over larger
  semibold values is the signature "stat" pattern (see SummaryStrip).
- **Links / interactive accent:** Carolina Blue 600 `#276DA2`; focus rings Carolina Blue 400.
- **Meaning colors (use only for meaning):** success Caribbean Green 600 `#237E70`, error
  Bittersweet 600 `#D23930`, warning Sunrise Yellow (`#F8CE51` fill / `#8F3F11` text).
- **Badges / pills:** soft 100-tint background + dark 800 text of the same hue, 4px radius,
  12px medium text. Never a saturated fill with white text (except the notification dot).
- **Charts:** use the `--chart-1 … --chart-11` sequence in order — hue pairs (dark then light of
  the same hue), with `--chart-rest` gray for "other".
- **Spacing:** 4px grid (4, 8, 12, 16, 20, 24, 32 …). Generous outer padding (24–48px), tight
  inner rhythm (4–12px).
- **Density:** information-dense tables and strips; prefer compact rows and many small facts over
  big hero numbers. One accent per view.

## Reading the tables below

Tokens come in three layers. **Primitives** are raw palette values (`--deep-sea-neutral-900`).
**Semantic** tokens give them a job (`--text-primary`). **Component** tokens bind a semantic to one
component (`--btn-primary-bg`). When building something new, pick the *semantic* token whose
"Used for" matches your intent; fall back to a primitive only for charts or illustrations.
