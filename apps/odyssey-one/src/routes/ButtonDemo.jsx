import { Fragment } from 'react'
import { Button } from '@odyssey/ui'
import { Search, ArrowRight } from 'lucide-react'
import './ButtonDemo.css'

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'link']
const SIZES = ['sm', 'md', 'lg']
const DARK_SURFACE_VARIANTS = new Set(['outline', 'ghost'])

const REACT_VERSION = '19.2.4'
const VITE_VERSION = '8.0.1'

function isDarkSurface(variant) {
  return DARK_SURFACE_VARIANTS.has(variant)
}

export default function ButtonDemo() {
  return (
    <div className="demo-root">
      <div className="stack-badge" aria-hidden="true">
        React {REACT_VERSION} · Vite {VITE_VERSION} · @odyssey/button
      </div>

      <main className="demo-page">
        <header className="demo-header">
          <h1>Odyssey Button — React canonical</h1>
          <p>
            <code>&lt;Button&gt;</code> from <code>@odyssey/ui</code>, the canonical
            source. Visual contract:{' '}
            <a
              href="https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=1307-333"
              target="_blank"
              rel="noopener noreferrer"
            >
              Figma master 1307:333
            </a>
            . Angular port lives at <code>odyssey-angular-button-demo</code>,
            tethered to this source via <code>Button.figma-link.md</code>.
          </p>
        </header>

        {/* Section 1 — Idle Grid (5 variants × 3 sizes) */}
        <section className="section">
          <h2>Idle</h2>
          <div className="grid grid--idle">
            <div className="grid__corner"></div>
            {VARIANTS.map((v) => (
              <div key={`h-${v}`} className="grid__header">{v}</div>
            ))}

            {SIZES.map((s) => (
              <Fragment key={s}>
                <div className="grid__row-label">{s}</div>
                {VARIANTS.map((v) => (
                  <div
                    key={`${v}-${s}`}
                    className={`grid__cell${isDarkSurface(v) ? ' grid__cell--dark' : ''}`}
                  >
                    <Button variant={v} size={s}>Label</Button>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </section>

        {/* Section 2 — State demo (5 variants × 4 states) */}
        <section className="section">
          <h2>States</h2>
          <p className="section__note">
            Hover the first column. Press-and-hold the second. Tab to the third for{' '}
            <code>:focus-visible</code>. The fourth is rendered with{' '}
            <code>disabled={'{true}'}</code>.
          </p>
          <div className="grid grid--state">
            <div className="grid__corner"></div>
            <div className="grid__header">Hover</div>
            <div className="grid__header">Active</div>
            <div className="grid__header">Focus-visible</div>
            <div className="grid__header">Disabled</div>

            {VARIANTS.map((v) => (
              <Fragment key={`row-${v}`}>
                <div className="grid__row-label">{v}</div>
                <div className={`grid__cell${isDarkSurface(v) ? ' grid__cell--dark' : ''}`}>
                  <Button variant={v}>Hover me</Button>
                </div>
                <div className={`grid__cell${isDarkSurface(v) ? ' grid__cell--dark' : ''}`}>
                  <Button variant={v}>Click + hold</Button>
                </div>
                <div className={`grid__cell${isDarkSurface(v) ? ' grid__cell--dark' : ''}`}>
                  <Button variant={v}>Tab here</Button>
                </div>
                <div className={`grid__cell${isDarkSurface(v) ? ' grid__cell--dark' : ''}`}>
                  <Button variant={v} disabled>Disabled</Button>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        {/* Section 3 — Slots (Lucide icons) */}
        <section className="section">
          <h2>Slots</h2>
          <p className="section__note">
            React passes icons via the <code>icon</code> and <code>iconRight</code>{' '}
            props. Icons inherit <code>currentColor</code>; same Lucide glyphs as
            the Angular side (<code>search</code>, <code>arrow-right</code>).
          </p>
          <div className="slots-row">
            <Button icon={<Search size={20} />}>Search</Button>
            <Button iconRight={<ArrowRight size={20} />}>Continue</Button>
            <Button icon={<Search size={20} />} iconRight={<ArrowRight size={20} />}>
              Both slots
            </Button>
            <Button variant="link" iconRight={<ArrowRight size={16} />}>
              Go to Tracking
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
