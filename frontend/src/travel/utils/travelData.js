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
    // Balkan region
    'Albania': { general: '112', police: '129', ambulance: '127', fire: '128' },
    'Bosnia and Herzegovina': { general: '112', police: '122', ambulance: '124', fire: '123' },
    'Croatia': { general: '112', police: '192', ambulance: '194', fire: '193' },
    'Montenegro': { general: '112', police: '122', ambulance: '124', fire: '123' },
    'North Macedonia': { general: '112', police: '192', ambulance: '194', fire: '193' },
    'Serbia': { general: '112', police: '192', ambulance: '194', fire: '193' },
    'Kosovo': { general: '112' },
    'Bulgaria': { general: '112' },
    'Romania': { general: '112' },
    'Slovenia': { general: '112', police: '113', ambulance: '112', fire: '112' },
    // Wider region
    'Turkey': { police: '155', ambulance: '112', fire: '110' },
    'Russia': { general: '112', police: '102', ambulance: '103', fire: '101' },
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
        please: 'Please',
        sorry: 'Sorry',
        help: 'Help!',
        where_is: 'Where is...?',
        do_you_speak_english: 'Do you speak English?',
        i_dont_understand: "I don't understand",
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
        please: 'S’il vous plaît',
        sorry: 'Pardon',
        help: 'Aidez-moi!',
        where_is: 'Où est...?',
        do_you_speak_english: 'Parlez-vous anglais ?',
        i_dont_understand: "Je ne comprends pas",
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
        please: 'Por favor',
        sorry: 'Perdón',
        help: '¡Ayuda!',
        where_is: '¿Dónde está...?',
        do_you_speak_english: '¿Habla inglés?',
        i_dont_understand: 'No entiendo',
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
        please: 'Bitte',
        sorry: 'Entschuldigung',
        help: 'Hilfe!',
        where_is: 'Wo ist...?',
        do_you_speak_english: 'Sprechen Sie Englisch?',
        i_dont_understand: 'Ich verstehe nicht',
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
        please: 'Per favore',
        sorry: 'Mi dispiace',
        help: 'Aiuto!',
        where_is: 'Dov’è...?',
        do_you_speak_english: 'Parla inglese?',
        i_dont_understand: 'Non capisco',
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
        please: 'Por favor',
        sorry: 'Desculpa',
        help: 'Socorro!',
        where_is: 'Onde fica...?',
        do_you_speak_english: 'Você fala inglês?',
        i_dont_understand: 'Não entendo',
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
        please: 'Alsjeblieft',
        sorry: 'Sorry',
        help: 'Help!',
        where_is: 'Waar is...?',
        do_you_speak_english: 'Spreekt u Engels?',
        i_dont_understand: 'Ik begrijp het niet',
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
        please: 'Parakaló',
        sorry: 'Signómi',
        help: 'Voítheia!',
        where_is: 'Poú eínai...?',
        do_you_speak_english: 'Miláte Angliká?',
        i_dont_understand: 'Den katalavéno',
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
        please: 'Lütfen',
        sorry: 'Üzgünüm',
        help: 'İmdat!',
        where_is: 'Nerede...?',
        do_you_speak_english: 'İngilizce biliyor musunuz?',
        i_dont_understand: 'Anlamıyorum',
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
        please: 'Onegaishimasu',
        sorry: 'Gomen nasai',
        help: 'Tasukete!',
        where_is: 'Doko desu ka...?',
        do_you_speak_english: 'Eigo o hanasemasu ka?',
        i_dont_understand: 'Wakarimasen',
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
        please: 'Qǐng',
        sorry: 'Duìbùqǐ',
        help: 'Jiùmìng!',
        where_is: 'Zài nǎlǐ...?',
        do_you_speak_english: 'Nǐ huì shuō Yīngyǔ ma?',
        i_dont_understand: 'Wǒ bù dǒng',
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
        please: 'Kripya',
        sorry: 'Maaf kijiye',
        help: 'Bachao!',
        where_is: 'Kahan hai...?',
        do_you_speak_english: 'Kya aap English bolte hain?',
        i_dont_understand: 'Mujhe samajh nahi aaya',
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
        please: 'Min fadlak',
        sorry: 'Aasif',
        help: 'Musaada!',
        where_is: 'Ayna...?',
        do_you_speak_english: 'Hal tatakallam al ingliziya?',
        i_dont_understand: 'Lā afham',
        bathroom: 'Hammam',
        water: 'Mai',
        how_much: 'Bi kam?',
        bill: 'Al hisab'
    },
    // Balkan languages
    'sr': { // Serbian (Latin)
        language: 'Serbian',
        hello: 'Zdravo',
        thank_you: 'Hvala',
        yes: 'Da',
        no: 'Ne',
        please: 'Molim',
        sorry: 'Izvinite',
        help: 'Upomoć!',
        where_is: 'Gde je...?',
        do_you_speak_english: 'Da li govorite engleski?',
        i_dont_understand: 'Ne razumem',
        bathroom: 'Toalet',
        water: 'Voda',
        how_much: 'Koliko košta?',
        bill: 'Račun, molim'
    },
    'hr': { // Croatian
        language: 'Croatian',
        hello: 'Bok',
        thank_you: 'Hvala',
        yes: 'Da',
        no: 'Ne',
        please: 'Molim',
        sorry: 'Oprostite',
        help: 'Upomoć!',
        where_is: 'Gdje je...?',
        do_you_speak_english: 'Govorite li engleski?',
        i_dont_understand: 'Ne razumijem',
        bathroom: 'WC',
        water: 'Voda',
        how_much: 'Koliko košta?',
        bill: 'Račun, molim'
    },
    'bs': { // Bosnian
        language: 'Bosnian',
        hello: 'Zdravo',
        thank_you: 'Hvala',
        yes: 'Da',
        no: 'Ne',
        please: 'Molim',
        sorry: 'Izvinite',
        help: 'Upomoć!',
        where_is: 'Gdje je...?',
        do_you_speak_english: 'Govorite li engleski?',
        i_dont_understand: 'Ne razumijem',
        bathroom: 'WC',
        water: 'Voda',
        how_much: 'Koliko košta?',
        bill: 'Račun, molim'
    },
    'sq': { // Albanian
        language: 'Albanian',
        hello: 'Përshëndetje',
        thank_you: 'Faleminderit',
        yes: 'Po',
        no: 'Jo',
        please: 'Ju lutem',
        sorry: 'Më falni',
        help: 'Ndihmë!',
        where_is: 'Ku është...?',
        do_you_speak_english: 'Flisni anglisht?',
        i_dont_understand: 'Nuk kuptoj',
        bathroom: 'Tualet',
        water: 'Ujë',
        how_much: 'Sa kushton?',
        bill: 'Faturën, ju lutem'
    },
    'mk': { // Macedonian (Latin transliteration)
        language: 'Macedonian',
        hello: 'Zdravo',
        thank_you: 'Blagodaram',
        yes: 'Da',
        no: 'Ne',
        please: 'Vе molam',
        sorry: 'Izvinete',
        help: 'Pomos!',
        where_is: 'Kade e...?',
        do_you_speak_english: 'Zboruvate angliski?',
        i_dont_understand: 'Ne razbiram',
        bathroom: 'Toalet',
        water: 'Voda',
        how_much: 'Kolku chini?',
        bill: 'Smetka, ve molam'
    },
    'bg': { // Bulgarian (Latin transliteration)
        language: 'Bulgarian',
        hello: 'Zdravey',
        thank_you: 'Blagodarya',
        yes: 'Da',
        no: 'Ne',
        please: 'Molya',
        sorry: 'Sŭzhalyavam',
        help: 'Pomoshch!',
        where_is: 'Kŭde e...?',
        do_you_speak_english: 'Govorĭte li angliĭski?',
        i_dont_understand: 'Ne razbiram',
        bathroom: 'Toaletna',
        water: 'Voda',
        how_much: 'Kolko struva?',
        bill: 'Smetkata, molya'
    },
    'ro': { // Romanian
        language: 'Romanian',
        hello: 'Bună',
        thank_you: 'Mulțumesc',
        yes: 'Da',
        no: 'Nu',
        please: 'Vă rog',
        sorry: 'Scuzați-mă',
        help: 'Ajutor!',
        where_is: 'Unde este...?',
        do_you_speak_english: 'Vorbiți engleză?',
        i_dont_understand: 'Nu înțeleg',
        bathroom: 'Toaletă',
        water: 'Apă',
        how_much: 'Cât costă?',
        bill: 'Nota, vă rog'
    },
    'sl': { // Slovene
        language: 'Slovene',
        hello: 'Živjo',
        thank_you: 'Hvala',
        yes: 'Da',
        no: 'Ne',
        please: 'Prosim',
        sorry: 'Oprostite',
        help: 'Pomoč!',
        where_is: 'Kje je...?',
        do_you_speak_english: 'Govorite angleško?',
        i_dont_understand: 'Ne razumem',
        bathroom: 'Stranišče',
        water: 'Voda',
        how_much: 'Koliko stane?',
        bill: 'Račun, prosim'
    },
    // Russian
    'ru': { // Russian (Latin transliteration)
        language: 'Russian',
        hello: 'Zdravstvuyte',
        thank_you: 'Spasibo',
        yes: 'Da',
        no: 'Net',
        please: 'Pozhaluysta',
        sorry: 'Izvinite',
        help: 'Pomogite!',
        where_is: 'Gde ...?',
        do_you_speak_english: 'Vy govorite po-angliyski?',
        i_dont_understand: 'Ya ne ponimayu',
        bathroom: 'Tualet',
        water: 'Voda',
        how_much: 'Skolko eto stoit?',
        bill: 'Schet, pozhaluysta'
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
    // Balkan destinations
    else if (destLower.includes('serbia') || destLower.includes('belgrade')) langKey = 'sr'
    else if (destLower.includes('croatia') || destLower.includes('zagreb') || destLower.includes('dubrovnik') || destLower.includes('split')) langKey = 'hr'
    else if (destLower.includes('bosnia') || destLower.includes('sarajevo')) langKey = 'bs'
    else if (destLower.includes('albania') || destLower.includes('tirana') || destLower.includes('kosovo') || destLower.includes('pristina')) langKey = 'sq'
    else if (destLower.includes('north macedonia') || destLower.includes('macedonia') || destLower.includes('skopje')) langKey = 'mk'
    else if (destLower.includes('bulgaria') || destLower.includes('sofia')) langKey = 'bg'
    else if (destLower.includes('romania') || destLower.includes('bucharest')) langKey = 'ro'
    else if (destLower.includes('slovenia') || destLower.includes('ljubljana')) langKey = 'sl'
    else if (destLower.includes('turkey') || destLower.includes('istanbul')) langKey = 'tr'
    else if (destLower.includes('japan') || destLower.includes('tokyo') || destLower.includes('osaka')) langKey = 'ja'
    else if (destLower.includes('china') || destLower.includes('beijing') || destLower.includes('shanghai')) langKey = 'zh'
    else if (destLower.includes('india') || destLower.includes('delhi') || destLower.includes('mumbai')) langKey = 'hi'
    else if (destLower.includes('egypt') || destLower.includes('dubai') || destLower.includes('uae') || destLower.includes('saudi')) langKey = 'ar'
    else if (destLower.includes('russia') || destLower.includes('moscow') || destLower.includes('st petersburg') || destLower.includes('saint petersburg')) langKey = 'ru'

    return {
        countryName: countryKey === 'default' ? 'Local' : countryKey,
        emergency: EMERGENCY_NUMBERS[countryKey] || EMERGENCY_NUMBERS['default'],
        phrasebook: PHRASEBOOKS[langKey] || PHRASEBOOKS['default']
    }
}
