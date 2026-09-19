import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Keeps the tab title and canonical path in step as the user navigates
 * client-side. A fresh page load already gets the right <head> from the
 * server (src/services/seo.service.ts); this only covers in-app transitions,
 * where no new HTML is fetched. Pass no title while the page's data is still
 * loading so a placeholder never replaces the server-rendered one.
 */
export function useDocumentMeta(title?: string): void {
  const { pathname } = useLocation()

  useEffect(() => {
    if (title) document.title = title
  }, [title])

  useEffect(() => {
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) return

    const url = new URL(canonical.href)
    url.pathname = pathname
    canonical.href = url.toString()
  }, [pathname])
}
