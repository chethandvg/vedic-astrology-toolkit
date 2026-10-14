// Hindi names of the astrological terms, in the forms Hindi panchangs and kundlis use
// (राहुकाल, चंद्राष्टम, मंगल...). The English name is kept as the secondary label.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SIGN_NAMES } from '@/engine/core'
import type { Names } from './en'

const HI: Names = {
  body: { Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु', Asc: 'लग्न' },
  bodyShort: { Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के', Asc: 'ल' },
  bodyAlt: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Ascendant' },
  sign: ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'],
  signAlt: SIGN_NAMES,
  signShort: ['मेष', 'वृष', 'मिथु', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'],
  nakshatra: [
    'अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा',
    'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा',
    'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती',
  ],
  tithi: ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'],
  purnima: 'पूर्णिमा',
  amavasya: 'अमावस्या',
  paksha: { Sukla: 'शुक्ल', Krishna: 'कृष्ण' },
  tara: { Janma: 'जन्म', Sampat: 'संपत', Vipat: 'विपत', Kshema: 'क्षेम', Pratyak: 'प्रत्यक', Saadhana: 'साधना', Naidhana: 'नैधन', Mitra: 'मित्र', 'Parama Mitra': 'परम मित्र' },
  yoga: [
    'विष्कुंभ', 'प्रीति', 'आयुष्मान', 'सौभाग्य', 'शोभन', 'अतिगंड', 'सुकर्मा', 'धृति', 'शूल',
    'गंड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र', 'सिद्धि', 'व्यतीपात', 'वरीयान',
    'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल', 'ब्रह्म', 'इंद्र', 'वैधृति',
  ],
  karana: {
    Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitula: 'तैतिल', Garija: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि',
    Sakuna: 'शकुनि', Chatushpada: 'चतुष्पद', Naga: 'नाग', Kimstughna: 'किंस्तुघ्न',
  },
  vara: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  choghadiya: { Udveg: 'उद्वेग', Amrit: 'अमृत', Rog: 'रोग', Labh: 'लाभ', Shubh: 'शुभ', Char: 'चर', Kaal: 'काल' },
  window: {
    'Rahu Kalam': 'राहुकाल', Yamaganda: 'यमगंड', 'Gulika Kalam': 'गुलिक काल', Durmuhurta: 'दुर्मुहूर्त',
    'Abhijit Muhurta': 'अभिजीत मुहूर्त', Chandrashtama: 'चंद्राष्टम',
  },
  varga: {
    1: 'राशि', 2: 'होरा', 3: 'द्रेष्काण', 4: 'चतुर्थांश', 5: 'पंचमांश', 6: 'षष्ठांश', 7: 'सप्तमांश', 8: 'अष्टमांश', 9: 'नवांश', 10: 'दशमांश',
    11: 'रुद्रांश', 12: 'द्वादशांश', 16: 'षोडशांश', 20: 'विंशांश', 24: 'चतुर्विंशांश', 27: 'नक्षत्रांश', 30: 'त्रिंशांश', 40: 'खवेदांश',
    45: 'अक्षवेदांश', 60: 'षष्ट्यंश',
  },
  koota: { varna: 'वर्ण', vashya: 'वश्य', tara: 'तारा', yoni: 'योनि', maitri: 'ग्रह मैत्री', gana: 'गण', bhakoot: 'भकूट', nadi: 'नाड़ी' },
  porutham: {
    dina: 'दिन', gana: 'गण', mahendra: 'माहेंद्र', stree_deergha: 'स्त्री दीर्घ', yoni: 'योनि', rasi: 'राशि', rasyadhipati: 'राशि अधिपति',
    vasya: 'वश्य', rajju: 'रज्जु', vedha: 'वेध',
  },
  term: {
    Brahmin: 'ब्राह्मण', Kshatriya: 'क्षत्रिय', Vaishya: 'वैश्य', Shudra: 'शूद्र',
    Chatushpada: 'चतुष्पद', Manava: 'मानव', Jalachara: 'जलचर', Vanachara: 'वनचर', Keeta: 'कीट',
    Horse: 'अश्व', Elephant: 'गज', Sheep: 'मेष', Serpent: 'सर्प', Dog: 'श्वान', Cat: 'मार्जार', Rat: 'मूषक',
    Cow: 'गौ', Buffalo: 'महिष', Tiger: 'व्याघ्र', Deer: 'मृग', Monkey: 'वानर', Mongoose: 'नकुल', Lion: 'सिंह',
    Deva: 'देव', Manushya: 'मनुष्य', Rakshasa: 'राक्षस', Adi: 'आदि', Madhya: 'मध्य', Antya: 'अंत्य',
    Pada: 'पाद', Kati: 'कटि', Nabhi: 'नाभि', Kantha: 'कंठ', Siro: 'शिर',
  },
  dashaLevel: ['महादशा', 'अंतर्दशा', 'प्रत्यंतर दशा'],
  dashaLevelShort: ['महा', 'अंतर', 'प्रत्यंतर'],
  // 1ला, 2रा, 3रा, 4था, 6ठा, otherwise 5वाँ (the usual written Hindi ordinals).
  ordinal: (n) => `${n}${({ 1: 'ला', 2: 'रा', 3: 'रा', 4: 'था', 6: 'ठा' } as Record<number, string>)[n] ?? 'वाँ'}`,
  list: (items) => (items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} और ${items.at(-1)}`),
}

export default HI
