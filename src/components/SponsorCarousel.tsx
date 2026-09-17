import { useState } from 'react'
import './SponsorCarousel.css'

export type SponsorLogo = {
  name: string
  src: string
  width: number
  height: number
}

type SponsorCarouselProps = {
  logos: SponsorLogo[]
  heading?: string
}

export default function SponsorCarousel({ logos, heading = 'Our sponsors' }: SponsorCarouselProps) {
  const [paused, setPaused] = useState(false)

  if (!logos.length) return null

  // Each group fills the strip even with a small set of placeholder logos.
  // Only the first occurrence of each logo is exposed to screen readers.
  const repetitions = Math.ceil(6 / logos.length)
  const items = Array.from({ length: repetitions }, () => logos).flat()

  return (
    <section className="sponsor-strip" aria-label={heading}>
      <div className="container">
        <div className="sponsor-strip__controls">
          <button
            className="sponsor-strip__toggle"
            type="button"
            aria-label={paused ? 'Play sponsor logo carousel' : 'Pause sponsor logo carousel'}
            onClick={() => setPaused((value) => !value)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              {paused ? <path d="M3 1.5 10 6l-7 4.5z" /> : <path d="M2.5 1.5h2v9h-2zm5 0h2v9h-2z" />}
            </svg>
            <span>{paused ? 'Play' : 'Pause'}</span>
          </button>
        </div>
        <div className="sponsor-strip__viewport">
          <div className="sponsor-strip__track" data-paused={paused}>
            {[0, 1].map((group) => (
              <ul
                className={`sponsor-strip__group${group ? ' sponsor-strip__group--duplicate' : ''}`}
                role="list"
                aria-hidden={group ? true : undefined}
                key={group}
              >
                {items.map((logo, index) => {
                  const duplicate = group > 0 || index >= logos.length
                  return (
                    <li
                      className={`sponsor-strip__logo${index >= logos.length ? ' sponsor-strip__logo--duplicate' : ''}`}
                      aria-hidden={duplicate ? true : undefined}
                      key={`${logo.src}-${index}`}
                    >
                      <img
                        src={logo.src}
                        alt={duplicate ? '' : logo.name}
                        width={logo.width}
                        height={logo.height}
                        decoding="async"
                      />
                    </li>
                  )
                })}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
