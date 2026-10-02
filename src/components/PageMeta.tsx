import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { canonicalUrl, metadataForPath, metadataImageUrl, metadataTitle, META_SITE_NAME } from '../data/pageMeta'

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.append(tag)
  }
  tag.content = content
}

// Static route files cover link previews; this keeps the same metadata in sync after client navigation.
export default function PageMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const meta = metadataForPath(pathname)
    document.title = metadataTitle(meta)
    setMeta('name', 'description', meta.description)
    setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', metadataTitle(meta))
    setMeta('property', 'og:description', meta.description)
    setMeta('property', 'og:site_name', META_SITE_NAME)
    setMeta('property', 'og:type', meta.type)
    setMeta('property', 'og:url', canonicalUrl(meta))
    setMeta('property', 'og:image', metadataImageUrl(meta))
    setMeta('property', 'og:image:alt', meta.imageAlt)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', metadataTitle(meta))
    setMeta('name', 'twitter:description', meta.description)
    setMeta('name', 'twitter:image', metadataImageUrl(meta))
    setMeta('name', 'twitter:image:alt', meta.imageAlt)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical) }
    canonical.href = canonicalUrl(meta)
  }, [pathname])
  return null
}
