// Transit texts: what each graha's passage through each house from the natal Moon tends to bring.
// The direction of each house (good or difficult) follows the classical gochara table; every
// sentence is original, practical and gentle, and describes tendencies rather than certainties.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Planet } from '@/engine/types'
import { joinList, ordinal, type ByHouse } from './format'

export const GOCHARA_TEXT: Readonly<Record<Planet, ByHouse<string>>> = {
  Sun: [
    'Energy can run low and tempers short; pace yourself and keep plans simple.',
    'Spending and careless words need watching; read the terms before you agree to anything.',
    'Confidence and drive run high, a good stretch to take the initiative and finish what you start.',
    'Home life and inner calm may feel unsettled; give family time and rest some priority.',
    'The mind can be restless and plans may wobble; keep speculation and ego clashes out of it.',
    'Obstacles tend to yield to steady effort; health routines and clearing pending work go well.',
    'Travel and partnerships can feel tiring; patience with others pays off.',
    'Keep a low profile with people in authority and skip needless arguments; rest and eat well.',
    'Plans may stall and mentors may seem distant; be gentle with yourself and avoid big risks.',
    'Work and reputation get a lift, a fine time for important tasks and visible effort.',
    'Recognition, gains and helpful contacts come more easily; ask for what you need.',
    'Expenses and tiredness can rise; keep commitments light and protect your sleep.',
  ],
  Moon: [
    'Feelings are bright and responsive, pleasant for comfort, good food and company.',
    'Money can slip away on small things; keep an eye on spending and on what you say.',
    'Courage and follow-through come easily; good for errands, messages and short trips.',
    'Moods can feel unsettled; slow down and stay close to what feels safe and familiar.',
    'Emotions may run high and plans can wobble; avoid hasty decisions and gambles.',
    'Routines and health feel manageable, a good time to clear chores and settle small disputes.',
    'Meetings, partnerships and social plans tend to go smoothly.',
    'Traditionally a sensitive time; go slow, avoid risks and postpone big decisions.',
    'Energy may dip and things move slowly; rest and keep expectations modest.',
    'Effort at work tends to be noticed; push important tasks forward.',
    'Good news and gains are more likely; enjoy friends and follow up on what is owed to you.',
    'Expenses and tiredness can creep up; wrap up loose ends rather than start something new.',
  ],
  Mars: [
    'Impatience and heat run high; avoid rushing, sharp tools and needless confrontation.',
    'Harsh words and impulsive spending come easily; pause before you react.',
    'Energy and courage work in your favour; good for bold, practical action.',
    'Home and property matters can feel tense; keep calm and avoid quarrels at home.',
    'Restlessness can spill into rash choices; channel the energy into exercise or creative work.',
    'Drive and determination help you beat obstacles and competition; tackle the tough jobs now.',
    'Partnerships can turn prickly; choose patience over winning the argument.',
    'Take extra care with safety, money and temper; avoid risky ventures for now.',
    'Progress can feel blocked and energy uneven; stay flexible and avoid disputes with elders.',
    'Work demands rise and friction with seniors is possible; steady effort still gets results.',
    'Ambition gets a push; gains through effort, property or allies are well supported.',
    'Spending and fatigue can climb; avoid overwork and impulsive outlays.',
  ],
  Mercury: [
    'Scattered focus can cost you; double-check facts, figures and messages.',
    'Clear speech and smart dealing support your earnings, good for negotiation.',
    'Rivals or crossed wires may unsettle you; keep records and stay diplomatic.',
    'Study, paperwork and family matters move well, and money may come in.',
    'Words can be misread at home; be patient and clear with loved ones.',
    'Analysis, problem solving and service work go well, a good time to fix things.',
    'Agreements need extra care; read the fine print and confirm the details.',
    'Research and practical learning go well; useful information or quiet gains can surface.',
    'Plans and studies may hit small snags; allow extra time.',
    'Work, communication and trade tend to flow; good for presentations and deals.',
    'Networking, trade and learning bring gains; reach out to people.',
    'Careless words can backfire; keep confidences and steer clear of gossip.',
  ],
  Jupiter: [
    'Growth can come with restlessness or extra expenses; trust steady, sincere effort.',
    'Finances, family harmony and the weight of your words are supported; good for saving and learning.',
    'Progress may feel slower and support thinner; stay patient and keep building quietly.',
    'Home matters and peace of mind need attention; avoid overcommitting.',
    'Creativity, children, study and good counsel are blessed, a fine time to plan and learn.',
    'Work pressure and minor health matters may ask for attention; keep routines steady.',
    'Partnerships, marriage matters and good company are favoured; good for agreements.',
    'Things can feel heavy and slow; avoid big financial risks and look after your energy.',
    'Fortune, faith and guidance are on your side; good for higher learning and long-range plans.',
    'Work may bring changes or closer scrutiny; stay humble and keep your standards high.',
    'Gains, recognition and fulfilled hopes are well supported; reach for your goals.',
    'Expenses, travel or giving rise; a reflective time suited to charity and inner work.',
  ],
  Venus: [
    'Comfort, charm and pleasures come easily; enjoy beauty and good company.',
    'Money, good food and family pleasures are favoured, nice for buying things you need.',
    'Social ease and small wins add up; good for creative and friendly ventures.',
    'Home comforts, friends and vehicles are favoured, a pleasant time for the household.',
    'Romance, creativity and children bring joy; enjoy the arts and recreation.',
    'Relationships and indulgences need moderation; avoid overspending on pleasures.',
    'A partner may need extra care and patience; keep expectations gentle.',
    'Unexpected comforts or support can arrive, a good time to settle shared finances.',
    'Grace, faith and generosity flow; good for celebrations and travel.',
    'Disagreements at work can flare; keep things courteous and light.',
    'Gains, friendships and wishes are supported; enjoy social life and its rewards.',
    'Comforts and pleasures increase even as spending rises; enjoy without overdoing it.',
  ],
  Saturn: [
    'Mind and body may feel weighed down; keep routines simple, rest well and take one step at a time.',
    'Money and family matters ask for patience and careful budgeting.',
    'Steady effort brings stability, helpers and income, a strong time for long-term work.',
    'Home and emotional life may feel burdened; tend to family ties and simple comforts.',
    'Thinking can feel foggy and plans slow; avoid speculation and give big decisions time.',
    'Persistence wins; work, health routines and disputes tend to settle in your favour.',
    'Partnerships and travel need extra care and patience.',
    'A testing stretch that rewards caution; avoid risks and look after your health and savings.',
    'Luck and progress can feel delayed; keep to your duties and avoid shortcuts.',
    'Work brings heavier responsibility; act with integrity and pace yourself.',
    'Long-term efforts pay off with gains, recognition and support.',
    'Expenses and fatigue can mount; avoid unproductive ventures and look after your belongings.',
  ],
  Rahu: [
    'Restless or confused feelings may surface; stay grounded and avoid shortcuts.',
    'Speech and finances can get muddled; avoid risky deals and careless words.',
    'Bold moves, media and networking can bring unusual success.',
    'Home life may feel unsettled; keep things simple and avoid big property moves.',
    'Avoid speculation and hasty choices; let ideas mature before acting on them.',
    'You can outmanoeuvre obstacles and rivals, a good time to tackle debts and health habits.',
    'Partnerships may feel unclear; be careful with contracts and new alliances.',
    'Unexpected turns are possible; avoid risks and keep a cushion of time and money.',
    'Beliefs and plans may be shaken; seek wise counsel before big moves.',
    'Ambition grows and work can take unusual turns; stay ethical and focused.',
    'Gains through networks, technology or foreign links are favoured.',
    'Expenses, travel or restless sleep can rise; keep spending in check.',
  ],
  Ketu: [
    'You may feel detached or distracted; keep routines simple and mind your well-being.',
    'Words and money need care; avoid harsh speech and loose spending.',
    'Focus and courage help you cut through obstacles; good for decisive action.',
    'Home may feel distant or unsettled; spend some quiet time with family.',
    'Plans and children\'s matters need patience; avoid gambling with ideas or money.',
    'Obstacles and rivals fade, a good time for healing routines and service.',
    'A partner may seem distant; communicate openly to avoid misunderstandings.',
    'A time for caution and inner work; avoid risky ventures.',
    'Faith and guidance may feel uncertain; reflect before following new advice.',
    'Work can bring sudden shifts; stay steady and avoid hasty career moves.',
    'Gains and wishes are supported, sometimes in unexpected ways.',
    'A reflective, spiritual tone, good for retreat and letting go, less so for big spending.',
  ],
}

