/**
 * KPEventEngine.js
 * 
 * KP Astrology Event Probability Calculator (KP Standard Compliant)
 * Implements orthodox KP principles from kpastrology.astrosage.com
 * 
 * FEATURES:
 * - Deep Dasha calculation: Mahadasha → Antardasha → Pratyantar → Sookshma
 * - KP-compliant 4-level significator hierarchy (Star Lord priority)
 * - Strength-based probability scoring (Level 1 > Level 4)
 * - Event type house groupings per KP standard
 * - Ruling Planets calculation for fine-tuning
 * - Transit-based probability scoring
 * - Integration with VedicAstroEngine and JyotishTools
 */

// --- CONSTANTS ---

const DASHA_YEARS = { 
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, 
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17 
};
const VIM_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const TOTAL_DASHA_YEARS = 120;

const NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
];

const PLANET_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter"
};

// --- KP SUB DIVISION SYSTEM ---
/**
 * KP Sub divisions follow the same Vimshottari proportional distribution
 * Each 13°20' nakshatra is divided into 9 subs in Vimshottari proportion
 * The sub lords follow the same sequence as the nakshatra lord's position in VIM order
 */

// Calculate sub divisions for a nakshatra
// Each nakshatra (13.333333°) is divided proportionally by dasha years
function getSubDivisions(nakshatraLord) {
    const totalDegrees = 13.3333333; // 13°20'
    const startIndex = VIM_ORDER.indexOf(nakshatraLord);
    const subdivisions = [];
    let currentDegree = 0;
    
    for (let i = 0; i < 9; i++) {
        const lordIndex = (startIndex + i) % 9;
        const lord = VIM_ORDER[lordIndex];
        const proportion = DASHA_YEARS[lord] / TOTAL_DASHA_YEARS;
        const degrees = totalDegrees * proportion;
        
        subdivisions.push({
            lord: lord,
            startDegree: currentDegree,
            endDegree: currentDegree + degrees,
            span: degrees
        });
        
        currentDegree += degrees;
    }
    
    return subdivisions;
}

// Pre-calculate all sub divisions for all 27 nakshatras
const KP_SUB_DIVISIONS = {};
NAKSHATRA_LORDS.forEach((lord, nakIndex) => {
    KP_SUB_DIVISIONS[nakIndex] = getSubDivisions(lord);
});


// --- EVENT TYPE DEFINITIONS ---
// Houses are 1-indexed as per KP convention

const EVENT_TYPES = [
    {
        id: "marriage",
        name: "Marriage / Relationship",
        icon: "💍",
        houses: [2, 7, 11],
        description: "7=Spouse, 2=Family, 11=Fulfillment of desires"
    },
    {
        id: "career",
        name: "Career / Job Change",
        icon: "💼",
        houses: [2, 6, 10],
        description: "10=Profession, 6=Service, 2=Income"
    },
    {
        id: "finance",
        name: "Finance / Gains",
        icon: "💰",
        houses: [2, 6, 11],
        description: "2=Wealth, 6=Service income, 11=Gains"
    },
    {
        id: "health",
        name: "Health Issues",
        icon: "🏥",
        houses: [1, 6, 8, 12],
        description: "1=Body, 6=Disease, 8=Chronic, 12=Hospitalization",
        isNegative: true
    },
    {
        id: "travel_short",
        name: "Short Travel",
        icon: "🚗",
        houses: [3],
        description: "3=Short journeys"
    },
    {
        id: "travel_foreign",
        name: "Foreign Travel / Settlement",
        icon: "✈️",
        houses: [9, 12],
        description: "9=Foreign lands, 12=Leaving homeland"
    },
    {
        id: "education",
        name: "Education / Learning",
        icon: "📚",
        houses: [4, 9, 11],
        description: "4=Foundational education, 9=Higher learning, 11=Fulfillment"
    },
    {
        id: "property",
        name: "Property / Real Estate",
        icon: "🏠",
        houses: [4, 11, 12],
        description: "4=Land/Home, 11=Gains, 12=Expenses for property"
    },
    {
        id: "children",
        name: "Childbirth",
        icon: "👶",
        houses: [2, 5, 11],
        description: "5=Children, 2=Family extension, 11=Desires"
    },
    {
        id: "legal",
        name: "Legal Matters",
        icon: "⚖️",
        houses: [6, 8, 12],
        description: "6=Disputes, 8=Obstacles, 12=Losses",
        isNegative: true
    },
    {
        id: "obstacles",
        name: "Obstacles / Losses",
        icon: "⚠️",
        houses: [6, 8, 12],
        description: "Dusthana houses (malefic)",
        isNegative: true
    },
    {
        id: "spiritual",
        name: "Spiritual Progress",
        icon: "🕉️",
        houses: [5, 9, 12],
        description: "5=Merit, 9=Dharma, 12=Moksha"
    }
];

