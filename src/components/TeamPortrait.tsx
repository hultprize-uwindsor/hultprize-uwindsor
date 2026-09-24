import type { TeamMember } from '../data/team'
import CodeHoverCards from '../lightswind/CodeHoverCards'

export default function TeamPortrait({ member }: { member: TeamMember; priority?: boolean }) {
  return <div className="team-portrait">
    <CodeHoverCards
      cards={[{ id: member.photo, image: member.photo, title: member.name, description: member.role, bio: member.bio }]}
      columns={1}
      minHeight={0}
      aspectRatio="3 / 4"
      borderRadius={6}
      showBorder={false}
      className="team-code-hover"
    />
  </div>
}
