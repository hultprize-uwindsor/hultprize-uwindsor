import { Children, Fragment, isValidElement, type CSSProperties, type ReactNode } from 'react'

/** Native text shaping keeps word endings and punctuation outside character masks. */
export function HeroTitle({ children, id }: { children: ReactNode; id?: string }) {
  return <h1 id={id} className="hero-title" data-hero-reveal>{children}</h1>
}

/** Two character tracks reproduce the staggered vertical label turnover. */
export function RollingLabel({ children }: { children: string }) {
  let index = 0
  const words = children.split(/(\s+)/).map((word, wordIndex) => /^\s+$/.test(word) ? word : <span className="rolling-label__word" key={wordIndex}>{Array.from(word).map(letter => <span className="rolling-label__char" key={index} style={{ '--char-index': index++ } as CSSProperties}>{letter}</span>)}</span>)
  return <span className="rolling-label"><span className="visually-hidden">{children}</span>{[0, 1].map(row => <span key={row} className={`rolling-label__row${row ? ' rolling-label__row--next' : ''}`} aria-hidden="true">{words}</span>)}</span>
}

/** Preserve natural line breaks, kerning and a single accessible heading. */
export function RevealText({ children }: { children: ReactNode }) {
  let index = 0
  const content = Children.map(children, (child, childIndex) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child).split(/(\s+)/).map((word, wordIndex) => /^\s+$/.test(word) ? word : <span className="reveal-word" key={`${childIndex}-${wordIndex}`}>{Array.from(word).map(letter => <span className="reveal-letter" style={{ '--char-index': index++ } as CSSProperties} key={index}>{letter}</span>)}</span>)
    if (isValidElement(child) && child.type === 'br') return <br />
    return child
  })
  return <Fragment><span className="visually-hidden">{children}</span><span aria-hidden="true" className="reveal-text">{content}</span></Fragment>
}