class KPEventEngine {
    constructor() {
        this.natalData = null;
        this.houseSignificators = {}; // {planet: Set of houses it signifies}
    }

    // --- DEEP DASHA CALCULATIONS ---
    
    /**
     * Calculate all 4 dasha levels for a given date
     * @param {number} moonLongitude - Moon's sidereal longitude at birth
     * @param {string} birthDateStr - Birth date (YYYY-MM-DD)
     * @param {Date} targetDate - Date to find dasha for
     * @returns {object} {mahadasha, antardasha, pratyantar, sookshma}
     */
    calculateDeepDasha(moonLongitude, birthDateStr, targetDate) {
        const birthDate = new Date(birthDateStr);
        
        // Find starting Nakshatra and balance
        const nakIndex = Math.floor(moonLongitude / 13.3333333);
        const nakLord = NAKSHATRA_LORDS[nakIndex];
        const degInNak = moonLongitude % 13.3333333;
        const percentGone = degInNak / 13.3333333;
        
        // Calculate days elapsed from birth to target
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysElapsed = (targetDate - birthDate) / msPerDay;
        const yearsElapsed = daysElapsed / 365.25;
        
        // Find Mahadasha
        let mahadasha = this._findDashaLevel(nakLord, percentGone, yearsElapsed, TOTAL_DASHA_YEARS);
        
        // For Antardasha, we work within the Mahadasha period
        const mdYears = DASHA_YEARS[mahadasha.lord];
        const yearsIntoMD = yearsElapsed - mahadasha.startYears;
        const antardasha = this._findSubDasha(mahadasha.lord, yearsIntoMD, mdYears);
        
        // For Pratyantar, work within Antardasha
        const adYears = (DASHA_YEARS[antardasha.lord] / TOTAL_DASHA_YEARS) * mdYears;
        const yearsIntoAD = yearsIntoMD - antardasha.startYears;
        const pratyantar = this._findSubDasha(antardasha.lord, yearsIntoAD, adYears);
        
        // For Sookshma, work within Pratyantar
        const pdYears = (DASHA_YEARS[pratyantar.lord] / TOTAL_DASHA_YEARS) * adYears;
        const yearsIntoPD = yearsIntoAD - pratyantar.startYears;
        const sookshma = this._findSubDasha(pratyantar.lord, yearsIntoPD, pdYears);
        
        return {
            mahadasha: mahadasha.lord,
            antardasha: antardasha.lord,
            pratyantar: pratyantar.lord,
            sookshma: sookshma.lord,
            levels: [mahadasha.lord, antardasha.lord, pratyantar.lord, sookshma.lord]
        };
    }
    
    _findDashaLevel(startLord, percentGone, yearsElapsed, totalPeriod) {
        const startIndex = VIM_ORDER.indexOf(startLord);
        let cumulativeYears = 0;
        
        // First dasha balance
        const firstDashaTotal = DASHA_YEARS[startLord];
        const firstDashaBalance = firstDashaTotal * (1 - percentGone);
        
        if (yearsElapsed < firstDashaBalance) {
            return { lord: startLord, startYears: 0 };
        }
        cumulativeYears = firstDashaBalance;
        
        // Subsequent dashas
        for (let i = 1; i < 9; i++) {
            const idx = (startIndex + i) % 9;
            const lord = VIM_ORDER[idx];
            const years = DASHA_YEARS[lord];
            
            if (yearsElapsed < cumulativeYears + years) {
                return { lord: lord, startYears: cumulativeYears };
            }
            cumulativeYears += years;
        }
        
        // If we exceed 120 years, cycle back
        return this._findDashaLevel(startLord, 0, yearsElapsed - TOTAL_DASHA_YEARS, totalPeriod);
    }
    
