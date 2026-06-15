import figma, { html } from '@figma/code-connect';

// ─── Badge ────────────────────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 213-27
// Reference: packages/ui/src/Badge.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=213-27',
  {
    imports: ["import { BadgeComponent } from '@odyssey/ui-angular'"],
    props: {
      variant: figma.enum('Variant', {
        amber: 'amber',
        blue: 'blue',
        green: 'green',
        red: 'red',
        purple: 'purple',
        gray: 'gray',
        notification: 'notification',
        count: 'count',
        metric: 'metric',
        favorite: 'favorite',
      }),
      statusDot: figma.boolean('Show dot', {
        true: true,
        false: false,
      }),
      hasLeftIcon: figma.boolean('Show left icon', {
        true: true,
        false: false,
      }),
      hasRightIcon: figma.boolean('Show right icon', {
        true: true,
        false: false,
      }),
      label: figma.textContent('Badge'),
    },
    example: ({ variant, statusDot, hasLeftIcon, hasRightIcon, label }) =>
      html`<od-badge
  variant="${variant}"
  [statusDot]="${statusDot}"
  [hasLeftIcon]="${hasLeftIcon}"
  [hasRightIcon]="${hasRightIcon}"
>
  ${label}
</od-badge>`,
  },
);
