/**
 * JyotishTools.js
 * 
 * "The Brain" - Advanced Algorithms for Vedic Astrology.
 * Handles Derived Calculations: Vargas, Dashas, Strengths, KP, Jaimini, Doshas, Ashtakvarga.
 */

// --- CONSTANTS ---
const PLANET_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
};

const NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", 
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", 
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
];

const NAK_GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 0, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const GANA_NAMES = ["Deva", "Manushya", "Rakshasa"];
const NAK_NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const NADI_NAMES = ["Adi (Vata)", "Madhya (Pitta)", "Antya (Kapha)"];
const NAK_YONI = ["Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog", "Cat", "Goat", "Cat", "Rat", "Rat", "Cow", "Buffalo", "Tiger", "Buffalo", "Tiger", "Deer", "Deer", "Dog", "Monkey", "Mongoose", "Monkey", "Lion", "Horse", "Lion", "Cow", "Elephant"];

const DASHA_YEARS = { "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17 };
const VIM_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const EXALTATION_POINTS = { "Sun": 10, "Moon": 33, "Mars": 298, "Mercury": 165, "Jupiter": 95, "Venus": 357, "Saturn": 200 };

// ASHTAKVARGA RULES (Benefic Places)
// Format: Planet -> { FromRefPlanet: [Houses 1-12] }
// e.g. Sun's PAV: From Sun it gives points in 1,2,4...
const ASHTAKVARGA_POINTS = {
    "Sun": {
        "Sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "Moon": [3, 6, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [5, 6, 9, 11],
        "Venus": [6, 7, 12],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Ascendant": [3, 4, 6, 10, 11, 12]
    },
    "Moon": {
        "Sun": [3, 6, 7, 8, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Mars": [2, 3, 5, 6, 9, 10, 11],
        "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "Jupiter": [1, 4, 7, 8, 10, 11, 12],
        "Venus": [3, 4, 5, 7, 9, 10, 11],
        "Saturn": [3, 5, 6, 11],
        "Ascendant": [3, 6, 10, 11]
    },
    "Mars": {
        "Sun": [3, 5, 6, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [3, 5, 6, 11],
        "Jupiter": [6, 10, 11, 12],
        "Venus": [6, 8, 11, 12],
        "Saturn": [1, 4, 7, 8, 9, 10, 11],
        "Ascendant": [1, 3, 6, 10, 11]
    },
    "Mercury": {
        "Sun": [5, 6, 9, 11, 12],
        "Moon": [2, 4, 6, 8, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [6, 8, 11, 12],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Ascendant": [1, 2, 4, 6, 8, 10, 11]
    },
    "Jupiter": {
        "Sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "Moon": [2, 5, 7, 9, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "Venus": [2, 5, 6, 9, 10, 11],
        "Saturn": [3, 5, 6, 12],
        "Ascendant": [1, 2, 4, 7, 9, 10, 11]
    },
    "Venus": {
        "Sun": [8, 11, 12],
        "Moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Mars": [3, 5, 6, 9, 11, 12],
        "Mercury": [3, 5, 6, 9, 11],
        "Jupiter": [5, 8, 9, 10, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "Saturn": [3, 4, 5, 8, 9, 10, 11],
        "Ascendant": [1, 2, 3, 4, 5, 8, 9, 11]
    },
    "Saturn": {
        "Sun": [1, 2, 4, 7, 8, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [3, 5, 6, 10, 11, 12],
        "Mercury": [6, 8, 9, 10, 11, 12],
        "Jupiter": [5, 6, 11, 12],
        "Venus": [6, 11, 12],
        "Saturn": [3, 5, 6, 11],
        "Ascendant": [1, 3, 4, 6, 10, 11]
    }
};

class JyotishTools {

    // --- 1. VARGA (DIVISIONAL CHARTS) ---
    getVargaPosition(longitude, vargaNum) {
        const signIndex = Math.floor(longitude / 30);
        const degInSign = longitude % 30;
        const divSpan = 30 / vargaNum;
        const part = Math.floor(degInSign / divSpan); 
        
        let vargaSignId = 0;
        switch(vargaNum) {
            case 1: vargaSignId = signIndex; break;
            case 2: if (signIndex % 2 === 0) vargaSignId = (part === 0) ? 4 : 3; else vargaSignId = (part === 0) ? 3 : 4; break;
            case 3: if (part === 0) vargaSignId = signIndex; if (part === 1) vargaSignId = (signIndex + 4) % 12; if (part === 2) vargaSignId = (signIndex + 8) % 12; break;
            case 4: vargaSignId = (signIndex + (part * 3)) % 12; break;
            case 7: let startD7 = (signIndex % 2 === 0) ? signIndex : (signIndex + 6) % 12; vargaSignId = (startD7 + part) % 12; break;
            case 9: const elem = signIndex % 4; let startD9 = 0; if (elem === 0) startD9 = 0; if (elem === 1) startD9 = 9; if (elem === 2) startD9 = 6; if (elem === 3) startD9 = 3; vargaSignId = (startD9 + part) % 12; break;
            case 10: let startD10 = (signIndex % 2 === 0) ? signIndex : (signIndex + 8) % 12; vargaSignId = (startD10 + part) % 12; break;
            case 12: vargaSignId = (signIndex + part) % 12; break;
            case 60: vargaSignId = (signIndex + part) % 12; break;
            default: vargaSignId = (signIndex * vargaNum + part) % 12; 
        }
        const rashis = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        return { signId: vargaSignId, signName: rashis[vargaSignId] };
    }

    // --- 2. VIMSHOTTARI --- (Existing)
    calculateVimshottari(moonLongitude, birthDate) {
        const nakIndex = Math.floor(moonLongitude / 13.3333333);
        const nakLord = NAKSHATRA_LORDS[nakIndex];
        const degInNak = moonLongitude % 13.3333333;
        const percentGone = degInNak / 13.3333333;
        const totalYears = DASHA_YEARS[nakLord];
        const balanceYears = totalYears * (1 - percentGone);
        let currentDate = new Date(birthDate);
        let results = [];
        let startIndex = VIM_ORDER.indexOf(nakLord);
        
        let endDate = new Date(currentDate);
        endDate.setFullYear(endDate.getFullYear() + Math.floor(balanceYears));
        const remDays = (balanceYears % 1) * 365.25;
        endDate.setDate(endDate.getDate() + remDays);
        results.push({ lord: nakLord, start: new Date(birthDate), end: new Date(endDate), duration: balanceYears });
        currentDate = new Date(endDate);

        for (let i = 1; i < 9; i++) {
            let idx = (startIndex + i) % 9;
            let lord = VIM_ORDER[idx];
            let years = DASHA_YEARS[lord];
            let nextEnd = new Date(currentDate);
            nextEnd.setFullYear(nextEnd.getFullYear() + years);
            results.push({ lord: lord, start: new Date(currentDate), end: new Date(nextEnd), duration: years });
            currentDate = nextEnd;
        }
        return results;
    }

    // --- 3. KP SYSTEM --- (Existing)
    getKPLords(longitude) {
        const signIndex = Math.floor(longitude / 30);
        const rashis = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        const signName = rashis[signIndex];
        const signLord = PLANET_LORDS[signName];
        const nakIndex = Math.floor(longitude / 13.3333333);
        const starLord = NAKSHATRA_LORDS[nakIndex];
        const degInNak = longitude % 13.3333333;
        const minsInNak = degInNak * 60; 
        const starLordIndex = VIM_ORDER.indexOf(starLord);
        let activeSubLord = "";
        let passedMins = 0;
        let activeSubSubLord = "";
        
        for (let i = 0; i < 9; i++) {
            let idx = (starLordIndex + i) % 9;
            let lord = VIM_ORDER[idx];
            let years = DASHA_YEARS[lord];
            let spanMins = (years / 120) * 800; 
            if (minsInNak < (passedMins + spanMins)) {
                activeSubLord = lord;
                let minsInSub = minsInNak - passedMins;
                let subStartIndex = VIM_ORDER.indexOf(activeSubLord);
                let passedSubMins = 0;
                for(let j=0; j<9; j++) {
                     let subIdx = (subStartIndex + j) % 9;
                     let subLordName = VIM_ORDER[subIdx];
                     let subYears = DASHA_YEARS[subLordName];
                     let subSubSpan = (subYears / 120) * spanMins;
                     if (minsInSub < (passedSubMins + subSubSpan)) {
                         activeSubSubLord = subLordName;
                         break;
                     }
                     passedSubMins += subSubSpan;
                }
                break;
            }
            passedMins += spanMins;
        }
        return { sign: signName, signLord: signLord, starLord: starLord, subLord: activeSubLord, subSubLord: activeSubSubLord };
    }

    // --- 4. SHADBALA --- (Existing)
    calculateShadbala(planets) {
        const output = {};
        planets.forEach(p => {
             if (["Rahu", "Ketu", "Ascendant"].includes(p.name)) return;
             let exaltPoint = EXALTATION_POINTS[p.name];
             let debilPoint = (exaltPoint + 180) % 360;
             let diff = Math.abs(p.longitude - debilPoint);
             if (diff > 180) diff = 360 - diff;
             const ochcha = (diff / 180) * 60;
             const sapta = 30; const dig = 45; const kala = 100;
             let chesta = 30; if (p.isRetrograde) chesta = 50;
             const drig = 10;
             const naisargikaValues = { "Sun": 60, "Moon": 51.4, "Mars": 17.1, "Mercury": 25.7, "Jupiter": 34.3, "Venus": 42.9, "Saturn": 8.6 };
             const naisargika = naisargikaValues[p.name] || 0;
             const total = ochcha + sapta + dig + kala + chesta + drig + naisargika;
             output[p.name] = {
                 total: total.toFixed(1),
                 components: { ochcha: ochcha.toFixed(1), sapta: sapta.toFixed(1), dig: dig.toFixed(1), kala: kala.toFixed(1), chesta: chesta.toFixed(1), drig: drig.toFixed(1), naisargika: naisargika.toFixed(1) }
             };
        });
        return output;
    }

    // --- 5. JAIMINI --- (Existing)
    calculateJaimini(planets) {
        const candidates = planets.filter(p => ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].includes(p.name));
        candidates.sort((a, b) => {
            const degA = a.longitude % 30;
            const degB = b.longitude % 30;
            return degB - degA; 
        });
        const karakaNames = ["Atma Karaka (AK)", "Amatya Karaka (AmK)", "Bhratru Karaka (BK)", "Matru Karaka (MK)", "Putra Karaka (PK)", "Gnati Karaka (GK)", "Dara Karaka (DK)"];
        return candidates.map((p, idx) => ({ planet: p.name, karaka: karakaNames[idx] || "None", degree: (p.longitude % 30).toFixed(2) }));
    }

    // --- 6. DOSHAS --- (Existing)
    checkDoshas(planets) {
        const asc = planets.find(p => p.name === "Ascendant");
        const mars = planets.find(p => p.name === "Mars");
        const rahu = planets.find(p => p.name === "Rahu");
        const ketu = planets.find(p => p.name === "Ketu");
        let manglik = { isPresent: false, reason: "None" };
        let kalsarpa = { isPresent: false, type: "None" };
        if (asc && mars) {
             const house = Math.floor(((mars.longitude - asc.longitude + 360) % 360) / 30) + 1;
             if ([1, 2, 4, 7, 8, 12].includes(house)) {
                 manglik = { isPresent: true, reason: `Mars in House ${house}` };
             }
        }
        if (rahu && ketu) {
            let others = planets.filter(p => !["Rahu", "Ketu", "Ascendant", "Uranus", "Neptune", "Pluto"].includes(p.name));
            let rL = rahu.longitude;
            let kL = ketu.longitude;
            let inArc1 = others.every(p => { let dist = (p.longitude - rL + 360) % 360; let kDist = (kL - rL + 360) % 360; return dist < kDist; });
            let inArc2 = others.every(p => { let dist = (p.longitude - kL + 360) % 360; let rDist = (rL - kL + 360) % 360; return dist < rDist; });
            if (inArc1 || inArc2) {
                kalsarpa = { isPresent: true, type: inArc1 ? "Anant type (Rahu Lead)" : "Vishdhar type (Ketu Lead)" };
            }
        }
        return { manglik, kalsarpa };
    }
    
    // --- 7. AVKAHADA --- (Existing)
    getAvkahada(moonLongitude) {
        const nakIndex = Math.floor(moonLongitude / 13.3333333);
        return { gana: GANA_NAMES[NAK_GANA[nakIndex]], yoni: NAK_YONI[nakIndex], nadi: NADI_NAMES[NAK_NADI[nakIndex]], varna: "Calculated from Moon Sign", vashya: "Calculated from Moon Sign" };
    }

    // --- 8. ASHTAKVARGA (NEW) ---
    calculateAshtakvarga(planets) {
        // We calculate points for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn (7 BV)
        // And Sarvashtakavarga (SAV)
        const output = {};
        const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
        
        // Initialize 12 signs for SAV
        output.SAV = Array(12).fill(0); // Index 0 = Aries
        
        planetNames.forEach(pName => {
            // PAV for this planet (12 signs)
            const pav = Array(12).fill(0); 
            
            // Rules for pName
            const rules = ASHTAKVARGA_POINTS[pName];
            
            // Iterate over all reference bodies (Sun..Sat + Asc)
            Object.keys(rules).forEach(refBody => {
                const houseOffsets = rules[refBody]; // e.g. [1, 2, 4...]
                
                // Find longitude/sign of the reference body in the user's chart
                const refPlanet = planets.find(p => p.name === refBody);
                if (refPlanet) {
                    const refSignIndex = refPlanet.signId; // 0-11 (Aries=0)
                    
                    // Add points
                    houseOffsets.forEach(h => {
                         // House 1 means Same sign. Offset = h-1
                         const targetSignIndex = (refSignIndex + (h-1)) % 12;
                         pav[targetSignIndex]++;
                    });
                }
            });
            
            output[pName] = pav;
            
            // Add to SAV
            pav.forEach((pts, idx) => {
                output.SAV[idx] += pts;
            });
        });
        
        return output;
    }

    // --- LOCKUPS (Existing) ---
    getNakshatraLord(nakIndex) { return NAKSHATRA_LORDS[nakIndex % 27]; }
    getSignLord(signName) { return PLANET_LORDS[signName]; }
}

export default new JyotishTools();
