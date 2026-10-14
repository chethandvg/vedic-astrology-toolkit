// Plain-language content for the 170 chapter-11 yoga rules checked by engine/yogas.ts.
// All wording is original. Names keep the classical Sanskrit label where there is one, followed by
// a short description; numbered rules get a descriptive title. Meanings speak of traditional
// tendencies, never certainties, and the challenging ones stay calm and practical.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { YogaCategory } from '@/engine/yogas'

export type YogaNature = 'supportive' | 'challenging' | 'mixed'

export interface YogaContent {
  /** Friendly display name, e.g. "Gaja-Kesari: Jupiter angular to the Moon". */
  title: string
  /** One plain sentence on what the combination is and what it traditionally points to. */
  meaning: string
  nature: YogaNature
  /** What strengthens or weakens it, in one or two short sentences. */
  hint: string
}

export const YOGA_CATEGORY_TEXT: Readonly<Record<YogaCategory, { title: string; text: string }>> = {
  luminary: { title: 'Sun and Moon combinations', text: 'Planets on either side of the Sun or the Moon, which colour how you act and how you feel.' },
  popular: { title: 'Named classical yogas', text: 'Well-known combinations from the classical texts, each checked condition by condition.' },
  lunar: { title: 'Moon combinations', text: 'Patterns around the Moon, the classical indicator of the mind and emotional support.' },
  mahapurusha: { title: 'Great-person yogas', text: 'Five combinations in which Mars, Mercury, Jupiter, Venus or Saturn is strong in an angle.' },
  nabhasa: { title: 'Chart patterns (Nabhasa)', text: 'Shapes formed by where the seven planets fall; they colour the whole life rather than one period.' },
  sankhya: { title: 'Sign-count patterns', text: 'How many signs the seven planets occupy, read only when no other Nabhasa pattern forms.' },
  raaja: { title: 'Raja yogas', text: 'Links between the lords of angles and trines, classically associated with rising status.' },
  dhana: { title: 'Wealth combinations', text: 'Ascendant-specific combinations for building resources.' },
  advanced_raaja: { title: 'Further raja yogas', text: 'Numbered combinations for status and influence from the book’s advanced section.' },
  raaja_sambandha: { title: 'Ties to authority', text: 'Combinations that connect you with people and positions of influence.' },
  daridra: { title: 'Wealth-weakening combinations', text: 'Patterns that ask for extra care with money. They describe tendencies, not fixed outcomes.' },
}

type Entry = [title: string, nature: YogaNature, meaning: string, hint: string]

// Shared hints.
const H_DASHA = 'Shows most in the dashas of the planets involved. Dignified, unafflicted planets strengthen it; combustion or debilitation weakens it.'
const H_LORDS = 'Stronger when the lords involved are dignified and free of malefic influence; weaker when they are combust, debilitated or in hard houses.'
const H_SHAPE = 'A whole-chart pattern that shows gradually through life. Dignified planets bring out its best side; afflicted ones dull it.'
const H_COUNT = 'Read only when no other Nabhasa pattern forms. The dignity of the planets decides how well it works.'
const H_FLANK = 'Benefics make it gentler and more helpful; malefics give drive with a sharper edge.'
const H_GREAT = 'Stronger when the planet is unafflicted and also strong in the navamsa; harsh aspects or combustion reduce it.'
const H_WEAK = 'Benefic aspects, a strong Jupiter or strong 2nd and 11th houses soften it. Practical budgeting matters more than the combination.'
const H_TIES = 'Works best when the karakas and lords involved are strong and unafflicted, and shows mostly in their dashas.'

