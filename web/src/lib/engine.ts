// Main-thread client for the engine worker: one shared worker for the whole app that is
// replaced when it dies, calls sent to it one at a time, a small cache of results by key (so
// returning to a view is instant and prefetches pay off), and a React hook that runs a cached
// engine call with a retry and drops requests superseded before they were sent.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { releaseProxy, wrap, type Remote } from 'comlink'
import type { EngineApi } from '@/engine/api'
import { getLanguage, subscribeLanguage } from '@/i18n/store'

export type Engine = Remote<EngineApi>

export const ENGINE_START_FAILED = 'The calculation engine could not start.'
export const ENGINE_STOPPED = 'The calculation engine stopped unexpectedly.'

/**
 * A call still unanswered after this long is taken to mean the worker died silently (a crashed
 * or killed worker never replies). Generous: a year takes about half a second on a laptop.
 */
const CALL_TIMEOUT_MS = 45_000

interface Instance {
  remote: Engine
  /** Rejects once the worker is known to be dead; every pending call races it. */
  dead: Promise<never>
  stopped: boolean
  kill(reason: Error): void
}

let instance: Promise<Instance> | null = null

/** A promise that rejects with `error` after CALL_TIMEOUT_MS, and a way to call that off. */
function deadline(error: Error): { expired: Promise<never>; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(error), CALL_TIMEOUT_MS)
  })
  return { expired, cancel: () => clearTimeout(timer) }
}

function start(): Promise<Instance> {
  const worker = new Worker(new URL('../worker/engine.worker.ts', import.meta.url), { type: 'module', name: 'engine' })
  const remote = wrap<EngineApi>(worker)
  let reject!: (e: Error) => void
  const dead = new Promise<never>((_, r) => { reject = r })
  dead.catch(() => {}) // Observed by the calls racing it; nothing else needs to hear about it.
  const self: Instance = {
    remote,
    dead,
    stopped: false,
    kill(reason) {
      if (self.stopped) return
      self.stopped = true
      reject(reason)
      remote[releaseProxy]()
      worker.terminate()
      // A later call starts a fresh worker, unless another one has already replaced this one.
      if (instance === current) instance = null
    },
  }
  // An uncaught error (a failed load, a WebAssembly abort outside a call) leaves the worker unusable.
  worker.addEventListener('error', (e) => self.kill(new Error(e.message || 'The engine worker failed')))
  const limit = deadline(new Error('The engine did not start in time'))
  // A new worker writes English until told otherwise.
  const ready = remote.init().then(() => (getLanguage() === 'en' ? undefined : remote.setLanguage(getLanguage())))
  const current = Promise.race([ready, dead, limit.expired]).finally(limit.cancel).then(
    () => self,
    (e: unknown) => {
      self.kill(e instanceof Error ? e : new Error(String(e)))
      // The underlying error (a 404, "Aborted(CompileError ...)") means nothing to users; keep it as the cause.
      throw new Error(ENGINE_START_FAILED, { cause: e })
    },
  )
  return current
}

// A running worker switches language before any call queued after the change (calls run in order).
subscribeLanguage(() => {
  if (instance) runEngine((engine) => engine.setLanguage(getLanguage())).catch(() => {})
})

/** The shared engine, initialised. A failed start is forgotten so the next call retries. */
export function getEngine(): Promise<Engine> {
  return (instance ??= start()).then((i) => i.remote)
}

