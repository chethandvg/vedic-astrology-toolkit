// Chart-specific dasha and transit wording from the natal promise (engine/promise.ts): which houses
// a dasha lord rules and occupies from the lagna, how strong it is, and what that tends to mean for
// its period. Original wording; tendencies, never certainties.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { FunctionalRole } from '@/engine/functional'
import type { LordPromise } from '@/engine/promise'
import type { Effect, Planet } from '@/engine/types'
import { capitalize, joinList, ordinal, type ByHouse } from './format'
import { YOGA_CONTENT } from './yogas'

/** Life areas of the houses counted from the lagna, short enough to list ("home life and career"). */
export const HOUSE_AREAS: ByHouse<string> = [
  'personal goals', 'family finances', 'your own initiative', 'home life', 'creative pursuits', 'daily work',
  'partnerships', 'deep changes', 'good fortune', 'career', 'gains', 'rest',
]

export type DashaScope = 'period' | 'sub-period' | 'phase'

/** The scope of a dasha level: mahadasha, antardasha, pratyantardasha. */
export const scopeOfLevel = (level: number): DashaScope => (level <= 0 ? 'period' : level === 1 ? 'sub-period' : 'phase')

/** "Venus rules your 4th and 9th and sits in your 11th"; the nodes act for their sign lord. */
export function lordPlacement(p: LordPromise): string {
  const who = p.yogakaraka ? `${p.planet}, your yogakaraka,` : p.planet
  if (!p.rules.length) return `${who} sits in your ${ordinal(p.house)} and acts for its sign lord, ${p.dispositor}`
  return `${who} rules your ${joinList(p.rules.map(ordinal))} and sits in your ${ordinal(p.house)}`
}

/**
 * What stands out about a lord's condition, language-neutral so every content pack words the same
 * facts: dignity, Shadbala strength (a dignity and a strength that pull apart become one
 * "though" note) and combustion.
 */
export type ConditionNote =
  | 'exalted' | 'own' | 'debilitated' | 'strong' | 'modest' | 'combust'
  | 'debilitatedButStrong' | 'exaltedButModest' | 'ownButModest'

export function conditionNotes(p: LordPromise): ConditionNote[] {
  const strong = p.strengthRatio !== null && p.strengthRatio >= 1.25
  const modest = p.strengthRatio !== null && p.strengthRatio < 0.9
  const dignity = p.dignity === 'exalted' ? 'exalted' : p.dignity === 'own' || p.dignity === 'moolatrikona' ? 'own' : p.dignity === 'debilitated' ? 'debilitated' : null
  const notes: ConditionNote[] = []
  if (dignity === 'debilitated' && strong) notes.push('debilitatedButStrong')
  else if ((dignity === 'exalted' || dignity === 'own') && modest) notes.push(dignity === 'exalted' ? 'exaltedButModest' : 'ownButModest')
  else {
    if (dignity) notes.push(dignity)
    if (strong) notes.push('strong')
    else if (modest) notes.push('modest')
  }
  if (p.combust) notes.push('combust')
  return notes
}

/** +1 when the condition reads as a strength, -1 as a weakness, 0 when it is mixed or plain. */
export function conditionTone(p: LordPromise): Effect {
  const ratio = p.strengthRatio
  const good = ['exalted', 'own', 'moolatrikona'].includes(p.dignity) || (ratio !== null && ratio >= 1.25)
  const bad = p.dignity === 'debilitated' || p.combust || (ratio !== null && ratio < 0.9)
  return good === bad ? 0 : good ? 1 : -1
}

/**
 * How the condition joins the lord's own outlook: 'so' when they agree, 'although' when they
 * pull apart (an exalted lord whose period still asks for patience), else 'overall'.
 */
export function conditionLink(p: LordPromise): 'so' | 'although' | 'overall' {
  const tone = conditionTone(p)
  if (tone !== 0 && tone === p.effect) return 'so'
  if (tone !== 0 && p.effect === -tone) return 'although'
  return 'overall'
}

/**
 * The extra clause for a chain whose combined outlook differs from the sub-lord's own: name the
 * main period when it carries that outlook, else credit the rest of the running chain.
 */
export function chainClause(p: LordPromise, effect: Effect, main?: LordPromise): { main: LordPromise | null } | null {
  if (effect === p.effect) return null
  return { main: main && main.planet !== p.planet && main.effect === effect ? main : null }
}

const NOTE: Readonly<Record<ConditionNote, string>> = {
  exalted: 'is exalted', own: 'is in its own sign', debilitated: 'is debilitated', strong: 'is strong in your chart',
  modest: 'has modest strength', combust: 'sits close to the Sun', debilitatedButStrong: 'is debilitated, though strong overall',
  exaltedButModest: 'is exalted, though modest in strength', ownButModest: 'is in its own sign, though modest in strength',
}

/** "is exalted and strong in your chart", "has modest strength", or '' when nothing stands out. */
export const lordCondition = (p: LordPromise): string => joinList(conditionNotes(p).map((n) => NOTE[n]))

/** The life areas a lord's period tends to touch: the houses it rules, or the one a node occupies. */
export const lordAreas = (p: LordPromise): string => joinList((p.rules.length ? p.rules : [p.house]).map((h) => HOUSE_AREAS[h - 1]))

const OUTLOOK: Readonly<Record<'1' | '0' | '-1', (scope: DashaScope, areas: string) => string>> = {
  '1': (scope, areas) => `this ${scope} tends to support ${areas}`,
  '0': (scope, areas) => `this ${scope} tends to bring both openings and effort around ${areas}`,
  '-1': (scope, areas) => `this ${scope} tends to ask for patience around ${areas}, where steady habits help most`,
}