    _findSubDasha(parentLord, yearsIntoParent, parentDuration) {
        const startIndex = VIM_ORDER.indexOf(parentLord);
        let cumulativeYears = 0;
        
        for (let i = 0; i < 9; i++) {
            const idx = (startIndex + i) % 9;
            const lord = VIM_ORDER[idx];
            // Sub-period proportion: (lord's years / 120) * parent duration
            const subDuration = (DASHA_YEARS[lord] / TOTAL_DASHA_YEARS) * parentDuration;
            
            if (yearsIntoParent < cumulativeYears + subDuration) {
                return { lord: lord, startYears: cumulativeYears };
            }
            cumulativeYears += subDuration;
        }
        
        // Fallback (shouldn't happen)
        return { lord: VIM_ORDER[startIndex], startYears: 0 };
    }

    // --- HOUSE SIGNIFICATION (KP STANDARD) ---
    
    /**
     * Build planet-to-house signification map from natal KP data
     * Following orthodox KP hierarchy (per kpastrology.astrosage.com):
     * 
     * Level 1 (Strongest): Houses occupied by the Star Lord (Nakshatra Lord)
     * Level 2: House occupied by the planet itself
     * Level 3: Houses owned/ruled by the Star Lord
     * Level 4 (Weakest): Houses owned/ruled by the planet itself
     * 
     * NOTE: For "self-strength" planets (no planets in their star), 
     * Level 2 and Level 1 swap priority.
     */
    buildHouseSignificators(natalPlanets, natalKPCusps) {
        this.houseSignificators = {};
        this.significatorLevels = {}; // Store strength levels for each planet
        
        // Initialize for all planets
        const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
        planetNames.forEach(p => {
            this.houseSignificators[p] = new Set();
            this.significatorLevels[p] = { level1: [], level2: [], level3: [], level4: [] };
        });
        
        // Get cusp longitudes for bhava calculation (KP uses cusp-based houses!)
        // natalKPCusps should be array of 12 cusp longitudes
        const cuspLongitudes = natalKPCusps || [];
        
        // Helper: Calculate bhava (house) number from longitude using cusps
        // KP uses CUSP-BASED BHAVAS, not equal sign-based houses!
        const getBhavaNum = (longitude) => {
            if (cuspLongitudes.length !== 12) {
                // Fallback to sign-based if cusps not provided
                const asc = natalPlanets.find(p => p.name === "Ascendant");
                if (!asc) return 1;
                const ascSignId = asc.signId;
                const planetSign = Math.floor(longitude / 30);
                return ((planetSign - ascSignId + 12) % 12) + 1;
            }
            
            // Find which bhava this longitude falls in (between cusp N and cusp N+1)
            for (let i = 0; i < 12; i++) {
                const cuspStart = cuspLongitudes[i];
                const cuspEnd = cuspLongitudes[(i + 1) % 12];
                
                // Handle zodiac wraparound
                if (cuspStart < cuspEnd) {
                    if (longitude >= cuspStart && longitude < cuspEnd) {
                        return i + 1;
                    }
                } else {
                    // Wraparound case (e.g., cusp at 350° to cusp at 20°)
                    if (longitude >= cuspStart || longitude < cuspEnd) {
                        return i + 1;
                    }
                }
            }
            return 1; // Fallback
        };
        
        // Build planet occupancy map using BHAVA (cusp-based houses)
        const planetOccupancy = {};
        natalPlanets.forEach(planet => {
            if (planet.name === "Ascendant") return;
            planetOccupancy[planet.name] = getBhavaNum(planet.longitude);
        });
        
        // Build planet ownership map (which houses each planet rules)
        // In KP, ownership is based on which SIGNS appear on CUSPS, not equal houses!
        const planetOwnership = {};
        const rashis = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
                       "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        
        planetNames.forEach(p => planetOwnership[p] = []);
        
        if (cuspLongitudes.length === 12) {
            // Use cusp-based ownership: Find which sign is on each cusp
            for (let i = 0; i < 12; i++) {
                const cuspLongitude = cuspLongitudes[i];
                const signId = Math.floor(cuspLongitude / 30);
                const signName = rashis[signId];
                const lord = PLANET_LORDS[signName];
                const houseNum = i + 1;
                
                if (planetOwnership[lord] && !planetOwnership[lord].includes(houseNum)) {
                    planetOwnership[lord].push(houseNum);
                }
            }
        } else {
            // Fallback to ascendant-based if cusps not provided
            const asc = natalPlanets.find(p => p.name === "Ascendant");
            if (!asc) return;
            const ascSignId = asc.signId;
            
            for (let i = 0; i < 12; i++) {
                const signId = (ascSignId + i) % 12;
                const signName = rashis[signId];
                const lord = PLANET_LORDS[signName];
                const houseNum = i + 1;
                
                if (planetOwnership[lord]) {
                    planetOwnership[lord].push(houseNum);
                }
            }
        }
        
        // Special handling for Rahu & Ketu - they act as agents of their depositors
        // For now, we'll handle them through star lord connection
        
        // Now build significators for each planet using KP hierarchy
        natalPlanets.forEach(planet => {
            if (planet.name === "Ascendant" || !planet.nakshatraId) return;
            
            const planetName = planet.name;
            const starLord = NAKSHATRA_LORDS[planet.nakshatraId];
            
            // Check for self-strength (TODO: requires checking if any planets are in this planet's nakshatra)
            // For now, we'll use standard order
            
            // LEVEL 1: House(s) occupied by Star Lord
            if (planetOccupancy[starLord] !== undefined) {
                const house = planetOccupancy[starLord];
                this.significatorLevels[planetName].level1.push(house);
                this.houseSignificators[planetName].add(house);
            }
            
            // LEVEL 2: House occupied by planet itself
            if (planetOccupancy[planetName] !== undefined) {
                const house = planetOccupancy[planetName];
                this.significatorLevels[planetName].level2.push(house);
                this.houseSignificators[planetName].add(house);
            }
            
            // LEVEL 3: Houses owned by Star Lord
            if (planetOwnership[starLord]) {
                planetOwnership[starLord].forEach(house => {
                    this.significatorLevels[planetName].level3.push(house);
                    this.houseSignificators[planetName].add(house);
                });
            }
            
            // LEVEL 4: Houses owned by planet itself
            if (planetOwnership[planetName]) {
                planetOwnership[planetName].forEach(house => {
                    this.significatorLevels[planetName].level4.push(house);
                    this.houseSignificators[planetName].add(house);
                });
            }
        });
        
        return this.houseSignificators;
    }
    
