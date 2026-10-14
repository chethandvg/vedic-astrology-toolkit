// Typed wrapper around Swiss Ephemeris compiled to WebAssembly (see web/wasm).
// Mirrors the calls made by the Python toolkit (vedic_toolkit/astronomy.py) so
// results agree to floating-point precision. Single-threaded: call from one worker.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import createSwissEph, { type SwissEphModule, type SwissEphOptions } from '../../wasm/swisseph.mjs'

export const SE = {
  SUN: 0, MOON: 1, MERCURY: 2, VENUS: 3, MARS: 4, JUPITER: 5, SATURN: 6, MEAN_NODE: 10, TRUE_NODE: 11,
  FLG_MOSEPH: 4, FLG_SPEED: 256, FLG_EQUATORIAL: 2048, FLG_SIDEREAL: 65536,
  CALC_RISE: 1, CALC_SET: 2, BIT_DISC_CENTER: 256, BIT_NO_REFRACTION: 512,
  GREG_CAL: 1,
  SIDM_LAHIRI: 1, SIDM_RAMAN: 3, SIDM_KRISHNAMURTI: 5, SIDM_YUKTESHWAR: 7, SIDM_TRUE_CITRA: 27, SIDM_TRUE_PUSHYA: 29,
} as const

export interface CalcResult { longitude: number; latitude: number; distance: number; speed: number; flags: number }

type Fn = (...args: number[]) => number

class SwissEph {
  private readonly m: SwissEphModule
  private readonly xx: number
  private readonly serr: number
  private readonly scratch: number
  private readonly fn: Record<string, Fn>
  private sidMode = -1

  constructor(m: SwissEphModule) {
    this.m = m
    this.xx = m._malloc(6 * 8)
    this.serr = m._malloc(256)
    this.scratch = m._malloc(64 * 8)
    const w = (name: string, ret: string | null, args: string[]) => m.cwrap(name, ret, args)
    const n = (count: number) => Array<string>(count).fill('number')
    this.fn = {
      calc: w('swe_calc_ut', 'number', n(5)),
      houses: w('swe_houses_ex', 'number', n(7)),
      rise: w('swe_rise_trans', 'number', n(10)),
      utc2jd: w('swe_utc_to_jd', 'number', n(9)),
      jd2utc: w('swe_jdut1_to_utc', null, n(8)),
      julday: w('swe_julday', 'number', n(5)),
      sid: w('swe_set_sid_mode', null, n(3)),
      ayan: w('swe_get_ayanamsa_ex_ut', 'number', n(4)),
      sidtime: w('swe_sidtime', 'number', n(1)),
      version: w('swe_version', 'number', n(1)),
    }
  }

  private f64(ptr: number, i = 0): number { return this.m.HEAPF64[(ptr >> 3) + i] }
  private i32(ptr: number, i = 0): number { return this.m.HEAP32[(ptr >> 2) + i] }
  private error(): string { return this.m.UTF8ToString(this.serr) }

  version(): string {
    this.fn.version(this.scratch)
    return this.m.UTF8ToString(this.scratch)
  }

  setSiderealMode(mode: number): void {
    if (mode !== this.sidMode) {
      this.fn.sid(mode, 0, 0)
      this.sidMode = mode
    }
  }

  /** swe_calc_ut with Moshier; refuses a silent engine fallback like the Python toolkit. */
  calcUt(jdUt: number, body: number, flags: number): CalcResult {
    const ret = this.fn.calc(jdUt, body, flags | SE.FLG_MOSEPH, this.xx, this.serr)
    if (ret < 0) throw new Error(`swe_calc_ut failed: ${this.error()}`)
    if ((ret & 7) !== SE.FLG_MOSEPH) throw new Error('Ephemeris fell back to a different engine; refusing result')
    return { longitude: this.f64(this.xx, 0), latitude: this.f64(this.xx, 1), distance: this.f64(this.xx, 2), speed: this.f64(this.xx, 3), flags: ret }
  }

