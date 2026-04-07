## Odyssey ONE — Official Button Styles

### Design Tokens (dependencies)

```
Font:              'Inter', sans-serif
Border Radius:     8px (radius-lg)
Shadow:            0px 1px 2px 0px rgba(0, 0, 0, 0.05) (shadow-sm)
Focus Ring:        2px solid #5BA4D4 (carolina-blue/400), offset 2px
```

### `button-primary` (dark)

The main call-to-action button. Dark background, white text.

| Property        | Value                          |
|-----------------|--------------------------------|
| background      | `#1B2537` (deep-sea-neutral/900) |
| border          | `1px solid #1B2537`            |
| color           | `#FFFFFF`                      |
| font-family     | `'Inter', sans-serif`          |
| font-size       | `16px`                         |
| font-weight     | `500`                          |
| line-height     | `24px`                         |
| padding         | `8px 18px`                     |
| border-radius   | `8px`                          |
| box-shadow      | `0px 1px 2px 0px rgba(0,0,0,0.05)` |
| **:hover**      | background + border-color → `#384253` (deep-sea-neutral/700) |
| **:active**     | `transform: scale(0.98)`, `box-shadow: inset 0 1px 3px rgba(0,0,0,0.05)` |
| **:focus-visible** | `outline: 2px solid #5BA4D4`, `outline-offset: 2px` |

### `button-primary-white` (light)

Secondary action button. White background, dark text, subtle border.

| Property        | Value                          |
|-----------------|--------------------------------|
| background      | `#FFFFFF`                      |
| border          | `1px solid #D0D4DB` (deep-sea-neutral/300) |
| color           | `#384253` (deep-sea-neutral/700) |
| font-family     | `'Inter', sans-serif`          |
| font-size       | `14px`                         |
| font-weight     | `500`                          |
| line-height     | `20px`                         |
| padding         | `8px 18px`                     |
| border-radius   | `8px`                          |
| box-shadow      | `0px 1px 2px 0px rgba(0,0,0,0.05)` |
| **:hover**      | background → `#F7F8FA` (deep-sea-neutral/50) |
| **:active**     | `transform: scale(0.98)`, background → `#E4E6EB` (deep-sea-neutral/200), `box-shadow: inset 0 1px 3px rgba(0,0,0,0.05)` |
| **:focus-visible** | `outline: 2px solid #5BA4D4`, `outline-offset: 2px` |

### Shared behavior

- Both use `display: flex; align-items: center; justify-content: center`
- Both use `cursor: pointer` and `text-decoration: none` (for anchor variants)
