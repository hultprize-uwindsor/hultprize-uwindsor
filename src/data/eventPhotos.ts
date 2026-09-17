import type { PhotoSlide } from '../components/PhotoCarousel'

// Temporary photos from the official Hult Prize site; replace with campus photography.
// Original page and asset URLs are recorded in public/images/hult-placeholders/SOURCES.md.
export const EVENT_PHOTOS: PhotoSlide[] = [
  {
    src: '/images/hult-placeholders/community.webp',
    alt: 'Hult Prize participants celebrating onstage with a trophy',
    caption: 'A global community of founders',
  },
  {
    src: '/images/hult-placeholders/competition.webp',
    alt: 'Student entrepreneurs reacting during a Hult Prize competition event',
    caption: 'Big ideas. Defining moments.',
  },
  {
    src: '/images/hult-placeholders/global-final.webp',
    alt: 'The EF Hult Prize trophy under purple stage lighting',
    caption: 'The ambition to go further',
  },
]
