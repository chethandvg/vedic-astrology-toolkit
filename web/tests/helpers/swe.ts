// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initSwe } from '@/engine/swe'

/** Initialise the WebAssembly engine inside Vitest (Node). */
export function loadSwe() {
  const wasm = readFileSync(fileURLToPath(new URL('../../wasm/swisseph.wasm', import.meta.url)))
  return initSwe({ wasmBinary: wasm })
}
