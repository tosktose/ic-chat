import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** Breakpoints alinhados ao Tailwind: md 768 · lg 1024 · xl 1280 · 2xl 1536 */
export const useIsMobile = () => !useMediaQuery('(min-width: 768px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsWide = () => useMediaQuery('(min-width: 1440px)')
