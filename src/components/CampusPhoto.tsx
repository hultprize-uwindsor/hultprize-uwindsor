import { CAMPUS_PHOTOS, SHOW_EVENT_PHOTOS } from '../data/assets'

export default function CampusPhoto({ photo, priority = false, className = '' }: {
  photo: keyof typeof CAMPUS_PHOTOS
  priority?: boolean
  className?: string
}) {
  if (!SHOW_EVENT_PHOTOS) return null
  const image = CAMPUS_PHOTOS[photo]
  return (
    <figure className={`campus-photo ${className}`}>
      <img src={image.src} alt={image.alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" width="1800" height="1440" />
    </figure>
  )
}
