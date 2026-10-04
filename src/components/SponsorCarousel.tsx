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
  if (!logos.length) return null

  // Each group fills the strip even with a small set of placeholder logos.
  // Only the first occurrence of each logo is exposed to screen readers.
  const repetitions = Math.ceil(6 / logos.length)
  const items = Array.from({ length: repetitions }, () => logos).flat()

  return (
    <section className="sponsor-strip" aria-label={heading}>
      <div className="container">
        <div className="sponsor-strip__viewport">
          <div className="sponsor-strip__track">
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
