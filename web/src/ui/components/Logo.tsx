// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * The Jyotish Daily mark: the Sun rising on the horizon, because the Vedic day
 * runs from sunrise to sunrise, under a morning star. Same artwork as
 * public/favicon.svg (keep them in step).
 */
export function LogoMark({ className, tile = true, title }: { className?: string; tile?: boolean; title?: string }) {
  const id = useId()
  const bg = `${id}-bg`, gold = `${id}-gold`
  return (
    <svg viewBox="0 0 64 64" className={cn('size-9', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <radialGradient id={bg} cx="0.3" cy="0.18" r="0.95">
          <stop offset="0" stopColor="#27336f" />
          <stop offset="0.55" stopColor="#121a3a" />
          <stop offset="1" stopColor="#090d1d" />
        </radialGradient>
        <linearGradient id={gold} x1="0" y1="18" x2="0" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe6b3" />
          <stop offset="0.55" stopColor="#f8bd57" />
          <stop offset="1" stopColor="#e9951f" />
        </linearGradient>
      </defs>
      {tile && <rect width="64" height="64" rx="15" fill={`url(#${bg})`} />}
      <LogoArt gold={`url(#${gold})`} />
    </svg>
  )
}

function LogoArt({ gold }: { gold: string }) {
  return (
    <>
      <path d="M21.5 40a10.5 10.5 0 0 1 21 0z" fill={gold} />
      <g stroke={gold} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M32 25.2V19.6M39.4 27.2l2.8-4.85M24.6 27.2l-2.8-4.85M44.8 32.6l4.85-2.8M19.2 32.6l-4.85-2.8" />
        <path d="M10.5 40h43" />
        <path d="M20 46.5h24" strokeOpacity="0.55" strokeWidth="2.2" />
        <path d="M26.5 52.5h11" strokeOpacity="0.3" strokeWidth="2.2" />
      </g>
      <path d="M49 8.5c.6 3.2 1.4 4 4.6 4.6-3.2.6-4 1.4-4.6 4.6-.6-3.2-1.4-4-4.6-4.6 3.2-.6 4-1.4 4.6-4.6z" fill="#ffe6b3" />
      <circle cx="14.5" cy="16.5" r="1.4" fill="#c4b5fd" />
      <circle cx="38" cy="9.5" r="0.9" fill="#ffffff" fillOpacity="0.7" />
    </>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-[1.15rem] font-semibold tracking-tight text-[var(--text)]', className)}>
      Jyotish <span className="text-[var(--accent-text)]">Daily</span>
    </span>
  )
}
