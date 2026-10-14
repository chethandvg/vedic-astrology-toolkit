// The engine names a koota's values in English (a varna, yoni or gana, a sign lord, a sign);
// this shows them in the current language. Tara values come already worded by the engine's
// interpretation pack, so anything unknown is shown as it is.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SIGN_NAMES } from '@/engine/core'
import type { Planet } from '@/engine/types'
import type { Names } from '@/i18n'

export function matchValue(value: string, n: Names): string {
  if (value in n.term) return n.term[value]
  if (value in n.body) return n.body[value as Planet]
  const sign = (SIGN_NAMES as readonly string[]).indexOf(value)
  return sign >= 0 ? n.sign[sign] : value
}