    /**
     * Calculate Ruling Planets for a given moment (KP Standard)
     * Used for fine-tuning predictions and selecting strongest significators
     * 
     * @param {number} ascLongitude - Ascendant longitude at the moment
     * @param {number} moonLongitude - Moon longitude at the moment
     * @param {Date} dateTime - Date/time for the calculation
     * @returns {object} {ascStarLord, ascSignLord, moonStarLord, moonSignLord, dayLord}
     */
    calculateRulingPlanets(ascLongitude, moonLongitude, dateTime) {
        const rashis = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
                       "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        
        // Day lords (Hindu days start from sunrise, but we'll use standard weekday)
        const dayLords = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
        
        // 1. Ascendant Star Lord (nakshatra of ascendant)
        const ascNakIndex = Math.floor(ascLongitude / 13.3333333);
        const ascStarLord = NAKSHATRA_LORDS[ascNakIndex];
        
        // 2. Ascendant Sign Lord (ruler of ascendant sign)
        const ascSignId = Math.floor(ascLongitude / 30);
        const ascSignLord = PLANET_LORDS[rashis[ascSignId]];
        
        // 3. Moon Star Lord (nakshatra of moon)
        const moonNakIndex = Math.floor(moonLongitude / 13.3333333);
        const moonStarLord = NAKSHATRA_LORDS[moonNakIndex];
        
        // 4. Moon Sign Lord (ruler of moon sign)
        const moonSignId = Math.floor(moonLongitude / 30);
        const moonSignLord = PLANET_LORDS[rashis[moonSignId]];
        
        // 5. Day Lord (lord of the weekday)
        const dayOfWeek = dateTime.getDay(); // 0=Sunday, 1=Monday, etc.
        const dayLord = dayLords[dayOfWeek];
        
        return {
            ascStarLord,
            ascSignLord,
            moonStarLord,
            moonSignLord,
            dayLord,
            // Ordered by strength (as per KP)
            inOrder: [ascStarLord, ascSignLord, moonStarLord, moonSignLord, dayLord]
        };
    }
    
