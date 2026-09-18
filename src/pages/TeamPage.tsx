import { TEAM } from '../data/team'
import TeamPortrait from '../components/TeamPortrait'
import Reveal from '../components/Reveal'
import './TeamPage.css'

const director = TEAM.find((member) => member.role === 'Campus Director')
const leads = TEAM.filter((member) => member.role.endsWith(' Lead'))
const members = TEAM.filter(
  (member) => member !== director && !leads.includes(member),
)


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