const NAMED: Record<string, Entry> = {
  Vesi: ['Vesi: a planet after the Sun', 'supportive', 'A planet other than the Moon sits in the sign right after the Sun, traditionally read as steady effort and an even, truthful outlook.', H_FLANK],
  Vosi: ['Vosi: a planet before the Sun', 'supportive', 'A planet other than the Moon sits in the sign just before the Sun, classically linked with skill, learning and a generous nature.', H_FLANK],
  Ubhayachara: ['Ubhayachara: planets on both sides of the Sun', 'supportive', 'Planets flank the Sun on both sides, a traditional picture of a capable, well-supported person who can carry responsibility.', 'Benefics on both sides strengthen it; malefics on both sides make the support come with pressure.'],
  Sunaphaa: ['Sunaphaa: a planet after the Moon', 'supportive', 'A planet other than the Sun sits in the sign after the Moon, linked with self-earned resources and a thoughtful mind.', 'Strongest when that planet is a dignified benefic; a malefic gives ambition that needs patience.'],
  Anaphaa: ['Anaphaa: a planet before the Moon', 'supportive', 'A planet other than the Sun sits in the sign before the Moon, traditionally tied to a pleasing manner, good habits and contentment.', 'Strongest when that planet is a dignified benefic; a malefic adds intensity to the temperament.'],
  Duradhara: ['Duradhara: planets on both sides of the Moon', 'supportive', 'Planets flank the Moon on both sides, classically a sign of comfort, generosity and a well-supported emotional life.', 'Benefics on both sides make it warmest; malefics on both sides bring support mixed with strain.'],
  'Budha-Aaditya': ['Budha-Aaditya: the Sun with Mercury', 'supportive', 'The Sun and Mercury share a sign, a popular combination for intelligence, clear speech and practical skill.', 'Better when Mercury is not too close to the Sun and the sign is friendly; malefic aspects weaken it.'],
  Kemadruma: ['Kemadruma: the Moon without neighbours', 'challenging', 'The Moon has no planets beside it and no planet holds an angle, a traditional hint that emotional support may need to be built deliberately.', 'A bright, strong Moon or planets in angles soften it a lot. Close friendships and steady routines help.'],
  'Chandra-Mangala': ['Chandra-Mangala: the Moon with Mars', 'mixed', 'The Moon and Mars share a sign, traditionally linked with drive, initiative and earning through bold effort, sometimes with a quick temper.', 'Benefic aspects and a waxing Moon make it constructive; a debilitated Moon or Mars makes the temper harder to steer.'],
  Adhi: ['Adhi: benefics in the 6th, 7th and 8th from the Moon', 'supportive', 'Benefics occupy the 6th, 7th and 8th signs from the Moon, a classical sign of leadership, comfort and steady progress.', 'Fullest when the benefics are strong and unafflicted; with only one or two dignified it works more modestly.'],
  Ruchaka: ['Ruchaka: strong Mars in an angle', 'supportive', 'Mars sits in an angle in its own or exaltation sign, one of the five great-person yogas, linked with courage, energy and leadership.', H_GREAT],
  Bhadra: ['Bhadra: strong Mercury in an angle', 'supportive', 'Mercury sits in an angle in its own or exaltation sign, a great-person yoga linked with intellect, eloquence and skill in trade or study.', H_GREAT],
  Sasa: ['Sasa: strong Saturn in an angle', 'supportive', 'Saturn sits in an angle in its own or exaltation sign, a great-person yoga linked with discipline, endurance and authority earned by work.', H_GREAT],
  Maalavya: ['Maalavya: strong Venus in an angle', 'supportive', 'Venus sits in an angle in its own or exaltation sign, a great-person yoga linked with grace, artistic taste and comfortable living.', H_GREAT],
  Hamsa: ['Hamsa: strong Jupiter in an angle', 'supportive', 'Jupiter sits in an angle in its own or exaltation sign, a great-person yoga linked with wisdom, good conduct and the respect of others.', H_GREAT],

  Rajju: ['Rajju: the rope pattern', 'mixed', 'All seven planets occupy movable signs, traditionally read as a love of travel and change, with some restlessness to manage.', H_SHAPE],
  Musala: ['Musala: the pestle pattern', 'supportive', 'All seven planets occupy fixed signs, classically linked with determination, steadiness and a strong sense of self.', H_SHAPE],
  Nala: ['Nala: the reed pattern', 'mixed', 'All seven planets occupy dual signs, traditionally linked with versatility and adaptability, sometimes with scattered focus.', H_SHAPE],
  Maalaa: ['Maalaa: the garland pattern', 'supportive', 'Benefics occupy at least three of the four angles, a garland-like pattern linked with comfort, pleasures and a pleasant life.', 'Fuller when no malefic also sits in an angle; weaker if the benefics are combust or debilitated.'],
  Sarpa: ['Sarpa: the serpent pattern', 'challenging', 'Malefics occupy at least three of the four angles, a classical pattern of tougher circumstances that reward resilience and patience.', 'Softer when benefics also hold angles; this app counts Rahu and Ketu as in Rao\'s book, while many classical texts count only the Sun, Mars and Saturn.'],
  Gadaa: ['Gadaa: the mace pattern', 'mixed', 'All planets fill two neighbouring angles, traditionally linked with effort, enterprise and wealth built through steady work.', H_SHAPE],
  Sakata: ['Sakata: the cart pattern', 'mixed', 'All planets sit in the 1st and 7th houses, a cart-wheel pattern of ups and downs that steady effort smooths out.', H_SHAPE],
  Vihanga: ['Vihanga: the bird pattern', 'mixed', 'All planets sit in the 4th and 10th houses, a bird-like pattern linked with travel, messages and work that keeps you moving.', H_SHAPE],
  Sringaataka: ['Sringaataka: the triangle pattern', 'supportive', 'All planets occupy the 1st, 5th and 9th houses, a classical sign of good fortune and contentment that grows with time.', H_SHAPE],
  Hala: ['Hala: the plough pattern', 'mixed', 'All planets occupy one set of trines other than the lagna’s, a plough-like pattern linked with hard, productive, hands-on work.', H_SHAPE],
  Vajra: ['Vajra: the thunderbolt pattern', 'mixed', 'Benefics hold the 1st and 7th houses while malefics hold the 4th and 10th, traditionally a good start and finish to life with a busier middle.', H_SHAPE],
  Yava: ['Yava: the barley-grain pattern', 'mixed', 'Malefics hold the 1st and 7th houses while benefics hold the 4th and 10th, traditionally a demanding start that gives way to a rewarding middle of life.', H_SHAPE],
  Kamala: ['Kamala: the lotus pattern', 'supportive', 'All planets occupy the four angles, a lotus-like pattern linked with distinction, dignity and a widely known name.', H_SHAPE],
  Vaapi: ['Vaapi: the well pattern', 'supportive', 'All planets fill the succedent or the cadent houses, a well-like pattern linked with saving, accumulating and quiet comfort.', H_SHAPE],
  Yoopa: ['Yoopa: the sacrificial-post pattern', 'supportive', 'All planets fill four houses in a row from the 1st, traditionally linked with principles, generosity and a sense of duty.', H_SHAPE],
  Sara: ['Sara: the arrow pattern', 'mixed', 'All planets fill four houses in a row from the 4th, linked with a sharp, focused nature and skill in pursuits that need good aim.', H_SHAPE],
  Sakti: ['Sakti: the spear pattern', 'mixed', 'All planets fill four houses in a row from the 7th, traditionally an uphill start that builds persistence and later success.', H_SHAPE],
  Danda: ['Danda: the staff pattern', 'challenging', 'All planets fill four houses in a row from the 10th, a pattern that asks for extra care in close relationships and teamwork.', H_SHAPE],
  Naukaa: ['Naukaa: the boat pattern', 'mixed', 'All planets fill seven houses in a row from the 1st, a boat-like pattern of reputation and gains that rise and fall with the tide.', H_SHAPE],
  Koota: ['Koota: the summit pattern', 'challenging', 'All planets fill seven houses in a row from the 4th, traditionally linked with a guarded, independent nature that does best with open, honest dealings.', H_SHAPE],
  Chatra: ['Chatra: the umbrella pattern', 'supportive', 'All planets fill seven houses in a row from the 7th, an umbrella pattern linked with kindness, protecting others and a happy later life.', H_SHAPE],
  Chaapa: ['Chaapa: the bow pattern', 'mixed', 'All planets fill seven houses in a row from the 10th, a bow pattern linked with boldness, resourcefulness and a taste for adventure.', H_SHAPE],
  'Ardha Chandra': ['Ardha Chandra: the half-moon pattern', 'supportive', 'All planets fill seven houses in a row starting from a house that is not an angle, a half-moon pattern linked with charm, leadership and a good name.', H_SHAPE],
  Chakra: ['Chakra: the wheel pattern', 'supportive', 'Planets occupy the six odd houses counted from the lagna, a wheel pattern classically linked with high status and influence.', H_SHAPE],
  Samudra: ['Samudra: the ocean pattern', 'supportive', 'Planets occupy the six even houses counted from the lagna, an ocean pattern linked with plenty, enjoyment and a generous nature.', H_SHAPE],
  Gola: ['Gola: planets in one sign', 'challenging', 'All seven planets crowd into a single sign, a rare pattern traditionally linked with intense focus and a search for balance.', H_COUNT],
  Yuga: ['Yuga: planets in two signs', 'challenging', 'The seven planets occupy only two signs, traditionally linked with unconventional views and money that needs careful handling.', H_COUNT],
  Soola: ['Soola: planets in three signs', 'challenging', 'The seven planets occupy three signs, linked with a sharp, determined temperament that does best when channelled constructively.', H_COUNT],
  Kedaara: ['Kedaara: planets in four signs', 'supportive', 'The seven planets occupy four signs, a field-like pattern linked with being useful to others, productive work and steady gains.', H_COUNT],
  Paasa: ['Paasa: planets in five signs', 'mixed', 'The seven planets occupy five signs, traditionally linked with skill and many commitments that need careful juggling.', H_COUNT],
  Daama: ['Daama: planets in six signs', 'supportive', 'The seven planets occupy six signs, linked with generosity, helpfulness and a well-respected position.', H_COUNT],
  Veenaa: ['Veenaa: planets in seven signs', 'supportive', 'Each of the seven planets has a sign of its own, a lute-like pattern linked with a love of music, art and many interests.', H_COUNT],

  Subha: ['Subha: benefics around the lagna', 'supportive', 'A benefic sits in the lagna, or benefics flank it from the 2nd and 12th, traditionally a protective, auspicious frame for the self.', 'Stronger when the benefics are dignified and unafflicted; a malefic in the lagna as well makes it mixed.'],
  Asubha: ['Asubha: malefics around the lagna', 'challenging', 'A malefic sits in the lagna, or malefics flank it from the 2nd and 12th, a traditional sign that health and finances deserve extra care.', 'A benefic in or aspecting the lagna, or a strong lagna lord, eases it considerably.'],
  'Gaja-Kesari': ['Gaja-Kesari: Jupiter angular to the Moon', 'supportive', 'Jupiter stands in an angle from the Moon with another benefic’s touch, a famous combination for good judgement, respect and a lasting reputation.', 'Needs Jupiter free of debilitation, combustion and an unfriendly sign. A strong Moon and Jupiter make it shine.'],
  'Guru-Mangala': ['Guru-Mangala: Jupiter with or opposite Mars', 'supportive', 'Mars sits with or opposite Jupiter, joining energy with wisdom for principled action and practical achievement.', 'Better when both planets are dignified; afflictions to Mars can make the energy impatient.'],
  Amala: ['Amala: only benefics in the 10th', 'supportive', 'Only benefics occupy the 10th house from the lagna or the Moon, traditionally a mark of clean conduct and a lasting good name.', 'Stronger when the benefic in the 10th is dignified; a malefic aspect on the 10th dilutes it.'],
  Parvata: ['Parvata: benefics hold the angles', 'supportive', 'Benefics occupy angles while malefics stay out of the angles and the 7th and 8th, classically a sign of prosperity and a generous nature.', H_LORDS],
  Kaahala: ['Kaahala: a strong 4th lord', 'supportive', 'The 4th lord is linked with Jupiter while the lagna lord is strong, or it joins the 10th lord in dignity, traditionally a sign of courage and leadership.', H_LORDS],
  Chaamara: ['Chaamara: exalted lagna lord or paired benefics', 'supportive', 'An exalted, angular lagna lord aspected by Jupiter, or two benefics together in the 7th, 9th or 10th, is linked with honours and eloquence.', H_LORDS],
  Sankha: ['Sankha: a strong lagna lord with helpful lords', 'supportive', 'A strong lagna lord with well-placed 5th and 6th lords, or allied 1st and 10th lords, is traditionally linked with kindness, comfort and good values.', H_LORDS],
  Bheri: ['Bheri: a strong 9th lord with well-filled houses', 'supportive', 'A strong 9th lord with planets in the 1st, 2nd, 7th and 12th, or Jupiter and Venus angular to the lagna lord, is linked with comfort and prosperity.', H_LORDS],
  Mridanga: ['Mridanga: a strong lagna lord and dignified planets', 'supportive', 'A strong lagna lord plus a planet in its own or exaltation sign in an angle or trine is traditionally linked with happiness and recognition.', H_LORDS],
  Sreenaatha: ['Sreenaatha: exalted 7th lord in the 10th', 'supportive', 'An exalted 7th lord in the 10th house, with the 9th and 10th lords together, is a classical sign of prosperity and good standing.', H_LORDS],
  Matsya: ['Matsya: the fish combination', 'supportive', 'Benefics in the 1st and 9th, a planet in the 5th and malefics in the 4th and 8th are linked with intuition, kindness and a good reputation.', H_LORDS],
  Koorma: ['Koorma: the tortoise combination', 'supportive', 'Dignified benefics in the 5th, 6th and 7th with dignified malefics in the 1st, 3rd and 11th are linked with steadiness, renown and contentment.', H_LORDS],
  Khadga: ['Khadga: the 2nd and 9th lords exchange', 'supportive', 'The 2nd and 9th lords swap signs while the lagna lord is in an angle or trine, traditionally linked with wealth through good fortune and skill.', H_LORDS],
  Kusuma: ['Kusuma: the flower combination', 'supportive', 'A fixed lagna with Venus angular, the Moon in a trine with a benefic and Saturn in the 10th is linked with status and a generous nature.', H_LORDS],
  Kalaanidhi: ['Kalaanidhi: Jupiter with Mercury and Venus', 'supportive', 'Jupiter in the 2nd or 5th, joined or aspected by both Mercury and Venus, is traditionally linked with talent in the arts and respect.', H_LORDS],
  Kalpadruma: ['Kalpadruma: the wish-fulfilling tree', 'supportive', 'The lagna lord, its dispositor and the next links in that chain all sit in angles, trines or exaltation, a classical sign of prosperity.', H_LORDS],
  Lagnaadhi: ['Lagnaadhi: benefics in the 7th and 8th', 'supportive', 'Benefics occupy the 7th and 8th houses free from malefic influence, traditionally linked with learning, a kind nature and comfort.', 'Stronger with dignified benefics; any malefic joining or aspecting them cancels the protection.'],
  Hari: ['Hari: benefics around the 2nd lord', 'supportive', 'Benefics occupy the 2nd, 12th and 8th from the 2nd lord, a classical combination for wealth and comfort.', H_LORDS],
  Hara: ['Hara: benefics around the 7th lord', 'supportive', 'Benefics occupy the 4th, 9th and 8th from the 7th lord, traditionally linked with comfort, learning and steady happiness.', H_LORDS],
  Brahma: ['Brahma: benefics around the lagna lord', 'supportive', 'Benefics occupy the 4th, 10th and 11th from the lagna lord, linked with learning, lasting comfort and a respected position.', H_LORDS],
  Brahma_alternative: ['Brahma (alternative): benefics angular to key lords', 'supportive', 'Jupiter, Venus and Mercury stand in angles from the 9th, 11th and 1st or 10th lords, an alternative reading of the Brahma combination.', H_LORDS],
  Vishnu: ['Vishnu: 9th and 10th lords in the 2nd', 'supportive', 'The 9th and 10th lords and the 9th lord’s navamsa dispositor all occupy the 2nd house, traditionally linked with wealth and fortune.', H_LORDS],
  Siva: ['Siva: 5th, 9th and 10th lords in a cycle', 'supportive', 'The 5th lord sits in the 9th, the 9th lord in the 10th and the 10th lord in the 5th, linked with wisdom and success in one’s field.', H_LORDS],
  Trilochana: ['Trilochana: Sun, Moon and Mars in trines', 'supportive', 'The Sun, Moon and Mars occupy three different signs in trine to one another, traditionally linked with sharp intelligence and energy.', 'Stronger when none of the three is debilitated; a strong, bright Moon helps most.'],
  Gouri: ['Gouri: an exalted dispositor in the 10th', 'supportive', 'The 10th lord’s navamsa dispositor is exalted in the 10th and joined by the lagna lord, linked with a respected family and good conduct.', H_LORDS],
  Chandikaa: ['Chandikaa: a fixed lagna with Sun links', 'supportive', 'A fixed lagna aspected by the 6th lord, with the Sun joining the navamsa dispositors of the 6th and 9th lords, is linked with influence and resolve.', H_LORDS],
  Lakshmi: ['Lakshmi: a strong 9th lord in an angle', 'supportive', 'A dignified 9th lord in an angle together with a strong lagna lord is a classical combination of prosperity and grace.', H_LORDS],
  Saarada: ['Saarada: the learning combination', 'supportive', 'The 10th lord in the 5th, an angular Mercury, a strong Sun in Leo, Mercury or Jupiter trine the Moon and Mars in the 11th signal learning and recognition.', H_LORDS],
  Bhaarathi: ['Bhaarathi: an exalted dispositor with the 9th lord', 'supportive', 'An exalted navamsa dispositor of the 2nd, 5th or 11th lord joins the 9th lord, traditionally linked with learning and eloquence.', H_LORDS],
  Saraswathi: ['Saraswathi: Jupiter, Venus and Mercury well placed', 'supportive', 'Mercury, Jupiter and Venus all sit in angles, trines or the 2nd with Jupiter dignified, a famous combination for learning, speech and creativity.', 'Stronger when none of the three is combust or debilitated; a strong Jupiter matters most.'],
  Amsaavatara: ['Amsaavatara: angular Jupiter, Venus and Saturn', 'supportive', 'Jupiter, Venus and an exalted Saturn all occupy angles, traditionally linked with a distinguished, principled life.', H_LORDS],
  Devendra: ['Devendra: a double exchange with a fixed lagna', 'supportive', 'A fixed lagna with the 2nd and 10th lords exchanging and the 1st and 11th lords exchanging is linked with leadership and comfort.', H_LORDS],
  Indra: ['Indra: the 5th and 11th lords exchange', 'supportive', 'The 5th and 11th lords swap signs while the Moon sits in the 5th, traditionally linked with courage, renown and enterprise.', H_LORDS],
  Ravi: ['Ravi: the Sun in the 10th', 'supportive', 'The Sun in the 10th, with the 10th lord and Saturn together in the 3rd, is traditionally linked with respect, learning and public service.', H_LORDS],
  Bhaaskara: ['Bhaaskara: Moon, Mercury and Jupiter around the Sun', 'supportive', 'Mercury in the 2nd from the Sun, the Moon in the 12th from the Sun and Jupiter trine the Moon are linked with intelligence and capability.', H_LORDS],
  Kulavardhana: ['Kulavardhana: all planets 5th from a reference', 'supportive', 'Every planet sits in the 5th from the lagna, the Moon or the Sun, a classical sign of a growing, supportive family.', H_LORDS],
  Vasumati: ['Vasumati: benefics in the growth houses', 'supportive', 'All benefics occupy the growth houses (3rd, 6th, 10th and 11th), traditionally linked with wealth that builds over time.', 'Stronger when the benefics are strong and no malefic shares those houses.'],
  Gandharva: ['Gandharva: the musician’s combination', 'supportive', 'The 10th lord in the 3rd, 7th or 11th, Jupiter touching the lagna lord, a strong exalted Sun and the Moon in the 9th are linked with music and art.', H_LORDS],
  Go: ['Go: Jupiter in its moolatrikona sign', 'supportive', 'A strong Jupiter in its moolatrikona sign joined by the 2nd lord, with an exalted lagna lord, is linked with wealth and good standing.', H_LORDS],
  Vidyut: ['Vidyut: a deeply exalted 11th lord with Venus', 'supportive', 'A deeply exalted 11th lord joins Venus in an angle from the lagna lord, traditionally linked with prosperity and leadership.', H_LORDS],
  Chapa: ['Chapa: the 4th and 10th lords exchange', 'supportive', 'The 4th and 10th lords swap signs while the lagna lord is exalted, linked with authority and comfortable living.', H_LORDS],
  Pushkala: ['Pushkala: the lagna lord with the Moon', 'supportive', 'The lagna lord joins the Moon, the Moon’s dispositor is well placed and aspects the lagna, and a planet occupies the lagna, linked with wealth and respect.', H_LORDS],
  Makuta: ['Makuta: the crown combination', 'supportive', 'Jupiter in the 9th from the 9th lord, a benefic in the 9th from Jupiter and Saturn in the 10th are traditionally linked with leadership.', H_LORDS],
  Jaya: ['Jaya: an exalted 10th lord and a weak 6th lord', 'supportive', 'A deeply exalted 10th lord with a debilitated 6th lord is linked with success over rivals and steady achievement.', H_LORDS],
  Harsha: ['Harsha: the 6th lord in the 6th', 'supportive', 'The 6th lord sits in its own house, a turnaround combination linked with resilience, healthy habits and success over rivals.', 'Stronger when no benefic lord is damaged by joining it; works best in the 6th lord’s dasha.'],
  Sarala: ['Sarala: the 8th lord in the 8th', 'supportive', 'The 8th lord sits in its own house, linked with resourcefulness, persistence and courage in uncertain times.', 'Stronger when no benefic lord is damaged by joining it; works best in the 8th lord’s dasha.'],
  Vimala: ['Vimala: the 12th lord in the 12th', 'supportive', 'The 12th lord sits in its own house, linked with prudence with money, independence and a generous, principled nature.', 'Stronger when no benefic lord is damaged by joining it; works best in the 12th lord’s dasha.'],

  Basic_Raaja: ['Raja yoga: angle and trine lords linked', 'supportive', 'A lord of an angle and a lord of a trine are together, in mutual aspect or in exchange, the classic raja yoga for rising status and opportunity.', H_DASHA],
  Dharma_Karmadhipati: ['Dharma-Karmadhipati: 9th and 10th lords linked', 'supportive', 'The 9th and 10th lords are together, in mutual aspect or in exchange, traditionally the finest link between purpose and career.', H_DASHA],
  Vipareeta_Raaja_base: ['Vipareeta raja yoga: a hard-house lord in a hard house', 'mixed', 'A lord of the 6th, 8th or 12th sits in one of those houses, traditionally turning difficulties around and bringing gains after setbacks.', 'Purer when these lords stay away from the other house lords; benefic lords joining them dilute it.'],
  Vipareeta_Raaja_ideal: ['Vipareeta raja yoga: hard-house lords together', 'mixed', 'The 6th, 8th and 12th lords share one sign with no other planet, in a suitable house, the fullest form of this turnaround combination.', 'Shows mainly in the dashas of these lords, often after a challenging phase has passed.'],
}