    /**
     * Get significator strength level for a planet-house combination
     * Returns 1-4 (1 = strongest, 4 = weakest), or 0 if not a significator
     */
    getSignificatorLevel(planet, house) {
        if (!this.significatorLevels[planet]) return 0;
        
        const levels = this.significatorLevels[planet];
        if (levels.level1.includes(house)) return 1;
        if (levels.level2.includes(house)) return 2;
        if (levels.level3.includes(house)) return 3;
        if (levels.level4.includes(house)) return 4;
        
        return 0; // Not a significator
    }
    
    /**
     * Calculate Sub-Lord for a given longitude (KP Standard)
     * The sub-lord is determined by the proportional subdivision of the nakshatra
     * 
     * @param {number} longitude - Sidereal longitude in degrees (0-360)
     * @returns {object} {subLord, nakshatra, nakshatraLord, degreeInNak, subStart, subEnd}
     */
    calculateSubLord(longitude) {
        // Normalize longitude to 0-360
        const normLong = ((longitude % 360) + 360) % 360;
        
        // Find nakshatra (0-26)
        const nakshatraIndex = Math.floor(normLong / 13.3333333);
        const nakshatraLord = NAKSHATRA_LORDS[nakshatraIndex];
        
        // Degree within nakshatra (0-13.333...)
        const degreeInNakshatra = normLong % 13.3333333;
        
        // Get sub divisions for this nakshatra
        const subDivisions = KP_SUB_DIVISIONS[nakshatraIndex];
        
        // Find which sub this degree falls in
        let subLord = null;
        let subStart = 0;
        let subEnd = 0;
        
        for (const sub of subDivisions) {
            if (degreeInNakshatra >= sub.startDegree && degreeInNakshatra < sub.endDegree) {
                subLord = sub.lord;
                subStart = sub.startDegree;
                subEnd = sub.endDegree;
                break;
            }
        }
        
        // Fallback to last sub if exactly at end (rare edge case)
        if (!subLord) {
            const lastSub = subDivisions[subDivisions.length - 1];
            subLord = lastSub.lord;
            subStart = lastSub.startDegree;
            subEnd = lastSub.endDegree;
        }
        
        return {
            subLord,
            nakshatra: nakshatraIndex + 1, // 1-27
            nakshatraLord,
            degreeInNak: degreeInNakshatra,
            subStart,
            subEnd,
            longitude: normLong
        };
    }
    
