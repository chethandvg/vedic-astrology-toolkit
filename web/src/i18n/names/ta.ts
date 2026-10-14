// Tamil names of the astrological terms, in the forms Tamil panchangams and jathagams use
// (ராகு காலம், சந்திராஷ்டமம், வளர்பிறை, புக்தி...). The English name is kept as the secondary label.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SIGN_NAMES } from '@/engine/core'
import type { Names } from './en'

const TA: Names = {
  body: { Sun: 'சூரியன்', Moon: 'சந்திரன்', Mars: 'செவ்வாய்', Mercury: 'புதன்', Jupiter: 'குரு', Venus: 'சுக்கிரன்', Saturn: 'சனி', Rahu: 'ராகு', Ketu: 'கேது', Asc: 'லக்னம்' },
  bodyShort: { Sun: 'சூ', Moon: 'சந்', Mars: 'செ', Mercury: 'பு', Jupiter: 'கு', Venus: 'சு', Saturn: 'ச', Rahu: 'ரா', Ketu: 'கே', Asc: 'ல' },
  bodyAlt: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Ascendant' },
  sign: ['மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்', 'சிம்மம்', 'கன்னி', 'துலாம்', 'விருச்சிகம்', 'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்'],
  signAlt: SIGN_NAMES,
  signShort: ['மேஷ', 'ரிஷ', 'மிது', 'கட', 'சிம்', 'கன்', 'துலா', 'விரு', 'தனு', 'மக', 'கும்', 'மீன'],
  nakshatra: [
    'அஸ்வினி', 'பரணி', 'கார்த்திகை', 'ரோகிணி', 'மிருகசீரிடம்', 'திருவாதிரை', 'புனர்பூசம்', 'பூசம்', 'ஆயில்யம்',
    'மகம்', 'பூரம்', 'உத்திரம்', 'அஸ்தம்', 'சித்திரை', 'சுவாதி', 'விசாகம்', 'அனுஷம்', 'கேட்டை',
    'மூலம்', 'பூராடம்', 'உத்திராடம்', 'திருவோணம்', 'அவிட்டம்', 'சதயம்', 'பூரட்டாதி', 'உத்திரட்டாதி', 'ரேவதி',
  ],
  tithi: ['பிரதமை', 'துவிதியை', 'திருதியை', 'சதுர்த்தி', 'பஞ்சமி', 'சஷ்டி', 'சப்தமி', 'அஷ்டமி', 'நவமி', 'தசமி', 'ஏகாதசி', 'துவாதசி', 'திரயோதசி', 'சதுர்த்தசி'],
  purnima: 'பௌர்ணமி',
  amavasya: 'அமாவாசை',
  paksha: { Sukla: 'வளர்பிறை', Krishna: 'தேய்பிறை' },
  tara: { Janma: 'ஜென்ம', Sampat: 'சம்பத்', Vipat: 'விபத்', Kshema: 'க்ஷேம', Pratyak: 'பிரத்யக்', Saadhana: 'சாதக', Naidhana: 'நைதன', Mitra: 'மித்ர', 'Parama Mitra': 'பரம மித்ர' },
  yoga: [
    'விஷ்கம்பம்', 'ப்ரீதி', 'ஆயுஷ்மான்', 'சௌபாக்கியம்', 'சோபனம்', 'அதிகண்டம்', 'சுகர்மம்', 'திருதி', 'சூலம்',
    'கண்டம்', 'விருத்தி', 'துருவம்', 'வியாகாதம்', 'ஹர்ஷணம்', 'வஜ்ரம்', 'சித்தி', 'வியதீபாதம்', 'வரீயான்',
    'பரிகம்', 'சிவம்', 'சித்தம்', 'சாத்தியம்', 'சுபம்', 'சுப்பிரம்', 'பிராம்யம்', 'ஐந்திரம்', 'வைதிருதி',
  ],
  karana: {
    Bava: 'பவம்', Balava: 'பாலவம்', Kaulava: 'கௌலவம்', Taitula: 'தைதுலம்', Garija: 'கரசை', Vanija: 'வணிசை', Vishti: 'பத்திரை',
    Sakuna: 'சகுனி', Chatushpada: 'சதுஷ்பாதம்', Naga: 'நாகவம்', Kimstughna: 'கிம்ஸ்துக்னம்',
  },
  vara: ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'],
  choghadiya: { Udveg: 'உத்வேகம்', Amrit: 'அமிர்தம்', Rog: 'ரோகம்', Labh: 'லாபம்', Shubh: 'சுபம்', Char: 'சரம்', Kaal: 'காலம்' },
  window: {
    'Rahu Kalam': 'ராகு காலம்', Yamaganda: 'எமகண்டம்', 'Gulika Kalam': 'குளிகை காலம்', Durmuhurta: 'துர்முகூர்த்தம்',
    'Abhijit Muhurta': 'அபிஜித் முகூர்த்தம்', Chandrashtama: 'சந்திராஷ்டமம்',
  },
  varga: {
    1: 'ராசி', 2: 'ஹோரை', 3: 'திரேக்காணம்', 4: 'சதுர்த்தாம்சம்', 5: 'பஞ்சமாம்சம்', 6: 'சஷ்டாம்சம்', 7: 'சப்தமாம்சம்', 8: 'அஷ்டமாம்சம்', 9: 'நவாம்சம்',
    10: 'தசாம்சம்', 11: 'ருத்ராம்சம்', 12: 'துவாதசாம்சம்', 16: 'ஷோடசாம்சம்', 20: 'விம்சாம்சம்', 24: 'சதுர்விம்சாம்சம்', 27: 'நட்சத்திராம்சம்',
    30: 'திரிம்சாம்சம்', 40: 'கவேதாம்சம்', 45: 'அக்ஷவேதாம்சம்', 60: 'ஷஷ்டியாம்சம்',
  },
  koota: { varna: 'வர்ணம்', vashya: 'வசியம்', tara: 'தாரா', yoni: 'யோனி', maitri: 'கிரக மைத்ரி', gana: 'கணம்', bhakoot: 'பகூட்', nadi: 'நாடி' },
  porutham: {
    dina: 'தினம்', gana: 'கணம்', mahendra: 'மகேந்திரம்', stree_deergha: 'ஸ்திரீ தீர்க்கம்', yoni: 'யோனி', rasi: 'ராசி', rasyadhipati: 'ராசி அதிபதி',
    vasya: 'வசியம்', rajju: 'ரஜ்ஜு', vedha: 'வேதை',
  },
  term: {
    Brahmin: 'பிராமணர்', Kshatriya: 'க்ஷத்திரியர்', Vaishya: 'வைசியர்', Shudra: 'சூத்திரர்',
    Chatushpada: 'நாற்கால்', Manava: 'மனிதர்', Jalachara: 'நீர்வாழ்', Vanachara: 'வனவாழ்', Keeta: 'பூச்சி',
    Horse: 'குதிரை', Elephant: 'யானை', Sheep: 'ஆடு', Serpent: 'பாம்பு', Dog: 'நாய்', Cat: 'பூனை', Rat: 'எலி',
    Cow: 'பசு', Buffalo: 'எருமை', Tiger: 'புலி', Deer: 'மான்', Monkey: 'குரங்கு', Mongoose: 'கீரி', Lion: 'சிங்கம்',
    Deva: 'தேவ', Manushya: 'மனுஷ', Rakshasa: 'ராட்சச', Adi: 'ஆதி', Madhya: 'மத்தி', Antya: 'அந்தியம்',
    Pada: 'பாதம்', Kati: 'இடுப்பு', Nabhi: 'நாபி', Kantha: 'கண்டம்', Siro: 'சிரசு',
  },
  dashaLevel: ['மகா தசை', 'புக்தி', 'அந்தரம்'],
  dashaLevelShort: ['தசை', 'புக்தி', 'அந்தரம்'],
  ordinal: (n) => `${n}ஆம்`,
  list: (items) => (items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} மற்றும் ${items.at(-1)}`),
}

export default TA