  /** swe_houses_ex. ascmc[0] is the ascendant, ascmc[1] the MC. */
  housesEx(jdUt: number, flags: number, latitude: number, longitude: number, hsys = 'W'): { ascendant: number; mc: number; cusps: number[] } {
    const cusps = this.scratch
    const ascmc = this.scratch + 16 * 8
    this.fn.houses(jdUt, flags, latitude, longitude, hsys.charCodeAt(0), cusps, ascmc)
    return { ascendant: this.f64(ascmc, 0), mc: this.f64(ascmc, 1), cusps: Array.from({ length: 12 }, (_, i) => this.f64(cusps, i + 1)) }
  }

  /** swe_rise_trans with Moshier. Returns null for polar day or night (ret = -2). */
  riseTrans(jdUt: number, body: number, rsmi: number, longitude: number, latitude: number, altitude = 0, pressure = 1013.25, temperature = 15): number | null {
    const geopos = this.scratch
    const tret = this.scratch + 4 * 8
    this.m.HEAPF64[geopos >> 3] = longitude
    this.m.HEAPF64[(geopos >> 3) + 1] = latitude
    this.m.HEAPF64[(geopos >> 3) + 2] = altitude
    const ret = this.fn.rise(jdUt, body, 0, SE.FLG_MOSEPH, rsmi, geopos, pressure, temperature, tret, this.serr)
    if (ret === -2) return null
    if (ret < 0) throw new Error(`swe_rise_trans failed: ${this.error()}`)
    return this.f64(tret, 0)
  }

  /** UTC calendar time to JD ET and JD UT1, as swe.utc_to_jd. */
  utcToJd(year: number, month: number, day: number, hour: number, minute: number, second: number): { et: number; ut1: number } {
    const dret = this.scratch
    const ret = this.fn.utc2jd(year, month, day, hour, minute, second, SE.GREG_CAL, dret, this.serr)
    if (ret < 0) throw new Error(`swe_utc_to_jd failed: ${this.error()}`)
    return { et: this.f64(dret, 0), ut1: this.f64(dret, 1) }
  }

  /** JD UT1 to UTC calendar fields, as swe.jdut1_to_utc. */
  jdut1ToUtc(jdUt: number): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
    const p = this.scratch
    this.fn.jd2utc(jdUt, SE.GREG_CAL, p, p + 4, p + 8, p + 12, p + 16, p + 24)
    return { year: this.i32(p, 0), month: this.i32(p, 1), day: this.i32(p, 2), hour: this.i32(p, 3), minute: this.i32(p, 4), second: this.f64(p + 24) }
  }

  julday(year: number, month: number, day: number, hour: number): number {
    return this.fn.julday(year, month, day, hour, SE.GREG_CAL)
  }

  /** Ayanamsa in degrees for the current sidereal mode. */
  ayanamsa(jdUt: number, flags = 0): number {
    const ret = this.fn.ayan(jdUt, flags | SE.FLG_MOSEPH, this.scratch, this.serr)
    if (ret < 0) throw new Error(`swe_get_ayanamsa_ex_ut failed: ${this.error()}`)
    return this.f64(this.scratch)
  }

  siderealTime(jdUt: number): number {
    return this.fn.sidtime(jdUt)
  }
}

let instance: SwissEph | null = null
let loading: Promise<SwissEph> | null = null

/** Load the WebAssembly module once. Browsers may pass locateFile; Node tests pass wasmBinary. */
export function initSwe(options?: SwissEphOptions): Promise<SwissEph> {
  if (instance) return Promise.resolve(instance)
  loading ??= createSwissEph(options).then((m) => (instance = new SwissEph(m)))
  return loading
}

/** The loaded engine. Throws if initSwe() has not completed. */
export function swe(): SwissEph {
  if (!instance) throw new Error('Swiss Ephemeris not initialised: await initSwe() first')
  return instance
}

export type { SwissEph }