/** A WebAssembly trap or Emscripten abort: the module's memory can no longer be trusted. */
const isFatal = (e: unknown) =>
  e instanceof Error && (e.name === 'RuntimeError' || /^Aborted\(|unreachable|memory access out of bounds/.test(e.message))

/** The last call handed to the worker (settled or not); the next one waits for it. */
let queue: Promise<unknown> = Promise.resolve()

/**
 * Run `run` against the engine. Calls reach the worker one at a time, as it computes them anyway,
 * so a call's deadline measures its own run rather than the queue ahead of it. When the worker
 * dies during the call (crash, WebAssembly abort, no reply within CALL_TIMEOUT_MS) it is discarded
 * and the call is retried once on a new worker.
 */
export function runEngine<T>(run: (engine: Engine) => Promise<T>): Promise<T> {
  const result = queue.then(() => runNow(run))
  queue = result.catch(() => {})
  return result
}

async function runNow<T>(run: (engine: Engine) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const current = await (instance ??= start())
    const silent = new Error('The engine did not answer')
    const limit = deadline(silent)
    try {
      return await Promise.race([run(current.remote), current.dead, limit.expired])
    } catch (e) {
      if (!(current.stopped || e === silent || isFatal(e))) throw e
      current.kill(e instanceof Error ? e : new Error(String(e)))
      if (attempt > 0) throw new Error(ENGINE_STOPPED, { cause: e })
    } finally {
      limit.cancel()
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Results by key: the same request (same key) is computed once and kept for a while.

const MAX_RESULTS = 32
const results = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()

function remember(key: string, value: unknown) {
  results.delete(key)
  results.set(key, value)
  if (results.size > MAX_RESULTS) results.delete(results.keys().next().value!)
}

/** A cached result, or undefined. */
function peek<T>(key: string): T | undefined {
  return results.get(key) as T | undefined
}

/** True when `key` is cached or already being computed, so asking for it adds no work. */
const known = (key: string) => results.has(key) || pending.has(key)

/**
 * Results hold text in the language they were computed in, so every key is taken in the current
 * language: a language change computes afresh, and switching back finds the earlier results.
 */
const inLanguage = (key: string, lang = getLanguage()) => `${lang}|${key}`

/** The result for `key`, from the cache, from a call already running, or computed now. */
export function fetchEngine<T>(key: string, run: (engine: Engine) => Promise<T>): Promise<T> {
  return fetchKeyed(inLanguage(key), run)
}

function fetchKeyed<T>(key: string, run: (engine: Engine) => Promise<T>): Promise<T> {
  if (results.has(key)) {
    const value = results.get(key) as T
    remember(key, value)
    return Promise.resolve(value)
  }
  let p = pending.get(key) as Promise<T> | undefined
  if (!p) {
    p = runEngine(run).then((value) => {
      remember(key, value)
      return value
    }).finally(() => pending.delete(key))
    pending.set(key, p)
  }
  return p
}

/** Compute `key` in the background so a later view finds it ready; failures are left for that view. */
export function prefetchEngine<T>(key: string, run: (engine: Engine) => Promise<T>): void {
  fetchEngine(key, run).catch(() => {})
}

export interface EngineQuery<T> {
  /** Latest result; the previous key's result is kept while a new key loads (so steps do not flash). */
  data: T | undefined
  error: Error | null
  loading: boolean
  /** Run the request again after an error (a failed engine start is retried too). */
  retry(): void
}

interface QueryState<T> {
  key: string | null
  attempt: number
  data: T | undefined
  error: Error | null
}

/**
 * The cached result of `run` for `key`; null runs nothing (for example, when the profile is
 * missing). A cached key renders at once, without a loading state. Each hook keeps one request
 * of its own in the worker: a new key asked for while it runs waits for it, and only the latest
 * of the keys that waited is then sent, so five quick steps compute two periods, not five.
 */
export function useEngineQuery<T>(baseKey: string | null, run: (engine: Engine) => Promise<T>): EngineQuery<T> {
  const lang = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage)
  const key = baseKey === null ? null : inLanguage(baseKey, lang)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<QueryState<T>>({ key: null, attempt: 0, data: undefined, error: null })
  /** This hook's request still in the worker, if any. */
  const inFlight = useRef<Promise<unknown> | null>(null)
  const cached = key === null ? undefined : peek<T>(key)
  useEffect(() => {
    if (key === null) return
    let current = true
    const send = () => {
      if (!current) return // Superseded while waiting: never sent.
      const p = fetchKeyed(key, run)
      inFlight.current = p
      const settled = () => {
        if (inFlight.current === p) inFlight.current = null
      }
      p.then(
        (data) => {
          settled()
          if (current) setState({ key, attempt, data, error: null })
        },
        (e: unknown) => {
          settled()
          if (current) setState({ key, attempt, data: undefined, error: e instanceof Error ? e : new Error(String(e)) })
        },
      )
    }
    const busy = inFlight.current
    if (busy && !known(key)) void busy.then(send, send)
    else send()
    return () => {
      current = false
    }
    // `run` is recreated every render; `key` stands for its inputs.
  }, [key, attempt])
  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  if (cached !== undefined) return { data: cached, error: null, loading: false, retry }
  const settled = state.key === key && state.attempt === attempt
  return { data: state.data, error: settled ? state.error : null, loading: key !== null && !settled, retry }
}
