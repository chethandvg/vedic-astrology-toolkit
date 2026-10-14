// Citations shown with every forecast reason (Reason.source). "Rao" is P. V. R. Narasimha Rao,
// Vedic Astrology: An Integrated Approach (PDF page numbers); Phaladeepika is Mantreswara's,
// in V. Subrahmanya Sastri's translation.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

export const SOURCES = {
  gochara: 'Gochara from the natal Moon: Phaladeepika ch. 26; Rao ch. 25.2 (PDF 282-287)',
  vedha: 'Gochara vedha and vipareeta vedha: Phaladeepika ch. 26; Rao ch. 26.3 (PDF 314)',
  ashtakavarga: 'Ashtakavarga bindus in transit: Rao ch. 25.5 (PDF 298-301); BPHS on ashtakavarga results',
  tara: 'Tara bala: Rao Table 64 (PDF 315); Muhurta Chintamani',
  chandraBala: 'Chandra bala: the Moon\'s gochara from the natal Moon (Phaladeepika ch. 26)',
  chandrashtama: 'Chandrashtama: the Moon in the 8th sign from the natal Moon (Phaladeepika ch. 26)',
  moonChange: 'Sunrise-based Vedic day; the Moon\'s sign and star are taken where they rule most of the daytime',
  dasha: 'Vimsottari dasha: BPHS; Rao ch. 16 (PDF 189-202)',
  dashaPromise: 'Dasha lord read from the birth chart: BPHS ch. 53 v. 49 (lords in angles, trines and the 11th); Rao Table 30 (PDF 152-153), Vipareeta raja yoga (PDF 124); Shadbala (Raman)',
  functional: 'Functional nature for your ascendant: Rao Table 30 (PDF 152-153); Laghu Parashari',
  dashaTransit: 'Dasha lord in transit from the natal Moon: Rao ch. 25 (PDF 282-308)',
  tithi: 'Rikta tithis and Amavasya: Muhurta Chintamani ch. 1; Drik Panchang muhurta rules',
  vishti: 'Vishti (Bhadra) karana: Muhurta Chintamani ch. 1; Drik Panchang Bhadra notes',
  sadeSati: 'Saturn from the natal Moon (Sade Sati, Ashtama, Ardhashtama): Phaladeepika ch. 26; mainstream panchangs',
  muntha: 'Muntha in the annual chart: Tajika Neelakanthi; Rao ch. 27-28 (PDF 331-337)',
  stations: 'Planetary stations: Swiss Ephemeris (Moshier), sidereal',
  summary: 'Summary of the daily forecasts in this period',
} as const