    /**
     * Check if an event is promised in the chart using Cuspal Sub-Lord Method (KP Standard)
     * 
     * Per KP rules:
     * 1. If cuspal sub-lord signifies the event's house group → Event is PROMISED
     * 2. If cuspal sub-lord signifies detrimental houses only → Event is DENIED  
     * 3. If both → Event will happen but with obstacles
     * 
     * @param {object} eventType - Event type from EVENT_TYPES
     * @param {Array} cusps - Array of cusp longitudes [cusp1Long, cusp2Long, ...]
     * @returns {object} {promised, strength, reason, subLord, significations}
     */
    checkEventPromise(eventType, cusps) {
        // Get primary house for this event (first in the house group)
        const primaryHouse = eventType.houses[0];
        const cuspLongitude = cusps[primaryHouse - 1]; // 0-indexed
        
        // Calculate sub-lord of the cusp
        const subLordData = this.calculateSubLord(cuspLongitude);
        const subLord = subLordData.subLord;
        
        // Get significations of the sub-lord
        const subLordSigs = this.houseSignificators[subLord] || new Set();
        
        // Required houses for this event
        const requiredHouses = new Set(eventType.houses);
        
        // Detrimental houses (12th from required houses)
        const detrimentalHouses = new Set();
        eventType.houses.forEach(h => {
            const detrimental = (h % 12) + 1; // 12th from house
            detrimentalHouses.add(detrimental);
        });
        
        // Check what the sub-lord signifies
        const signifiesRequired = Array.from(requiredHouses).filter(h => subLordSigs.has(h));
        const signifiesDetrimental = Array.from(detrimentalHouses).filter(h => subLordSigs.has(h));
        
        let promised = false;
        let strength = 0;
        let reason = "";
        
        if (signifiesRequired.length > 0 && signifiesDetrimental.length === 0) {
            // Pure promise
            promised = true;
            strength = (signifiesRequired.length / requiredHouses.size) * 100;
            reason = `Sub-lord ${subLord} signifies favorable houses ${signifiesRequired.join(', ')}`;
        } else if (signifiesDetrimental.length > 0 && signifiesRequired.length === 0) {
            // Denied
            promised = false;
            strength = 0;
            reason = `Sub-lord ${subLord} signifies only detrimental houses ${signifiesDetrimental.join(', ')}`;
        } else if (signifiesRequired.length > 0 && signifiesDetrimental.length > 0) {
            // Mixed - event happens with obstacles
            promised = true;
            strength = (signifiesRequired.length / requiredHouses.size) * 60; // Reduced strength
            reason = `Sub-lord ${subLord} signifies both favorable and detrimental houses - obstacles expected`;
        } else {
            // Sub-lord doesn't signify relevant houses
            promised = false;
            strength = 0;
            reason = `Sub-lord ${subLord} doesn't signify event-related houses`;
        }
        
        return {
            promised,
            strength: Math.round(strength),
            reason,
            subLord,
            subLordData,
            primaryHouse,
            cuspLongitude,
            significations: {
                required: signifiesRequired,
                detrimental: signifiesDetrimental,
                all: Array.from(subLordSigs)
            }
        };
    }

    // --- EVENT PROBABILITY CALCULATION ---
    
    /**
     * Calculate probability score for an event type on a given date
     * @param {object} eventType - Event type from EVENT_TYPES
     * @param {object} dashaData - Deep dasha for the date
     * @param {object} transitData - Transit planetary data (optional, for advanced scoring)
     * @returns {object} {score, contributors}
     */
    calculateEventProbability(eventType, dashaData, transitData = null) {
        const requiredHouses = new Set(eventType.houses);
        let score = 0;
        let contributors = [];
        
        // Weight distribution for dasha levels (KP standard: Mahadasha is most important)
        const dashaWeights = {
            mahadasha: 40,      // Most influential
            antardasha: 30,     // Second most
            pratyantar: 20,     // Daily variations
            sookshma: 10        // Hourly/fine timing
        };
        
        // Strength multipliers based on KP significator levels
        // Level 1 (Star Lord occupancy) is 2x stronger than Level 4 (Planet ownership)
        const levelWeights = {
            1: 1.5,   // Strongest - Star Lord's occupancy
            2: 1.2,   // Planet's own occupancy
            3: 1.0,   // Star Lord's ownership
            4: 0.8    // Weakest - Planet's own ownership
        };
        
        // Check each dasha level's signification with KP strength grading
        const dashaLords = [
            { level: "mahadasha", lord: dashaData.mahadasha },
            { level: "antardasha", lord: dashaData.antardasha },
            { level: "pratyantar", lord: dashaData.pratyantar },
            { level: "sookshma", lord: dashaData.sookshma }
        ];
        
        dashaLords.forEach(({ level, lord }) => {
            const signifiedHouses = this.houseSignificators[lord] || new Set();
            
            // Count how many required houses this lord signifies, weighted by KP strength
            let weightedMatchScore = 0;
            let matched = [];
            
            requiredHouses.forEach(h => {
                if (signifiedHouses.has(h)) {
                    const sigLevel = this.getSignificatorLevel(lord, h);
                    const strengthWeight = levelWeights[sigLevel] || 1.0;
                    
                    weightedMatchScore += strengthWeight;
                    matched.push({ house: h, level: sigLevel });
                }
            });
            
            // Proportional score for this dasha level
            if (weightedMatchScore > 0) {
                // Maximum possible weighted score (all houses at Level 1 strength)
                const maxPossibleScore = requiredHouses.size * levelWeights[1];
                const matchRatio = weightedMatchScore / maxPossibleScore;
                const points = dashaWeights[level] * matchRatio;
                score += points;
                
                contributors.push({
                    level: level,
                    lord: lord,
                    matched: matched.map(m => `H${m.house}(L${m.level})`),
                    points: points.toFixed(1)
                });
            }
        });
        
        // Bonus: If all dasha lords signify at least one required house (KP synergy)
        const allMatch = dashaLords.every(({ lord }) => {
            const sig = this.houseSignificators[lord] || new Set();
            return Array.from(requiredHouses).some(h => sig.has(h));
        });
        
        if (allMatch) {
            const bonus = score * 0.2; // 20% synergy bonus
            score = Math.min(100, score + bonus);
            contributors.push({ 
                level: "synergy", 
                lord: "All Lords", 
                matched: ["All dasha lords connect"], 
                points: bonus.toFixed(1) 
            });
        }
        
        // Transit boost (if transit data provided) - KP uses transit for fine timing
        if (transitData && transitData.planets) {
            const transitMoon = transitData.planets.find(p => p.name === "Moon");
            if (transitMoon && transitMoon.nakshatraId !== undefined) {
                const moonStarLord = NAKSHATRA_LORDS[transitMoon.nakshatraId];
                const moonSig = this.houseSignificators[moonStarLord] || new Set();
                const moonMatch = Array.from(requiredHouses).filter(h => moonSig.has(h));
                if (moonMatch.length > 0) {
                    const transitBonus = 5; // Transit Moon trigger
                    score = Math.min(100, score + transitBonus);
                    contributors.push({ 
                        level: "transit", 
                        lord: `Moon→${moonStarLord}`, 
                        matched: moonMatch.map(h => `H${h}`), 
                        points: transitBonus.toFixed(1) 
                    });
                }
            }
        }
        
        return {
            score: Math.round(Math.max(0, Math.min(100, score))),
            contributors: contributors
        };
    }

