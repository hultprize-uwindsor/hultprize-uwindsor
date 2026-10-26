import type { CSSProperties } from 'react'
import { LAUNCH_DAY_GALLERY } from '../data/assets'
import './LaunchGallery.css'

/** Launch day's full gallery as two rows of taped Polaroids drifting in opposite directions. Each row holds its photos
    twice so the drift loops without a seam (the copy is hidden from screen readers). Hovering the gallery, or focusing
    it (a tap on touch screens), pauses both rows; with reduced motion they stand still and wrap instead. */
export default function LaunchGallery() {
  const half = Math.ceil(LAUNCH_DAY_GALLERY.length / 2)
  const rows = [LAUNCH_DAY_GALLERY.slice(0, half), LAUNCH_DAY_GALLERY.slice(half)]
  return <div className="launch-gallery" role="region" aria-label="Launch day photos" tabIndex={0}>
    {rows.map((photos, row) => <div key={row} className={`launch-gallery__row${row ? ' launch-gallery__row--reverse' : ''}`}>
      {/* Eight seconds a photo: slow enough to look at each one, and both rows keep much the same pace. */}
      <div className="launch-gallery__track" style={{ '--duration': `${photos.length * 8}s` } as CSSProperties}>
        {[0, 1].map(copy => <ul key={copy} className="launch-gallery__set" aria-hidden={copy ? true : undefined}>{photos.map(photo => <li key={photo.name}>
          <figure>
            <img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 760px) 260px, 360px" width={photo.width} height={photo.height} alt={copy ? '' : photo.alt} loading="lazy" />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        </li>)}</ul>)}
      </div>
    </div>)}
  </div>
}
