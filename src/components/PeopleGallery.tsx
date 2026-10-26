import { useEffect, useMemo, useRef, useState } from 'react'
import { RevealText } from './MotionText'
import { Link } from './PageLink'
import { committee } from '../data/committee'
import { TEAM } from '../data/team'
import { YEAR_ONE_PHOTOS } from '../data/assets'
import { COMMUNITY_PARTNERS } from '../data/communityPartners'
import './TeamPolaroids.css'

/** The team as taped Polaroids, each with its bio on a handwritten note tucked underneath. The photo opens the profile. */
export function TeamGallery() {
  return <ul className="team-board">
    {committee.map(([name, role, , slug]) => {
      const bio = TEAM.find(member => member.name === name)?.bio
      // Square crops of the portrait artwork, taken above its printed name and role.
      const photo = (size: number) => `/images/team/${slug}-polaroid-${size}.webp`
      return <li className="team-card" key={slug}>
        <Link className="team-polaroid" to={`?member=${slug}#team`} state={{ drawer: true }}>
          <div className="team-polaroid__frame">
            <img src={photo(360)} srcSet={`${photo(360)} 360w, ${photo(720)} 720w`} sizes="(max-width: 599px) 300px, 276px" alt="" width={720} height={720} loading="lazy" />
            <h3 className="team-polaroid__name">{name}</h3>
            <p className="team-polaroid__role">{role}<span className="visually-hidden">. View profile</span></p>
          </div>
        </Link>
        {bio && <p className="team-note">{bio}</p>}
      </li>
    })}
  </ul>
}
// Masonry columns: up to four at least 230px wide, two on phones (at least 140px), as the old CSS columns were.
const galleryColumns = (width: number) => {
  const narrow = window.matchMedia('(max-width: 760px)').matches
  const [most, min, gap] = narrow ? [2, 140, 16] : [4, 230, 28]
  return Math.max(1, Math.min(most, Math.floor((width + gap) / (min + gap))))
}

/** Year one as a scrapbook of taped snapshots in real (flex) columns. CSS multi-column is not used: Safari stops
    painting a multi-column layout's other columns while a card in it animates. */
export function SeasonGallery() {
  const grid = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(() => galleryColumns(window.innerWidth - 140))
  useEffect(() => {
    const element = grid.current
    if (!element) return
    const observer = new ResizeObserver(() => setCount(galleryColumns(element.clientWidth)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  // Each photo goes to the shortest column so far, measured by its proportions plus room for the caption.
  const columns = useMemo(() => {
    const stacks = Array.from({ length: count }, () => ({ height: 0, photos: [] as number[] }))
    YEAR_ONE_PHOTOS.forEach((photo, index) => {
      const shortest = stacks.reduce((best, stack) => stack.height < best.height ? stack : best)
      shortest.photos.push(index)
      shortest.height += (photo.height ?? 3) / (photo.width ?? 4) + .25
    })
    return stacks.map(stack => stack.photos)
  }, [count])
  return <section className="section season-gallery" id="pictures"><div className="container"><div className="section-heading"><h2 data-text-reveal><RevealText>Year one.<br />In pictures.</RevealText></h2></div><div className="season-gallery__grid" ref={grid}>{columns.map((photos, column) => <div className="season-gallery__column" key={column}>{photos.map(i => { const photo = YEAR_ONE_PHOTOS[i]; return <Link to={`?photo=${i}`} state={{drawer:true}} key={photo.src}><figure><img src={photo.thumb ?? photo.src} srcSet={photo.srcSet} sizes="(max-width: 760px) 46vw, (max-width: 1100px) 31vw, 23vw" width={photo.width} height={photo.height} alt={photo.alt} loading="lazy"/><figcaption>{photo.caption}<span aria-hidden="true">↗</span></figcaption></figure></Link> })}</div>)}</div></div></section>
}
export function PartnerGallery() {
  return <div className="partner-gallery">{COMMUNITY_PARTNERS.map((p,i)=><Link key={p.slug} className={`partner-tile partner-tile--${i}`} to={`?partner=${p.slug}`} state={{drawer:true}}><div className="partner-tile__visual">{p.logo&&<img src={p.logo} alt="" loading="lazy"/>}<span aria-hidden="true">↗</span></div><h3>{p.name}</h3><p>{p.subtitle}</p></Link>)}</div>
}