    // --- CALENDAR GENERATION ---
    
    /**
     * Generate day-wise event calendar
     * @param {number} moonLongitude - Natal Moon longitude
     * @param {string} birthDateStr - Birth date string
     * @param {object} natalPlanets - Natal planet data
     * @param {Date} startDate - Calendar start
     * @param {number} days - Number of days to generate
     * @param {Array} selectedEventTypes - Event type IDs to include (or null for all)
     * @returns {Array} Array of {date, events: [{type, score, dasha}]}
     */
    generateCalendar(moonLongitude, birthDateStr, natalPlanets, natalKPCusps, startDate, days, selectedEventTypes = null) {
        // Build significations if not already done
        if (Object.keys(this.houseSignificators).length === 0) {
            this.buildHouseSignificators(natalPlanets, natalKPCusps);
        }
        
        const eventTypesToUse = selectedEventTypes 
            ? EVENT_TYPES.filter(e => selectedEventTypes.includes(e.id))
            : EVENT_TYPES;
        
        const calendar = [];
        
        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Get dasha for this date
            const dasha = this.calculateDeepDasha(moonLongitude, birthDateStr, currentDate);
            
            // Calculate probability for each event type
            const events = eventTypesToUse.map(eventType => {
                const result = this.calculateEventProbability(eventType, dasha);
                return {
                    type: eventType.id,
                    name: eventType.name,
                    icon: eventType.icon,
                    score: result.score,
                    contributors: result.contributors,
                    isNegative: eventType.isNegative || false
                };
            });
            
            calendar.push({
                date: currentDate.toISOString().split('T')[0],
                dateObj: currentDate,
                dasha: dasha,
                events: events,
                // Pre-calculate max score for quick filtering
                maxScore: Math.max(...events.map(e => e.score)),
                // Dominant event (highest scoring)
                dominant: events.reduce((a, b) => a.score > b.score ? a : b)
            });
        }
        
        return calendar;
    }

    // --- STATIC ACCESSORS ---
    
    static getEventTypes() {
        return EVENT_TYPES;
    }
    
    static getEventById(id) {
        return EVENT_TYPES.find(e => e.id === id);
    }
}

// Export singleton and types
const kpEventEngine = new KPEventEngine();
export { EVENT_TYPES };
export default kpEventEngine;
