import { useLayoutEffect, useRef, type ReactNode } from 'react'
import './Drawer.css'

type DrawerProps = {
  title: string
  open: boolean
  onClose: () => void
  onExited: () => void
  children: ReactNode
}

export default function Drawer({ title, open, onClose, onExited, children }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeRequested = useRef(false)
  const callbacks = useRef({ onClose, onExited })
  const interruptedTransform = useRef<string | null>(null)
  useLayoutEffect(() => { callbacks.current = { onClose, onExited } }, [onClose, onExited])
  const requestClose = () => {
    if (!open || closeRequested.current) return
    closeRequested.current = true
    callbacks.current.onClose()
  }

  useLayoutEffect(() => {
    const el = dialog.current
    if (!el) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    interruptedTransform.current = null
    el.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      el.close()
      document.body.style.overflow = overflow
      const target = previous?.isConnected ? previous : document.querySelector<HTMLElement>('main')
      target?.focus({ preventScroll: true })
    }
  }, [])

  // The parent retains the content while open is false. This makes browser
  // Back, direct route changes and the close button share the same exit.
  useLayoutEffect(() => {
    const el = dialog.current
    const panel = el?.querySelector<HTMLElement>('.story-drawer__panel')
    if (!el || !panel) return
    closeRequested.current = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 760px)').matches
    const outside = mobile ? 'translateY(120%)' : 'translateX(120%)'
    el.dataset.motion = open ? 'enter' : 'exit'
    if (reduced) {
      if (!open) callbacks.current.onExited()
      return
    }
    let cancelled = false
    const from = interruptedTransform.current ?? (open ? outside : getComputedStyle(panel).transform)
    interruptedTransform.current = null
    const animation = panel.animate([{ transform: from }, { transform: open ? 'translate(0,0)' : outside }], {
      duration: open ? 600 : 400,
      easing: open ? 'ease' : 'cubic-bezier(.55,.085,.68,.53)',
      fill: 'forwards',
    })
    if (!open) void animation.finished.then(() => { if (!cancelled) callbacks.current.onExited() }).catch(() => {})
    return () => {
      cancelled = true
      interruptedTransform.current = getComputedStyle(panel).transform
      animation.cancel()
    }
  }, [open])

  return <dialog ref={dialog} className="story-drawer" data-lenis-prevent aria-labelledby="drawer-title" onCancel={event => { event.preventDefault(); requestClose() }} onClick={event => { if (event.target === event.currentTarget) requestClose() }} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]')].filter(el => el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length > 0)
    const first = targets[0], last = targets.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}>
    <div className="story-drawer__panel"><header><h2 id="drawer-title">{title}</h2><button autoFocus type="button" onClick={requestClose} aria-label="Close panel">×</button></header><div className="story-drawer__body" inert={!open}>{children}</div></div>
  </dialog>
}