/** Vedha: a favourable transit held back by planets in the obstructing house. */
export const vedhaNote = (planet: Planet, by: readonly Planet[], house: number): string =>
  `Its usual support is held back by ${joinList(by)} in your ${ordinal(house)} (vedha), so expect a neutral effect from ${planet} for now.`

/** Vipareeta vedha: an unfavourable transit eased by planets in the relieving house. */
export const vipareetaNote = (by: readonly Planet[], house: number): string =>
  `${joinList(by)} in your ${ordinal(house)} eases this (vipareeta vedha), so the difficulty is largely neutralised.`

/** Ashtakavarga bindus of the transiting planet in its sign, as a strength note. */
export function binduNote(bindus: number, favourable: boolean): string {
  if (bindus === 0) return favourable ? 'With no ashtakavarga points here, the support is much thinner than usual.' : 'With no ashtakavarga points here, take extra care.'
  if (bindus >= 5) return favourable ? `With ${bindus} of 8 ashtakavarga points here, the support is stronger than usual.` : `With ${bindus} of 8 ashtakavarga points here, the effect is milder than usual.`
  if (bindus <= 3) return favourable ? `With only ${bindus} of 8 ashtakavarga points here, the support is thinner than usual.` : `With only ${bindus} of 8 ashtakavarga points here, take a little extra care.`
  return `With ${bindus} of 8 ashtakavarga points here, the effect is about average.`
}

/** Stations of the five tara grahas. */
export const STATION_TEXT = {
  retrograde: (planet: Planet, theme: string): string =>
    `${planet} turns retrograde: a time to review and revisit matters of ${theme} rather than rush them.`,
  direct: (planet: Planet, theme: string): string =>
    `${planet} turns direct: delayed matters of ${theme} begin to move forward again.`,
}
