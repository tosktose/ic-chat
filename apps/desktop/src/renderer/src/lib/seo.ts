import { useEffect } from 'react'

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value)
}

/** Título, descrição e indexação por página (o Google lê isso depois de renderizar o JS). */
export function useSeo({ title, description, path, noindex }: { title: string; description?: string; path?: string; noindex?: boolean }) {
  useEffect(() => {
    document.title = title
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[name="twitter:title"]', 'content', title)
    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
    }
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
    if (path !== undefined) {
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (canonical) {
        let origin = location.origin
        try { origin = new URL(canonical.href).origin } catch { /* usa a origem atual */ }
        canonical.href = origin + path
        setMeta('meta[property="og:url"]', 'content', canonical.href)
      }
    }
  }, [title, description, path, noindex])
}