const outlook = (p: LordPromise, scope: DashaScope, effect: Effect = p.effect) => OUTLOOK[String(effect) as '1' | '0' | '-1'](scope, lordAreas(p))

/** The classical name of a yoga ("Gaja-Kesari" from "Gaja-Kesari: Jupiter angular to the Moon"). */
const yogaName = (name: string) => (YOGA_CONTENT[name]?.title ?? name).split(':')[0].replace(/ \(\d+\)$/, '')

const MAIN_TONE: Readonly<Record<'1' | '0' | '-1', string>> = { '1': 'is well supported', '0': 'is mixed', '-1': 'asks for patience' }
const LEAN: Readonly<Record<'1' | '0' | '-1', string>> = { '1': 'leans toward support', '0': 'comes out mixed', '-1': 'leans toward patience' }

/**
 * Two or three sentences on a dasha lord in this chart: its lordship and place, its condition and
 * what its own period tends to bring, then either a Vipareeta or yoga note or, when the caller
 * scores the whole running chain (`effect`, with the main period's lord `main`) and that differs
 * from the lord's own outlook, a sentence saying where the difference comes from.
 */
export function lordOutlook(p: LordPromise, scope: DashaScope, effect: Effect = p.effect, main?: LordPromise): string {
  const condition = lordCondition(p)
  const own = outlook(p, scope)
  const link = conditionLink(p)
  const out = [`${lordPlacement(p)}.`, !condition ? `${capitalize(own)}.` : link === 'so' ? `It ${condition}, so ${own}.` : link === 'although' ? `Although it ${condition}, ${own}.` : `It ${condition}; on balance, ${own}.`]
  const chain = chainClause(p, effect, main)
  const lean = LEAN[String(effect) as '1' | '0' | '-1']
  // At most three sentences: the chain clause, when needed, takes the place of the yoga note.
  if (!chain && p.vipareeta) out.push('As the lord of a hard house sitting in a hard house, it can turn obstacles to your advantage.')
  else if (!chain && p.supportiveYogas.length) out.push(`It also helps form ${yogaName(p.supportiveYogas[0])} in your chart.`)
  else if (!chain && p.challengingYogas.length) out.push(`It also takes part in ${yogaName(p.challengingYogas[0])}, so give its themes a little extra care.`)
  else if (chain?.main) out.push(`Within the ${chain.main.planet} period, which ${MAIN_TONE[String(chain.main.effect) as '1' | '0' | '-1']} in your chart, this ${scope} ${lean} overall.`)
  else if (chain) out.push(`Taken together with the rest of the running dasha, this ${scope} ${lean} overall.`)
  return out.join(' ')
}

/** One sentence: "Saturn rules your 10th and 11th, so this sub-period tends to support career and gains." */
export function lordBrief(p: LordPromise, scope: DashaScope): string {
  const lead = p.rules.length ? `${p.planet} rules your ${joinList(p.rules.map(ordinal))}` : `${p.planet} sits in your ${ordinal(p.house)}`
  return `${lead}, so ${outlook(p, scope)}.`
}

/** Title of the running sub-period's reason. */
export function dashaPromiseTitle(lord: Planet, effect: Effect): string {
  return `${lord} sub-period: ${effect > 0 ? 'well supported in your chart' : effect < 0 ? 'asks for patience in your chart' : 'mixed in your chart'}`
}

/**
 * The running chain as a whole, for the informational dasha reason: the main period's lord in
 * this chart, how the sub-lord sits from it, and the current phase.
 */
export function dashaChainText(md: LordPromise, ad: LordPromise, pd: LordPromise | undefined, fromMain: number | null): string {
  const out = [`The ${md.planet} period frames these years: ${lordPlacement(md)}.`]
  if (fromMain === null) out.push(`Its own sub-period concentrates those themes.`)
  else if ([1, 4, 5, 7, 9, 10].includes(fromMain)) out.push(`${ad.planet} sits in the ${ordinal(fromMain)} from ${md.planet}, a helpful angle for the two to work together.`)
  else if ([6, 8, 12].includes(fromMain)) out.push(`${ad.planet} sits in the ${ordinal(fromMain)} from ${md.planet}, so the two may pull in different directions at times.`)
  if (pd && pd.planet !== ad.planet) {
    const verb = pd.effect > 0 ? 'lends support to' : pd.effect < 0 ? 'asks for care with' : 'stirs up'
    out.push(`For now the ${pd.planet} phase ${verb} ${lordAreas(pd)}.`)
  }
  return out.join(' ')
}

/** A dasha level starting within the period, read for this chart. */
export function dashaChangePromiseText(chain: readonly Planet[], lord: LordPromise): string {
  return `A new dasha phase (${chain.join('–')}) begins. ${lordBrief(lord, scopeOfLevel(chain.length - 1))}`
}

/** A sentence added to a transit reason when the planet's functional role tilts its weight. */
export function functionalNote(role: FunctionalRole, yogakaraka: boolean, effect: Effect): string {
  const friendly = yogakaraka || role === 'benefic'
  if (effect > 0) return friendly ? 'As a helpful planet for your ascendant, its support counts for a little more.' : 'It is a harder planet for your ascendant, so the help may come with some effort.'
  return friendly ? 'As a helpful planet for your ascendant, it tends to soften the strain.' : 'It is also a harder planet for your ascendant, so give this one a little more care.'
}
