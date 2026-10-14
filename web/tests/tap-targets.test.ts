import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')

function src(rel: string) {
  return readFileSync(join(root, rel), 'utf8')
}

describe('tap targets meet 44px minimum on touch widths (issue #7)', () => {
  it('ChartSwitcher segments are 44px on mobile (h-11) and 32px on desktop (md:h-8)', () => {
    const s = src('src/ui/chart/ChartSwitcher.tsx')
    expect(s).toMatch(/h-11.*md:h-8/)
    // segment definition must contain h-11
    expect(s).toContain('h-11 md:h-8')
  })

  it('ChartSwitcher varga select is 44px on mobile', () => {
    const s = src('src/ui/chart/ChartSwitcher.tsx')
    expect(s).toMatch(/w-full h-11 md:h-8/)
  })

  it('SegmentedControl small size is 44px on mobile', () => {
    const s = src('src/ui/components/SegmentedControl.tsx')
    expect(s).toContain('h-11 md:h-8 px-3')
  })

  it('Day/Night toggle via SegmentedControl inherits 44px height', () => {
    const panel = src('src/ui/forecast/DayTimingsPanel.tsx')
    // DayTimingsPanel uses SegmentedControl size="sm" which now resolves to h-11 md:h-8
    expect(panel).toContain('SegmentedControl')
    const seg = src('src/ui/components/SegmentedControl.tsx')
    expect(seg).toContain('h-11 md:h-8')
  })

  it('MonthCalendar cells have min 44px (size-11)', () => {
    const s = src('src/ui/forecast/MonthCalendar.tsx')
    expect(s).toContain('min-h-11')
    expect(s).toContain('min-w-11')
  })

  it('Add seconds button has 44px touch target', () => {
    const s = src('src/pages/NewProfilePage.tsx')
    expect(s).toContain('min-h-11')
    // the Add seconds / Hide seconds toggle button
    expect(s).toMatch(/Add seconds.*min-h-11|min-h-11.*Add seconds/s)
  })
})
