// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CircleAlert, CircleCheck, CircleMinus, type LucideIcon } from 'lucide-react'
import type { Rating } from '@/engine/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Badge, type BadgeTone } from './Badge'

/** Icon and tone of each rating; the word is the message rating.<rating>. */
export const RATING_META: Record<Rating, { icon: LucideIcon; tone: BadgeTone }> = {
  favourable: { icon: CircleCheck, tone: 'good' },
  mixed: { icon: CircleMinus, tone: 'mixed' },
  challenging: { icon: CircleAlert, tone: 'bad' },
}

/** A forecast rating shown with icon, word and colour, never colour alone. */
export function RatingPill({ rating, size = 'md', className }: { rating: Rating; size?: 'sm' | 'md'; className?: string }) {
  const { t } = useT()
  const { icon: Icon, tone } = RATING_META[rating]
  return (
    <Badge tone={tone} size={size} className={cn('font-semibold', className)}>
      <Icon aria-hidden strokeWidth={2.2} />
      {t(`rating.${rating}`)}
    </Badge>
  )
}
