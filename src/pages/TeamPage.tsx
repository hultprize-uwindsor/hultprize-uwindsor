import { useEffect, useId, useRef, useState } from 'react'
import { TEAM, type TeamMember } from '../data/team'
import Reveal from '../components/Reveal'
import './TeamPage.css'

const director = TEAM.find((member) => member.role === 'Campus Director')
const leads = TEAM.filter((member) => member.role.endsWith(' Lead'))
const members = TEAM.filter(
  (member) => member !== director && !leads.includes(member),
)

function TeamPortrait({ member, priority = false }: { member: TeamMember; priority?: boolean }) {
  const [open, setOpen] = useState(false)
  const bioId = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) setOpen(false)
    }

    document.addEventListener('keydown', dismissOnEscape)
    return () => document.removeEventListener('keydown', dismissOnEscape)
  }, [open])

  const closeBio = () => {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  return (
    <div
      className={`team-portrait${open ? ' is-open' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) setOpen(false)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          closeBio()
        }
      }}
    >
      <div className="team-portrait__surface">
        <button
          ref={trigger}
          type="button"
          className="team-portrait__trigger"
          aria-label={`${open ? 'Hide' : 'Read'} biography of ${member.name}`}
          aria-expanded={open}
          aria-controls={bioId}
          onClick={() => setOpen((value) => !value)}
        >
          <img
            src={member.photo}
            alt={member.name}
            width="1080"
            height="1440"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        </button>
        <div
          id={bioId}
          className="team-portrait__overlay"
          role="region"
          aria-label={`Biography of ${member.name}`}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
        >
          <div className="team-portrait__overlay-heading">
            <button
              type="button"
              className="team-portrait__close"
              aria-label={`Close biography of ${member.name}`}
              onClick={closeBio}
              tabIndex={open ? 0 : -1}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className="team-portrait__bio">{member.bio}</p>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  return (
    <div className="team-page">
      <div className="container">
        <header className="team-intro">
          <Reveal>
            <h1>People who<br />make it happen.</h1>
          </Reveal>
          <div className="team-intro__content">
            <p className="team-intro__statement">
              <span>Different perspectives.</span>{' '}
              <span>One shared ambition.</span>
            </p>
            <p className="team-intro__description">
              Meet the students bringing the Hult Prize to life at the
              University of Windsor.
            </p>
          </div>
          <a className="btn btn--dark" href="/#signup">
            Get involved
          </a>
        </header>

        <section className="team-roster" id="team-roster" aria-label="Our organizing team">
          {director && (
            <div className="team-roster__grid">
              <article className="team-profile">
                <Reveal>
                  <TeamPortrait member={director} priority />
                </Reveal>
              </article>
            </div>
          )}
          <div className="team-roster__grid team-roster__grid--leads">
            {leads.map((member, index) => (
              <article className="team-profile" key={member.name}>
                <Reveal delay={index * 60}>
                  <TeamPortrait member={member} priority />
                </Reveal>
              </article>
            ))}
          </div>
          <div className="team-roster__grid">
            {members.map((member, index) => (
              <article className="team-profile" key={member.name}>
                <Reveal delay={(index % 3) * 60}>
                  <TeamPortrait member={member} />
                </Reveal>
              </article>
            ))}
          </div>
        </section>

        <section className="team-invitation" aria-labelledby="team-invitation-heading">
          <h2 id="team-invitation-heading">Big ideas need<br />people like you.</h2>
          <div className="team-invitation__action">
            <p>
              Bring your perspective. Find your team. Take the first step
              toward building something that matters.
            </p>
            <a className="btn btn--dark" href="/#signup">
              Sign up
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
