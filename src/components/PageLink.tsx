import type { ComponentProps } from 'react'
import { Link as RouterLink, NavLink as RouterNavLink, useLocation, useResolvedPath, type To } from 'react-router-dom'

function usePageTransition(to: To, relative?: 'route' | 'path') {
  const current = useLocation()
  const destination = useResolvedPath(to, { relative })
  return current.pathname !== destination.pathname
}

/** Query drawers and same-page anchors keep their existing interactions. */
export function Link(props: ComponentProps<typeof RouterLink>) {
  const viewTransition = usePageTransition(props.to, props.relative)
  return <RouterLink viewTransition={viewTransition} {...props} />
}

export function NavLink(props: ComponentProps<typeof RouterNavLink>) {
  const viewTransition = usePageTransition(props.to, props.relative)
  return <RouterNavLink viewTransition={viewTransition} {...props} />
}
