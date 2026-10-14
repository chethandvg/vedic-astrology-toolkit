// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { activateLanguage, resolveLanguage } from './i18n'
import { reloadOnStaleChunks } from './lib/chunkReload'
import { getSettings } from './state/settings'

reloadOnStaleChunks()

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

// Another language is loaded before the first render, so the page never flashes English first;
// if its chunks cannot load, the app starts in English.
const lang = resolveLanguage(getSettings().language)
if (lang === 'en') render()
else activateLanguage(lang).catch(() => {}).finally(render)
