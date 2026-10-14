// Kannada names of the astrological terms, in the forms Kannada panchangas and horoscopes use
// (ರಾಹುಕಾಲ, ಚಂದ್ರಾಷ್ಟಮ, ಕುಜ...). The English name is kept as the secondary label.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SIGN_NAMES } from '@/engine/core'
import type { Names } from './en'

const KN: Names = {
  body: { Sun: 'ಸೂರ್ಯ', Moon: 'ಚಂದ್ರ', Mars: 'ಕುಜ', Mercury: 'ಬುಧ', Jupiter: 'ಗುರು', Venus: 'ಶುಕ್ರ', Saturn: 'ಶನಿ', Rahu: 'ರಾಹು', Ketu: 'ಕೇತು', Asc: 'ಲಗ್ನ' },
  bodyShort: { Sun: 'ರ', Moon: 'ಚಂ', Mars: 'ಕು', Mercury: 'ಬು', Jupiter: 'ಗು', Venus: 'ಶು', Saturn: 'ಶ', Rahu: 'ರಾ', Ketu: 'ಕೇ', Asc: 'ಲ' },
  bodyAlt: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Ascendant' },
  sign: ['ಮೇಷ', 'ವೃಷಭ', 'ಮಿಥುನ', 'ಕರ್ಕಾಟಕ', 'ಸಿಂಹ', 'ಕನ್ಯಾ', 'ತುಲಾ', 'ವೃಶ್ಚಿಕ', 'ಧನು', 'ಮಕರ', 'ಕುಂಭ', 'ಮೀನ'],
  signAlt: SIGN_NAMES,
  signShort: ['ಮೇಷ', 'ವೃಷ', 'ಮಿಥು', 'ಕರ್ಕ', 'ಸಿಂಹ', 'ಕನ್ಯಾ', 'ತುಲಾ', 'ವೃಶ್ಚಿ', 'ಧನು', 'ಮಕ', 'ಕುಂಭ', 'ಮೀನ'],
  nakshatra: [
    'ಅಶ್ವಿನಿ', 'ಭರಣಿ', 'ಕೃತ್ತಿಕಾ', 'ರೋಹಿಣಿ', 'ಮೃಗಶಿರಾ', 'ಆರ್ದ್ರಾ', 'ಪುನರ್ವಸು', 'ಪುಷ್ಯ', 'ಆಶ್ಲೇಷಾ',
    'ಮಘಾ', 'ಪೂರ್ವ ಫಲ್ಗುಣಿ', 'ಉತ್ತರ ಫಲ್ಗುಣಿ', 'ಹಸ್ತ', 'ಚಿತ್ರಾ', 'ಸ್ವಾತಿ', 'ವಿಶಾಖಾ', 'ಅನುರಾಧಾ', 'ಜ್ಯೇಷ್ಠಾ',
    'ಮೂಲಾ', 'ಪೂರ್ವಾಷಾಢಾ', 'ಉತ್ತರಾಷಾಢಾ', 'ಶ್ರವಣ', 'ಧನಿಷ್ಠಾ', 'ಶತಭಿಷಾ', 'ಪೂರ್ವಾಭಾದ್ರಪದ', 'ಉತ್ತರಾಭಾದ್ರಪದ', 'ರೇವತಿ',
  ],
  tithi: ['ಪ್ರತಿಪದೆ', 'ದ್ವಿತೀಯಾ', 'ತೃತೀಯಾ', 'ಚತುರ್ಥಿ', 'ಪಂಚಮಿ', 'ಷಷ್ಠಿ', 'ಸಪ್ತಮಿ', 'ಅಷ್ಟಮಿ', 'ನವಮಿ', 'ದಶಮಿ', 'ಏಕಾದಶಿ', 'ದ್ವಾದಶಿ', 'ತ್ರಯೋದಶಿ', 'ಚತುರ್ದಶಿ'],
  purnima: 'ಹುಣ್ಣಿಮೆ',
  amavasya: 'ಅಮಾವಾಸ್ಯೆ',
  paksha: { Sukla: 'ಶುಕ್ಲ', Krishna: 'ಕೃಷ್ಣ' },
  tara: { Janma: 'ಜನ್ಮ', Sampat: 'ಸಂಪತ್', Vipat: 'ವಿಪತ್', Kshema: 'ಕ್ಷೇಮ', Pratyak: 'ಪ್ರತ್ಯಕ್', Saadhana: 'ಸಾಧನ', Naidhana: 'ನೈಧನ', Mitra: 'ಮಿತ್ರ', 'Parama Mitra': 'ಪರಮ ಮಿತ್ರ' },
  yoga: [
    'ವಿಷ್ಕಂಭ', 'ಪ್ರೀತಿ', 'ಆಯುಷ್ಮಾನ್', 'ಸೌಭಾಗ್ಯ', 'ಶೋಭನ', 'ಅತಿಗಂಡ', 'ಸುಕರ್ಮ', 'ಧೃತಿ', 'ಶೂಲ',
    'ಗಂಡ', 'ವೃದ್ಧಿ', 'ಧ್ರುವ', 'ವ್ಯಾಘಾತ', 'ಹರ್ಷಣ', 'ವಜ್ರ', 'ಸಿದ್ಧಿ', 'ವ್ಯತೀಪಾತ', 'ವರೀಯಾನ್',
    'ಪರಿಘ', 'ಶಿವ', 'ಸಿದ್ಧ', 'ಸಾಧ್ಯ', 'ಶುಭ', 'ಶುಕ್ಲ', 'ಬ್ರಹ್ಮ', 'ಐಂದ್ರ', 'ವೈಧೃತಿ',
  ],
  karana: {
    Bava: 'ಬವ', Balava: 'ಬಾಲವ', Kaulava: 'ಕೌಲವ', Taitula: 'ತೈತಿಲ', Garija: 'ಗರಜ', Vanija: 'ವಣಿಜ', Vishti: 'ವಿಷ್ಟಿ',
    Sakuna: 'ಶಕುನಿ', Chatushpada: 'ಚತುಷ್ಪಾದ', Naga: 'ನಾಗ', Kimstughna: 'ಕಿಂಸ್ತುಘ್ನ',
  },
  vara: ['ರವಿವಾರ', 'ಸೋಮವಾರ', 'ಮಂಗಳವಾರ', 'ಬುಧವಾರ', 'ಗುರುವಾರ', 'ಶುಕ್ರವಾರ', 'ಶನಿವಾರ'],
  choghadiya: { Udveg: 'ಉದ್ವೇಗ', Amrit: 'ಅಮೃತ', Rog: 'ರೋಗ', Labh: 'ಲಾಭ', Shubh: 'ಶುಭ', Char: 'ಚರ', Kaal: 'ಕಾಲ' },
  window: {
    'Rahu Kalam': 'ರಾಹುಕಾಲ', Yamaganda: 'ಯಮಗಂಡ', 'Gulika Kalam': 'ಗುಳಿಕ ಕಾಲ', Durmuhurta: 'ದುರ್ಮುಹೂರ್ತ',
    'Abhijit Muhurta': 'ಅಭಿಜಿತ್ ಮುಹೂರ್ತ', Chandrashtama: 'ಚಂದ್ರಾಷ್ಟಮ',
  },
  varga: {
    1: 'ರಾಶಿ', 2: 'ಹೋರಾ', 3: 'ದ್ರೇಕ್ಕಾಣ', 4: 'ಚತುರ್ಥಾಂಶ', 5: 'ಪಂಚಮಾಂಶ', 6: 'ಷಷ್ಠಾಂಶ', 7: 'ಸಪ್ತಮಾಂಶ', 8: 'ಅಷ್ಟಮಾಂಶ', 9: 'ನವಾಂಶ', 10: 'ದಶಮಾಂಶ',
    11: 'ರುದ್ರಾಂಶ', 12: 'ದ್ವಾದಶಾಂಶ', 16: 'ಷೋಡಶಾಂಶ', 20: 'ವಿಂಶಾಂಶ', 24: 'ಚತುರ್ವಿಂಶಾಂಶ', 27: 'ನಕ್ಷತ್ರಾಂಶ', 30: 'ತ್ರಿಂಶಾಂಶ', 40: 'ಖವೇದಾಂಶ',
    45: 'ಅಕ್ಷವೇದಾಂಶ', 60: 'ಷಷ್ಟ್ಯಂಶ',
  },
  koota: { varna: 'ವರ್ಣ', vashya: 'ವಶ್ಯ', tara: 'ತಾರಾ', yoni: 'ಯೋನಿ', maitri: 'ಗ್ರಹಮೈತ್ರಿ', gana: 'ಗಣ', bhakoot: 'ಭಕೂಟ', nadi: 'ನಾಡಿ' },
  porutham: {
    dina: 'ದಿನ', gana: 'ಗಣ', mahendra: 'ಮಾಹೇಂದ್ರ', stree_deergha: 'ಸ್ತ್ರೀದೀರ್ಘ', yoni: 'ಯೋನಿ', rasi: 'ರಾಶಿ', rasyadhipati: 'ರಾಶ್ಯಧಿಪತಿ',
    vasya: 'ವಶ್ಯ', rajju: 'ರಜ್ಜು', vedha: 'ವೇಧ',
  },
  term: {
    Brahmin: 'ಬ್ರಾಹ್ಮಣ', Kshatriya: 'ಕ್ಷತ್ರಿಯ', Vaishya: 'ವೈಶ್ಯ', Shudra: 'ಶೂದ್ರ',
    Chatushpada: 'ಚತುಷ್ಪಾದ', Manava: 'ಮಾನವ', Jalachara: 'ಜಲಚರ', Vanachara: 'ವನಚರ', Keeta: 'ಕೀಟ',
    Horse: 'ಕುದುರೆ', Elephant: 'ಆನೆ', Sheep: 'ಕುರಿ', Serpent: 'ಹಾವು', Dog: 'ನಾಯಿ', Cat: 'ಬೆಕ್ಕು', Rat: 'ಇಲಿ',
    Cow: 'ಹಸು', Buffalo: 'ಎಮ್ಮೆ', Tiger: 'ಹುಲಿ', Deer: 'ಜಿಂಕೆ', Monkey: 'ಕೋತಿ', Mongoose: 'ಮುಂಗುಸಿ', Lion: 'ಸಿಂಹ',
    Deva: 'ದೇವ', Manushya: 'ಮನುಷ್ಯ', Rakshasa: 'ರಾಕ್ಷಸ', Adi: 'ಆದಿ', Madhya: 'ಮಧ್ಯ', Antya: 'ಅಂತ್ಯ',
    Pada: 'ಪಾದ', Kati: 'ಕಟಿ', Nabhi: 'ನಾಭಿ', Kantha: 'ಕಂಠ', Siro: 'ಶಿರ',
  },
  dashaLevel: ['ಮಹಾದಶೆ', 'ಅಂತರ್ದಶೆ', 'ಪ್ರತ್ಯಂತರ ದಶೆ'],
  dashaLevelShort: ['ಮಹಾ', 'ಅಂತರ', 'ಪ್ರತ್ಯಂತರ'],
  ordinal: (n) => `${n}ನೇ`,
  list: (items) => (items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} ಮತ್ತು ${items.at(-1)}`),
}

export default KN
