import { ArrowUpRight } from 'lucide-react'
import PrizeCoins from './PrizeCoins'
import { RevealText } from './MotionText'
import './GlobalPrize.css'

export function GlobalPrize() {
  return <section className="global-prize" id="global-prize" aria-labelledby="global-prize-title">
    <PrizeCoins />
    <div className="global-prize__content">
      <h2 id="global-prize-title" aria-label="1 million US dollars" data-text-reveal><span className="global-prize__million"><RevealText>$1M</RevealText></span><span className="global-prize__usd"><RevealText>USD</RevealText></span></h2>
      <p className="global-prize__intro">Seed funding for one winning startup. <a className="global-prize__terms" href="https://www.hultprize.org/terms-conditions" target="_blank" rel="noopener noreferrer">Prize terms <ArrowUpRight size={13} aria-hidden="true" /></a></p>
    </div>
  </section>
}
