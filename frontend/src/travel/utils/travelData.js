/**
 * Static data for Travel Features
 * Emergency numbers and Phrasebooks
 */

// Emergency numbers by country
export const EMERGENCY_NUMBERS = {
    'default': { police: '112', ambulance: '112', fire: '112' }, // EU/Global GSM
    'United States': { police: '911', ambulance: '911', fire: '911' },
    'USA': { police: '911', ambulance: '911', fire: '911' },
    'United Kingdom': { police: '999', ambulance: '999', fire: '999' },
    'UK': { police: '999', ambulance: '999', fire: '999' },
    'Australia': { police: '000', ambulance: '000', fire: '000' },
    'New Zealand': { police: '111', ambulance: '111', fire: '111' },
    'Canada': { police: '911', ambulance: '911', fire: '911' },
    'Japan': { police: '110', ambulance: '119', fire: '119' },
    'Thailand': { police: '191', ambulance: '1669', fire: '199' },
    'China': { police: '110', ambulance: '120', fire: '119' },
    'India': { police: '100', ambulance: '102', fire: '101', general: '112' },
    'Brazil': { police: '190', ambulance: '192', fire: '193' },
    'Mexico': { police: '911', ambulance: '911', fire: '911' },
    'Argentina': { police: '911', ambulance: '107', fire: '100' },
    'France': { police: '17', ambulance: '15', fire: '18', general: '112' },
    'Germany': { police: '110', ambulance: '112', fire: '112' },
    'Spain': { police: '091', ambulance: '061', fire: '080', general: '112' },
    'Portugal': { police: '112', ambulance: '112', fire: '112' },
    'Italy': { police: '113', ambulance: '118', fire: '115', general: '112' },
    'Greece': { police: '100', ambulance: '166', fire: '199', general: '112' },
    'Netherlands': { police: '112', ambulance: '112', fire: '112' },
    'Switzerland': { police: '117', ambulance: '144', fire: '118', general: '112' },
    'Turkey': { police: '155', ambulance: '112', fire: '110' },
    'Egypt': { police: '122', ambulance: '123', fire: '180' },
    'UAE': { police: '999', ambulance: '998', fire: '997' },
    'Dubai': { police: '999', ambulance: '998', fire: '997' }
}

// Basic phrases for major languages
export const PHRASEBOOKS = {
    'default': { // English
        language: 'English',
        hello: 'Hello',
        thank_you: 'Thank you',
        yes: 'Yes',
        no: 'No',
        help: 'Help!',
        bathroom: 'Restroom',
        water: 'Water',
        how_much: 'How much?',
        bill: 'The bill, please'
    },
    'fr': { // French
        language: 'French',
        hello: 'Bonjour',
        thank_you: 'Merci',
        yes: 'Oui',
        no: 'Non',
        help: 'Aidez-moi!',
        bathroom: 'Toilettes',
        water: 'Eau',
        how_much: 'C\'est combien?',
        bill: 'L\'addition, s\'il vous plaît'
    },
    'es': { // Spanish
        language: 'Spanish',
        hello: 'Hola',
        thank_you: 'Gracias',
        yes: 'Sí',
        no: 'No',
        help: '¡Ayuda!',
        bathroom: 'Baño',
        water: 'Agua',
        how_much: '¿Cuánto cuesta?',
        bill: 'La cuenta, por favor'
    },
    'de': { // German
        language: 'German',
        hello: 'Hallo',
        thank_you: 'Danke',
        yes: 'Ja',
        no: 'Nein',
        help: 'Hilfe!',
        bathroom: 'Toilette',
        water: 'Wasser',
        how_much: 'Wie viel?',
        bill: 'Die Rechnung, bitte'
    },
    'it': { // Italian
        language: 'Italian',
        hello: 'Ciao',
        thank_you: 'Grazie',
        yes: 'Sì',
        no: 'No',
        help: 'Aiuto!',
        bathroom: 'Bagno',
        water: 'Acqua',
        how_much: 'Quanto costa?',
        bill: 'Il conto, per favore'
    },
    'pt': { // Portuguese
        language: 'Portuguese',
        hello: 'Olá',
        thank_you: 'Obrigado',
        yes: 'Sim',
        no: 'Não',
        help: 'Socorro!',
        bathroom: 'Banheiro',
        water: 'Água',
        how_much: 'Quanto custa?',
        bill: 'A conta, por favor'
    },
    'nl': { // Dutch
        language: 'Dutch',
        hello: 'Hallo',
        thank_you: 'Dank je',
        yes: 'Ja',
        no: 'Nee',
        help: 'Help!',
        bathroom: 'Toilet',
        water: 'Water',
        how_much: 'Hoeveel kost het?',
        bill: 'De rekening, alstublieft'
    },
    'el': { // Greek
        language: 'Greek',
        hello: 'Geia sas',
        thank_you: 'Efcharistó',
        yes: 'Ne',
        no: 'Ochi',
        help: 'Voítheia!',
        bathroom: 'Toualéta',
        water: 'Neró',
        how_much: 'Póso káni?',
        bill: 'To logariasmó, parakaló'
    },
    'tr': { // Turkish
        language: 'Turkish',
        hello: 'Merhaba',
        thank_you: 'Teşekkürler',
        yes: 'Evet',
        no: 'Hayır',
        help: 'İmdat!',
        bathroom: 'Tuvalet',
        water: 'Su',
        how_much: 'Ne kadar?',
        bill: 'Hesap lütfen'
    },
    'ja': { // Japanese
        language: 'Japanese',
        hello: 'Konnichiwa',
        thank_you: 'Arigato',
        yes: 'Hai',
        no: 'Iie',
        help: 'Tasukete!',
        bathroom: 'Toire',
        water: 'Mizu',
        how_much: 'Ikura desu ka?',
        bill: 'Okaikei onegaishimasu'
    },
    'zh': { // Chinese
        language: 'Chinese',
        hello: 'Nǐ hǎo',
        thank_you: 'Xièxiè',
        yes: 'Shì',
        no: 'Bù',
        help: 'Jiùmìng!',
        bathroom: 'Cèsuǒ',
        water: 'Shuǐ',
        how_much: 'Duōshǎo qián?',
        bill: 'Mǎidān'
    },
    'hi': { // Hindi
        language: 'Hindi',
        hello: 'Namaste',
        thank_you: 'Dhanyavaad',
        yes: 'Haan',
        no: 'Nahi',
        help: 'Bachao!',
        bathroom: 'Shauchalay',
        water: 'Paani',
        how_much: 'Kitne ka hai?',
        bill: 'Bill dijiye'
    },
    'ar': { // Arabic (Transliterated)
        language: 'Arabic',
        hello: 'Marhaba',
        thank_you: 'Shukran',
        yes: 'Naam',
        no: 'La',
        help: 'Musaada!',
        bathroom: 'Hammam',
        water: 'Mai',
        how_much: 'Bi kam?',
        bill: 'Al hisab'
    }
}

