// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import { PRESETS } from '@/engine/types'
import { createProfile, deleteProfile, getProfile, getProfiles, setActiveProfile, updateProfile } from './profiles'
import { DEFAULT_APP_SETTINGS, getSettings, presetFor, resetSettings, updateSettings } from './settings'

// Node has no localStorage, so these exercise the in-memory fallback.
describe('settings store', () => {
  it('applies presets and derives custom from edits', () => {
    resetSettings()
    expect(getSettings()).toEqual(DEFAULT_APP_SETTINGS)
    updateSettings({ preset: 'book' })
    expect(getSettings()).toMatchObject({ ...PRESETS.book, preset: 'book' })
    updateSettings({ ayanamsa: 'raman' })
    expect(getSettings().preset).toBe('custom')
    updateSettings({ ayanamsa: 'lahiri' })
    expect(getSettings().preset).toBe('book')
    updateSettings({ preset: 'custom' })
    expect(getSettings()).toMatchObject({ ...PRESETS.book, preset: 'custom' })
    updateSettings({ theme: 'light', chartStyle: 'south' })
    expect(getSettings()).toMatchObject({ preset: 'custom', theme: 'light', chartStyle: 'south' })
    expect(presetFor(PRESETS.popular)).toBe('popular')
  })
})

describe('profiles store', () => {
  it('creates, updates, activates and deletes profiles', () => {
    const birth = { name: '  Asha ', date: '1990-01-01', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.97, longitude: 77.59, place: '' }
    const a = createProfile(birth)
    expect(a.id).toMatch(/^[0-9a-z]{10}$/)
    expect(a.birth).toEqual({ name: 'Asha', date: '1990-01-01', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.97, longitude: 77.59 })
    const b = createProfile({ ...birth, name: 'Ben' })
    expect(getProfiles().map((p) => p.id)).toEqual([a.id, b.id])
    expect(updateProfile(a.id, { ...a.birth, time: '06:30:15' })?.birth.time).toBe('06:30:15')
    setActiveProfile(a.id)
    deleteProfile(a.id)
    expect(getProfile(a.id)).toBeUndefined()
    expect(getProfiles()).toHaveLength(1)
    expect(updateProfile('missing', birth)).toBeUndefined()
  })
})