/** Numbered raja yogas of section 11.7.3 (PDF 127-128). */
const ADVANCED: Entry[] = [
  ['self and intellect significators joined', 'supportive', 'The atmakaraka joins the putrakaraka while the 1st and 5th lords also sit together, traditionally a sign of recognition through your own ideas.', H_DASHA],
  ['1st and 5th lords exchange', 'supportive', 'The 1st and 5th lords swap signs with the atmakaraka and putrakaraka in the 1st and 5th, all of them dignified, a strong mark of influence.', H_DASHA],
  ['9th lord and atmakaraka well placed', 'supportive', 'The 9th lord and the atmakaraka both sit in the 1st, 5th or 7th with benefic aspects, linking good fortune with personal purpose.', H_DASHA],
  ['benefics around lagna lord and atmakaraka', 'supportive', 'Benefics occupy the 2nd, 4th and 5th from both the lagna lord and the atmakaraka, a classical sign of support, comfort and status.', H_DASHA],
  ['malefics in growth houses from the self', 'supportive', 'Malefics occupy or aspect the 3rd and 6th from both the lagna lord and the atmakaraka, where they lend drive and the ability to outpace rivals.', H_DASHA],
  ['one planet links the three lagnas', 'supportive', 'One planet joins or aspects the lagna, the hora lagna and the ghati lagna, traditionally a sign of influence and wealth working together.', H_DASHA],
  ['one planet sees the lagna in six charts', 'supportive', 'One planet aspects the lagna in the D1, D2, D3, D9, D12 and D30 charts, a demanding classical test of lasting influence.', H_DASHA],
  ['dignified planets in the three lagnas', 'supportive', 'Planets in their own or exaltation signs occupy the lagna, the hora lagna and the ghati lagna, a classical sign of high standing.', H_DASHA],
  ['dignified planets rising in D1, D9 and D3', 'supportive', 'Planets in their own or exaltation signs rise in the lagna of the rasi, navamsa and drekkana charts, linked with strong personal distinction.', H_DASHA],
  ['weak planets in hard houses, strong lagna lord', 'supportive', 'One or two debilitated planets sit in the 3rd, 6th or 8th while a dignified lagna lord aspects the lagna, turning weakness into strength.', H_DASHA],
  ['hard-house lords weakened, lagna lord strong', 'supportive', 'The 6th, 8th and 12th lords are all weakened while a dignified lagna lord aspects the lagna, traditionally a sign of rising above obstacles.', H_DASHA],
  ['5th and 9th lords linked', 'supportive', 'The 5th and 9th lords are together or aspect each other, joining the two strongest trines for wisdom, merit and good fortune.', H_DASHA],
  ['4th–10th exchange blessed by a trine lord', 'supportive', 'The 4th and 10th lords swap signs and both receive the aspect of the 5th or 9th lord, linking home and career with good fortune.', H_DASHA],
  ['5th lord angular with the 1st or 9th lord', 'supportive', 'The 5th lord sits in the 1st, 4th or 10th joined by the lagna or 9th lord, traditionally a sign of authority earned through intelligence.', H_DASHA],
  ['strong vargottama Moon with many aspects', 'supportive', 'A strong Moon in the same sign in the rasi and navamsa, aspected by four or more planets, is a classical sign of popularity and public standing.', H_DASHA],
  ['four or more planets exalted or in moolatrikona', 'supportive', 'Four or more planets occupy their exaltation or moolatrikona signs, a classical mark of an unusually capable chart.', H_DASHA],
  ['benefics in angles, malefics in 3, 6, 11', 'supportive', 'All benefics occupy angles while all malefics sit in the 3rd, 6th or 11th, the ideal arrangement of helpers and fighters.', H_DASHA],
  ['arudha lagna and A7 in harmony', 'supportive', 'The arudha lagna and the 7th-house arudha avoid 2-12 and 6-8 positions from each other, so image and partnerships tend to support each other.', 'Planets in or aspecting the two arudhas decide how visible the support becomes.'],
]