/**
 * Helper to detect country code/language from destination string
 * @param {string} destination - e.g. "Paris, France"
 * @returns {Object} { countryName, emergencyData, phrasebook }
 */
export const getDestinationInfo = (destination) => {
    if (!destination) return { countryName: 'Unknown', emergency: EMERGENCY_NUMBERS['default'], phrasebook: PHRASEBOOKS['default'] }

    const destLower = destination.toLowerCase()

    // Detect Country for Emergency
    let countryKey = 'default'
    const emergencyKeys = Object.keys(EMERGENCY_NUMBERS)
    for (const key of emergencyKeys) {
        if (destLower.includes(key.toLowerCase())) {
            countryKey = key
            break
        }
    }

    // Detect Language
    let langKey = 'default'
    if (destLower.includes('france') || destLower.includes('paris') || destLower.includes('nice') || destLower.includes('lyon')) langKey = 'fr'
    else if (destLower.includes('spain') || destLower.includes('madrid') || destLower.includes('barcelona') || destLower.includes('mexico') || destLower.includes('argentina') || destLower.includes('colombia')) langKey = 'es'
    else if (destLower.includes('germany') || destLower.includes('berlin') || destLower.includes('munich') || destLower.includes('austria') || destLower.includes('vienna')) langKey = 'de'
    else if (destLower.includes('italy') || destLower.includes('rome') || destLower.includes('milan') || destLower.includes('venice')) langKey = 'it'
    else if (destLower.includes('portugal') || destLower.includes('lisbon') || destLower.includes('brazil') || destLower.includes('rio')) langKey = 'pt'
    else if (destLower.includes('netherlands') || destLower.includes('amsterdam')) langKey = 'nl'
    else if (destLower.includes('greece') || destLower.includes('athens') || destLower.includes('crete') || destLower.includes('santorini')) langKey = 'el'
    else if (destLower.includes('turkey') || destLower.includes('istanbul')) langKey = 'tr'
    else if (destLower.includes('japan') || destLower.includes('tokyo') || destLower.includes('osaka')) langKey = 'ja'
    else if (destLower.includes('china') || destLower.includes('beijing') || destLower.includes('shanghai')) langKey = 'zh'
    else if (destLower.includes('india') || destLower.includes('delhi') || destLower.includes('mumbai')) langKey = 'hi'
    else if (destLower.includes('egypt') || destLower.includes('dubai') || destLower.includes('uae') || destLower.includes('saudi')) langKey = 'ar'

    return {
        countryName: countryKey === 'default' ? 'Local' : countryKey,
        emergency: EMERGENCY_NUMBERS[countryKey] || EMERGENCY_NUMBERS['default'],
        phrasebook: PHRASEBOOKS[langKey] || PHRASEBOOKS['default']
    }
}
