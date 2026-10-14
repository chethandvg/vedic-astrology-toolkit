// Telugu names of the astrological terms, in the forms Telugu panchangams and jatakams use
// (రాహుకాలం, చంద్రాష్టమం, కుజుడు...). The English name is kept as the secondary label.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SIGN_NAMES } from '@/engine/core'
import type { Names } from './en'

const TE: Names = {
  body: { Sun: 'సూర్యుడు', Moon: 'చంద్రుడు', Mars: 'కుజుడు', Mercury: 'బుధుడు', Jupiter: 'గురువు', Venus: 'శుక్రుడు', Saturn: 'శని', Rahu: 'రాహువు', Ketu: 'కేతువు', Asc: 'లగ్నం' },
  bodyShort: { Sun: 'ర', Moon: 'చం', Mars: 'కు', Mercury: 'బు', Jupiter: 'గు', Venus: 'శు', Saturn: 'శ', Rahu: 'రా', Ketu: 'కే', Asc: 'ల' },
  bodyAlt: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Ascendant' },
  sign: ['మేషం', 'వృషభం', 'మిథునం', 'కర్కాటకం', 'సింహం', 'కన్య', 'తుల', 'వృశ్చికం', 'ధనుస్సు', 'మకరం', 'కుంభం', 'మీనం'],
  signAlt: SIGN_NAMES,
  signShort: ['మేష', 'వృష', 'మిథు', 'కర్క', 'సింహ', 'కన్య', 'తుల', 'వృశ్చి', 'ధను', 'మక', 'కుంభ', 'మీన'],
  nakshatra: [
    'అశ్విని', 'భరణి', 'కృత్తిక', 'రోహిణి', 'మృగశిర', 'ఆర్ద్ర', 'పునర్వసు', 'పుష్యమి', 'ఆశ్లేష',
    'మఖ', 'పుబ్బ', 'ఉత్తర', 'హస్త', 'చిత్త', 'స్వాతి', 'విశాఖ', 'అనూరాధ', 'జ్యేష్ఠ',
    'మూల', 'పూర్వాషాఢ', 'ఉత్తరాషాఢ', 'శ్రవణం', 'ధనిష్ఠ', 'శతభిషం', 'పూర్వాభాద్ర', 'ఉత్తరాభాద్ర', 'రేవతి',
  ],
  tithi: ['పాడ్యమి', 'విదియ', 'తదియ', 'చవితి', 'పంచమి', 'షష్ఠి', 'సప్తమి', 'అష్టమి', 'నవమి', 'దశమి', 'ఏకాదశి', 'ద్వాదశి', 'త్రయోదశి', 'చతుర్దశి'],
  purnima: 'పౌర్ణమి',
  amavasya: 'అమావాస్య',
  paksha: { Sukla: 'శుక్ల', Krishna: 'కృష్ణ' },
  tara: { Janma: 'జన్మ', Sampat: 'సంపత్', Vipat: 'విపత్', Kshema: 'క్షేమ', Pratyak: 'ప్రత్యక్', Saadhana: 'సాధన', Naidhana: 'నైధన', Mitra: 'మిత్ర', 'Parama Mitra': 'పరమ మిత్ర' },
  yoga: [
    'విష్కంభం', 'ప్రీతి', 'ఆయుష్మాన్', 'సౌభాగ్యం', 'శోభనం', 'అతిగండం', 'సుకర్మ', 'ధృతి', 'శూలం',
    'గండం', 'వృద్ధి', 'ధ్రువం', 'వ్యాఘాతం', 'హర్షణం', 'వజ్రం', 'సిద్ధి', 'వ్యతీపాతం', 'వరీయాన్',
    'పరిఘం', 'శివం', 'సిద్ధం', 'సాధ్యం', 'శుభం', 'శుక్లం', 'బ్రహ్మం', 'ఐంద్రం', 'వైధృతి',
  ],
  karana: {
    Bava: 'బవ', Balava: 'బాలవ', Kaulava: 'కౌలవ', Taitula: 'తైతుల', Garija: 'గరజి', Vanija: 'వణిజ', Vishti: 'విష్టి',
    Sakuna: 'శకుని', Chatushpada: 'చతుష్పాత్', Naga: 'నాగవం', Kimstughna: 'కింస్తుఘ్నం',
  },
  vara: ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'],
  choghadiya: { Udveg: 'ఉద్వేగ', Amrit: 'అమృత', Rog: 'రోగ', Labh: 'లాభ', Shubh: 'శుభ', Char: 'చర', Kaal: 'కాల' },
  window: {
    'Rahu Kalam': 'రాహుకాలం', Yamaganda: 'యమగండం', 'Gulika Kalam': 'గుళిక కాలం', Durmuhurta: 'దుర్ముహూర్తం',
    'Abhijit Muhurta': 'అభిజిత్ ముహూర్తం', Chandrashtama: 'చంద్రాష్టమం',
  },
  varga: {
    1: 'రాశి', 2: 'హోర', 3: 'ద్రేక్కాణం', 4: 'చతుర్థాంశ', 5: 'పంచమాంశ', 6: 'షష్ఠాంశ', 7: 'సప్తమాంశ', 8: 'అష్టమాంశ', 9: 'నవాంశ', 10: 'దశమాంశ',
    11: 'రుద్రాంశ', 12: 'ద్వాదశాంశ', 16: 'షోడశాంశ', 20: 'వింశాంశ', 24: 'చతుర్వింశాంశ', 27: 'నక్షత్రాంశ', 30: 'త్రింశాంశ', 40: 'ఖవేదాంశ',
    45: 'అక్షవేదాంశ', 60: 'షష్ట్యంశ',
  },
  koota: { varna: 'వర్ణ', vashya: 'వశ్య', tara: 'తార', yoni: 'యోని', maitri: 'గ్రహమైత్రి', gana: 'గణ', bhakoot: 'భకూట', nadi: 'నాడి' },
  porutham: {
    dina: 'దిన', gana: 'గణ', mahendra: 'మాహేంద్ర', stree_deergha: 'స్త్రీ దీర్ఘ', yoni: 'యోని', rasi: 'రాశి', rasyadhipati: 'రాశ్యాధిపతి',
    vasya: 'వశ్య', rajju: 'రజ్జు', vedha: 'వేధ',
  },
  term: {
    Brahmin: 'బ్రాహ్మణ', Kshatriya: 'క్షత్రియ', Vaishya: 'వైశ్య', Shudra: 'శూద్ర',
    Chatushpada: 'చతుష్పాద', Manava: 'మానవ', Jalachara: 'జలచర', Vanachara: 'వనచర', Keeta: 'కీటక',
    Horse: 'గుర్రం', Elephant: 'ఏనుగు', Sheep: 'గొర్రె', Serpent: 'పాము', Dog: 'కుక్క', Cat: 'పిల్లి', Rat: 'ఎలుక',
    Cow: 'ఆవు', Buffalo: 'గేదె', Tiger: 'పులి', Deer: 'జింక', Monkey: 'కోతి', Mongoose: 'ముంగిస', Lion: 'సింహం',
    Deva: 'దేవ', Manushya: 'మనుష్య', Rakshasa: 'రాక్షస', Adi: 'ఆది', Madhya: 'మధ్య', Antya: 'అంత్య',
    Pada: 'పాద', Kati: 'కటి', Nabhi: 'నాభి', Kantha: 'కంఠ', Siro: 'శిరో',
  },
  dashaLevel: ['మహాదశ', 'అంతర్దశ', 'ప్రత్యంతర్దశ'],
  dashaLevelShort: ['మహా', 'అంతర', 'ప్రత్యంతర'],
  ordinal: (n) => `${n}వ`,
  list: (items) => (items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} మరియు ${items.at(-1)}`),
}

export default TE