/** Raja sambandha combinations of section 11.8 (PDF 129). */
const SAMBANDHA: Entry[] = [
  ['career significator touches the 10th lord', 'supportive', 'The amatyakaraka, or the lord of its sign, joins or aspects the 10th lord, traditionally linking your skills with positions of trust.', H_TIES],
  ['clean 10th and 11th houses', 'supportive', 'The 11th lord aspects its own house and no malefic occupies or aspects the 10th or 11th, a clear path for career gains.', H_TIES],
  ['soul and career significators together', 'supportive', 'The atmakaraka and amatyakaraka share a sign, aligning personal purpose with the work you are known for.', H_TIES],
  ['strong, dignified career significator', 'supportive', 'The amatyakaraka is in its own or exaltation sign and strong, traditionally a sign of capable advisers and steady career support.', H_TIES],
  ['career significator in a trine', 'supportive', 'The amatyakaraka occupies the 1st, 5th or 9th house, linking your work with good fortune and right timing.', H_TIES],
  ['career and soul significators aligned', 'supportive', 'The amatyakaraka sits in an angle or trine from the atmakaraka, so career efforts tend to line up with what matters to you.', H_TIES],
  ['malefics in 3 and 6 from three anchors', 'supportive', 'Malefics occupy the 3rd and 6th from the lagna, the arudha lagna and the atmakaraka, lending courage and competitive strength.', H_TIES],
  ['dignified atmakaraka with the 9th lord', 'supportive', 'A dignified atmakaraka in an angle or trine joins or aspects the 9th lord, traditionally connecting purpose with guidance from mentors.', H_TIES],
  ['Moon’s dispositor rises as atmakaraka', 'supportive', 'The atmakaraka is the lord of the Moon’s sign and sits in the lagna with a benefic, a classical sign of public goodwill.', H_TIES],
  ['atmakaraka with a benefic in a key house', 'supportive', 'The atmakaraka sits in the 5th, 7th, 9th or 10th with a benefic, traditionally bringing support from people of influence.', H_TIES],
  ['9th-house arudha or atmakaraka link', 'supportive', 'The 9th-house arudha falls in the lagna or the atmakaraka sits in the 9th, linking you with mentors, teachers or patrons.', H_TIES],
  ['11th lord at home, atmakaraka supported', 'supportive', 'The 11th lord sits unafflicted in the 11th and the atmakaraka joins a benefic, a classical sign of gains through networks.', H_TIES],
  ['1st and 10th lords exchange', 'supportive', 'The 1st and 10th lords swap signs, tying personal identity closely to career and public role.', H_TIES],
  ['Moon and Venus 4th from the atmakaraka', 'supportive', 'The Moon and Venus occupy the 4th from the atmakaraka, traditionally linked with comfort, vehicles and an affectionate home.', H_TIES],
  ['5th lord joined in a good house', 'supportive', 'The lagna lord or the atmakaraka joins the 5th lord in an angle or trine, connecting intelligence with authority.', H_TIES],
]

