import { TEAM } from '../data/team'
import './TeamPage.css'

export default function TeamPage() {
  return (
    <section className="section team-page">
      <div className="container">
        <p className="eyebrow">Hult Prize &times; University of Windsor</p>
        <h1>Meet the team</h1>
        <p className="team-page__intro">
          The students organizing the Hult Prize campus program at the
          University of Windsor this year.
        </p>

        <div className="team-grid">
          {TEAM.map((member) => (
            <article className="team-card" key={member.name}>
              <img
                src={member.photo}
                alt={`Headshot of ${member.name}`}
                className="team-card__photo"
              />
              <h3>{member.name}</h3>
              <p className="team-card__role">{member.role}</p>
              <p className="team-card__bio">{member.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
