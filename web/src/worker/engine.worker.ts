// Runs the astrology engine off the main thread. Comlink turns engineApi calls
// from src/lib/engine.ts into messages; init() defaults to the bundled wasm
// asset so the page never needs to know its hashed URL.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expose } from 'comlink'
import wasmUrl from '../../wasm/swisseph.wasm?url'
import { engineApi, type EngineApi } from '../engine/api'

const api: EngineApi = {
  ...engineApi,
  // `??` rather than a spread default, so an explicit `wasmUrl: undefined` cannot drop the bundled URL.
  init: (options = {}) => engineApi.init({ ...options, wasmUrl: options.wasmUrl ?? wasmUrl }),
}

expose(api)