/** Daridra combinations of section 11.10 (PDF 131-132): calm, practical wording only. */
const DARIDRA: Entry[] = [
  ['', 'challenging', 'The 1st and 12th lords swap signs under the influence of maraka planets, a classical sign that spending needs firm limits.', H_WEAK],
  ['', 'challenging', 'The 1st and 6th lords swap signs under maraka influence, traditionally a pointer to debts or disputes that are best kept small.', H_WEAK],
  ['', 'challenging', 'Ketu joins the lagna or the Moon while the lagna lord sits in the 8th under maraka influence, a sign that finances benefit from caution.', H_WEAK],
  ['', 'challenging', 'The lagna lord sits in the 6th, 8th or 12th with a malefic while the 2nd lord is weak, traditionally a call for careful money management.', H_WEAK],
  ['', 'challenging', 'The 5th lord in the 6th and the 9th lord in the 12th, both aspected by maraka planets, suggest that gains come through steady effort rather than luck.', H_WEAK],
  ['', 'challenging', 'A malefic in the lagna without the 9th or 10th lord there, and touched by maraka planets, traditionally asks for patience in building resources.', H_WEAK],
  ['', 'challenging', 'The dispositors of the 6th, 8th and 12th lords sit in those hard houses under malefic influence, a sign to avoid risky financial commitments.', H_WEAK],
  ['', 'challenging', 'The Moon’s navamsa dispositor sits in the 2nd or 7th or with a maraka planet, traditionally linked with an uneven flow of money.', H_WEAK],
  ['', 'challenging', 'Both the lagna lord and the navamsa lagna lord are influenced by maraka planets, a classical hint to keep savings for lean times.', H_WEAK],
  ['', 'challenging', 'Benefics sit in signs owned by malefics while malefics sit in signs owned by benefics, a pattern where effort and reward can feel out of step.', H_WEAK],
  ['', 'challenging', 'A planet joins a lord of the 6th, 8th or 12th without help from the 1st, 5th or 9th lords, traditionally reducing what that planet can give.', H_WEAK],
  ['', 'challenging', 'Mars and Saturn occupy the 2nd house without an aspect from Mercury, a classical sign that earnings and speech benefit from restraint.', H_WEAK],
  ['', 'challenging', 'The Sun sits in the 2nd house aspected by Saturn, traditionally a sign that money matters run best with patience and planning.', H_WEAK],
]

