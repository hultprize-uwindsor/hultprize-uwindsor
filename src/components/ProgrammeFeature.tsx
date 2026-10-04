import { Link } from './PageLink'
import { RevealText, RollingLabel } from './MotionText'
import { RegisterButton } from './PageParts'
import './ProgrammeFeature.css'

export function ProgrammeFeature() {
  return <section className="programme-feature" aria-labelledby="programme-feature-title">
    <div className="container programme-feature__copy">
      <h2 id="programme-feature-title" data-text-reveal><RevealText>Your idea.<br />Room to grow.</RevealText></h2>
      <p>Workshops, mentors and a team beside you. From your first pitch to the next stage.</p>
      <div className="programme-feature__actions"><RegisterButton /><Link to="/this-year" className="text-link"><RollingLabel>Explore the programme</RollingLabel><span aria-hidden="true">↗</span></Link></div>
    </div>
  </section>
}
