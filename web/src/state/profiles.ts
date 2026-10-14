// Birth profiles, kept only in this browser's localStorage.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { t } from '@/i18n'
import { useSyncExternalStore } from 'react'
import type { BirthInput } from '@/engine/types'
import { createPersistentStore } from './storage'

export interface Profile {
  id: string
  birth: BirthInput
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
}

interface ProfilesState {
  profiles: Profile[]
  /** The profile the navigation tabs point at (last opened). */
  activeId: string | null
}

export const PROFILES_KEY = 'jyotish-daily:profiles:v1'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Structural check for stored or imported birth data (the form validates meaning). */
export function isBirthInput(v: unknown): v is BirthInput {
  return isObject(v)
    && typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date)
    && typeof v.time === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v.time)
    && typeof v.timeZone === 'string' && v.timeZone.length > 0
    && isFiniteNumber(v.latitude) && isFiniteNumber(v.longitude)
    && (v.fold === undefined || v.fold === 0 || v.fold === 1)
    && (v.name === undefined || typeof v.name === 'string')
    && (v.place === undefined || typeof v.place === 'string')
}

function parseState(raw: unknown): ProfilesState {
  if (!isObject(raw) || !Array.isArray(raw.profiles)) return { profiles: [], activeId: null }
  const profiles = raw.profiles.filter((p): p is Profile =>
    isObject(p) && typeof p.id === 'string' && isBirthInput(p.birth)
    && typeof p.createdAt === 'string' && typeof p.updatedAt === 'string')
  const activeId = typeof raw.activeId === 'string' && profiles.some((p) => p.id === raw.activeId) ? raw.activeId : null
  return { profiles, activeId }
}

const store = createPersistentStore(PROFILES_KEY, parseState)

/** Short URL-friendly id, e.g. "k3j9x2a1qz". */
function newId(taken: Set<string>): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(10))
    const id = Array.from(bytes, (b) => alphabet[b % 36]).join('')
    if (!taken.has(id)) return id
  }
}

/** Keep only the fields BirthInput defines, dropping empty optional ones. */
function cleanBirth(birth: BirthInput): BirthInput {
  const { name, date, time, timeZone, fold, latitude, longitude, place } = birth
  return {
    ...(name?.trim() ? { name: name.trim() } : {}),
    date, time, timeZone,
    ...(fold === 0 || fold === 1 ? { fold } : {}),
    latitude, longitude,
    ...(place?.trim() ? { place: place.trim() } : {}),
  }
}

export const getProfiles = (): Profile[] => store.get().profiles
export const getProfile = (id: string): Profile | undefined => store.get().profiles.find((p) => p.id === id)

export function createProfile(birth: BirthInput): Profile {
  const now = new Date().toISOString()
  const profile: Profile = { id: newId(new Set(getProfiles().map((p) => p.id))), birth: cleanBirth(birth), createdAt: now, updatedAt: now }
  store.set((s) => ({ profiles: [...s.profiles, profile], activeId: profile.id }))
  return profile
}

export function updateProfile(id: string, birth: BirthInput): Profile | undefined {
  const current = getProfile(id)
  if (!current) return undefined
  const updated: Profile = { ...current, birth: cleanBirth(birth), updatedAt: new Date().toISOString() }
  store.set((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? updated : p)) }))
  return updated
}

export function deleteProfile(id: string): void {
  store.set((s) => ({
    profiles: s.profiles.filter((p) => p.id !== id),
    activeId: s.activeId === id ? null : s.activeId,
  }))
}

export function deleteAllProfiles(): void {
  store.set({ profiles: [], activeId: null })
}

export function setActiveProfile(id: string): void {
  if (store.get().activeId !== id && getProfile(id)) store.set((s) => ({ ...s, activeId: id }))
}

const selectState = () => store.get()

export function useProfiles(): Profile[] {
  return useSyncExternalStore(store.subscribe, selectState, selectState).profiles
}

export function useProfile(id: string | undefined): Profile | undefined {
  const profiles = useProfiles()
  return id ? profiles.find((p) => p.id === id) : undefined
}

/** The last opened profile, else the first one; undefined when there are none. */
export function useActiveProfile(): Profile | undefined {
  const { profiles, activeId } = useSyncExternalStore(store.subscribe, selectState, selectState)
  return profiles.find((p) => p.id === activeId) ?? profiles[0]
}

/** Initials for avatars: "Ravi Kumar" -> "RK". */
export function profileInitials(profile: Profile): string {
  const words = (profile.birth.name ?? '').trim().split(/\s+/).filter(Boolean)
  return (words.length ? words.slice(0, 2).map((w) => w[0]) : ['?']).join('').toUpperCase()
}

export const profileName = (profile: Profile): string => profile.birth.name?.trim() || t('profiles.unnamed')