/** Twelve ascendant wealth combinations (PDF 130-131), same table as engine/yogas.ts. */
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const SIGN_CODES = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi']
const DHANA_FIFTH: [string, string[]][] = [
  ['the Sun', ['Saturn', 'the Moon', 'Jupiter']], ['Mercury', ['the Moon', 'Mars', 'Jupiter']], ['Venus', ['Mars']], ['Mars', ['Venus']],
  ['Jupiter', ['Mercury']], ['Saturn', ['the Sun', 'the Moon']], ['Saturn', ['the Sun', 'the Moon']], ['Jupiter', ['Mercury']],
  ['Mars', ['Venus']], ['Venus', ['Mars']], ['Mercury', ['the Moon', 'Mars', 'Jupiter']], ['the Moon', ['Saturn']],
]
const LORD_NAMES = ['Mars', 'Venus', 'Mercury', 'the Moon', 'the Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']
const DHANA_HELPERS: Record<string, string[]> = {
  'the Sun': ['Mars', 'Jupiter'], 'the Moon': ['Mercury', 'Jupiter'], Mars: ['Mercury', 'Venus', 'Saturn'], Mercury: ['Jupiter', 'Saturn'],
  Jupiter: ['Mars', 'Mercury'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mars', 'Jupiter'],
}
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const H_DHANA = 'Stronger when the planets involved are dignified and free of combustion; malefic affliction or a weak navamsa reduces it.'

function build(): Record<string, YogaContent> {
  const out: Record<string, YogaContent> = {}
  const put = (name: string, [title, nature, meaning, hint]: Entry) => {
    out[name] = { title, nature, meaning, hint }
  }
  for (const [name, e] of Object.entries(NAMED)) put(name, e)
  SIGNS.forEach((sign, i) => {
    const [fifth, eleventh] = DHANA_FIFTH[i]
    const lord = LORD_NAMES[i]
    const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
    put(`Dhana_${SIGN_CODES[i]}_5_11`, [`Wealth combination: ${sign} rising, 5th and 11th`, 'supportive',
      `For ${sign} rising, ${fifth} in the 5th house with ${list(eleventh)} in the 11th is a classical wealth combination linking good judgement with gains.`, H_DHANA])
    put(`Dhana_${SIGN_CODES[i]}_asc`, [`Wealth combination: ${sign} rising, lagna lord`, 'supportive',
      `For ${sign} rising, ${lord} in the lagna, joined or aspected by ${list(DHANA_HELPERS[lord])}, is a classical wealth combination built on personal effort.`,
      `${cap(lord)} gives more when dignified and unafflicted; the helpers must each join or aspect it.`])
  })
  const two = (n: number) => String(n).padStart(2, '0')
  ADVANCED.forEach(([d, ...rest], i) => put(`advanced_raaja_${two(i + 1)}`, [`Raja yoga: ${d} (${i + 1})`, ...rest]))
  SAMBANDHA.forEach(([d, ...rest], i) => put(`raaja_sambandha_${two(i + 1)}`, [`Ties to authority: ${d} (${i + 1})`, ...rest]))
  DARIDRA.forEach(([, ...rest], i) => put(`daridra_${two(i + 1)}`, [`Wealth-weakening combination (${i + 1})`, ...rest]))
  return out
}

/** Content for every rule id returned by evaluateYogas(), keyed by the toolkit rule name. */
export const YOGA_CONTENT: Readonly<Record<string, YogaContent>> = build()

export function yogaContent(name: string): YogaContent | undefined {
  return Object.hasOwn(YOGA_CONTENT, name) ? YOGA_CONTENT[name] : undefined
}
