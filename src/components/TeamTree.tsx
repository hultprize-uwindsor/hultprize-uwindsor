import { Mail, ArrowUpRight } from 'lucide-react'
import TeamPortrait from './TeamPortrait'
import { TEAM } from '../data/team'
import './TeamTree.css'

type CommitteeMember = string[]
export default function TeamTree({ groups }: { groups: { label: string; members: CommitteeMember[] }[] }) {
  return <div className="team-tree" aria-label="Team organisation">
    {groups.map((group, index) => <div className="team-tree__level" key={group.label}>
      <p className="team-tree__label">{group.label}</p>
      <div className={`committee-grid committee-grid--full-cards team-tree__row ${index === 0 ? 'team-tree__row--director' : ''}`} role="group" aria-label={group.label}>
        {group.members.map(([name, role, email, photo]) => {
          const member = TEAM.find(person => person.photo === `/images/team/${photo}.png`)
          return <article key={name} className="team-tree__card">
            {member && <TeamPortrait member={{ ...member, name, role }} />}
            <div className="team-tree__details">
              <h3>{name}</h3><p className="team-tree__role">{role}</p>
              <a className="team-tree__email" href={`mailto:${email}`}><Mail size={15} aria-hidden="true" /><span>{email}</span><ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </article>
        })}
      </div>
    </div>)}
  </div>
}
