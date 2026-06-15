import figma, { html } from '@figma/code-connect';

// ─── Standard Buttons (Primary / Secondary / Outline / Ghost) ─────────────────
// Figma node: Design-System---MCP › 1307-333
// Reference: packages/ui/src/Button.figma.tsx (read-only — not imported)
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1307-333',
  {
    imports: ["import { ButtonComponent } from '@odyssey/ui-angular'"],
    props: {
      variant: figma.enum('Variant', {
        Primary: 'primary',
        Secondary: 'secondary',
        Outline: 'outline',
        Ghost: 'ghost',
      }),
      size: figma.enum('Size', {
        sm: 'sm',
        md: 'md',
        lg: 'lg',
      }),
      // Idle/Hover/Pressed → CSS pseudo-classes at runtime, no Angular prop change.
      // Only State=Disabled flips the disabled input.
      disabled: figma.enum('State', {
        Idle: false,
        Hover: false,
        Pressed: false,
        Disabled: true,
      }),
      hasLeadingIcon: figma.boolean('Show icon', {
        true: true,
        false: false,
      }),
      label: figma.string('Label'),
    },
    example: ({ variant, size, disabled, hasLeadingIcon, label }) =>
      html`<od-button
  variant="${variant}"
  size="${size}"
  [disabled]="${disabled}"
  [hasLeadingIcon]="${hasLeadingIcon}"
>
  ${label}
</od-button>`,
  },
);

// ─── Link Button Variant ───────────────────────────────────────────────────────
// Figma node: Design-System---MCP › 1895-7  (inside "Link Buttons" frame)
// Maps to variant="link" with optional leading + trailing icon slots.
// TODO: verify exact property names from Figma Dev Mode inspect panel for node 1895-7
figma.connect(
  'https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1895-7',
  {
    imports: ["import { ButtonComponent } from '@odyssey/ui-angular'"],
    props: {
      label: figma.string('Label'),
    },
    example: ({ label }) =>
      html`<od-button variant="link" size="sm">
  ${label}
</od-button>`,
  },
);
