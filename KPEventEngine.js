/**
 * KPEventEngine.js
 * 
 * KP Astrology Event Probability Calculator
 * Uses house signification groupings to predict event likelihood
 * 
 * FEATURES:
 * - Deep Dasha calculation: Mahadasha → Antardasha → Pratyantar → Sookshma
 * - Event type house groupings (Marriage, Career, Health, etc.)
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
        houses: [3, 9],
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
        houses: [4, 9],
        description: "4=Foundational education, 9=Higher learning"
    },
    {
        id: "property",
        name: "Property / Real Estate",
        icon: "🏠",
        houses: [4, 11],
        description: "4=Land, Home, 11=Gains"
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
        houses: [6, 7, 12],
        description: "6=Disputes, 7=Opponents, 12=Losses",
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

    // --- HOUSE SIGNIFICATION ---
    
    /**
     * Build planet-to-house signification map from natal KP data
     * A planet signifies houses through:
     * 1. The house it's placed in (occupancy)
     * 2. The houses it rules (ownership)
     * 3. KP Star-Lord and Sub-Lord connections
     */
    buildHouseSignificators(natalPlanets, natalKPCusps) {
        this.houseSignificators = {};
        
        // Initialize for all planets
        const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
        planetNames.forEach(p => {
            this.houseSignificators[p] = new Set();
        });
        
        // Get Ascendant for house calculation
        const asc = natalPlanets.find(p => p.name === "Ascendant");
        if (!asc) return;
        const ascSignId = asc.signId;
        
        // 1. Occupancy: Planet's house position
        natalPlanets.forEach(planet => {
            if (planet.name === "Ascendant") return;
            
            const houseNum = ((planet.signId - ascSignId + 12) % 12) + 1;
            this.houseSignificators[planet.name].add(houseNum);
        });
        
        // 2. Ownership: Which houses does each planet rule?
        const signToHouse = {};
        for (let i = 0; i < 12; i++) {
            const signId = (ascSignId + i) % 12;
            const rashis = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
                           "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
            const signName = rashis[signId];
            const lord = PLANET_LORDS[signName];
            const houseNum = i + 1;
            
            if (!signToHouse[lord]) signToHouse[lord] = [];
            signToHouse[lord].push(houseNum);
        }
        
        Object.keys(signToHouse).forEach(lord => {
            signToHouse[lord].forEach(h => {
                if (this.houseSignificators[lord]) {
                    this.houseSignificators[lord].add(h);
                }
            });
        });
        
        // 3. Star-Lord connection (KP): Planet signifies houses of its Star-Lord
        natalPlanets.forEach(planet => {
            if (planet.name === "Ascendant" || !planet.nakshatraId) return;
            const starLord = NAKSHATRA_LORDS[planet.nakshatraId];
            
            // Add Star-Lord's significations to this planet
            if (this.houseSignificators[starLord]) {
                this.houseSignificators[starLord].forEach(h => {
                    this.houseSignificators[planet.name].add(h);
                });
            }
        });
        
        return this.houseSignificators;
    }

    // --- EVENT PROBABILITY CALCULATION ---
    
    /**
     * Calculate probability score for an event type on a given date
     * @param {object} eventType - Event type from EVENT_TYPES
     * @param {object} dashaData - Deep dasha for the date
     * @param {object} transitData - Transit planetary data (optional, for advanced scoring)
     * @returns {number} Score 0-100
     */
    calculateEventProbability(eventType, dashaData, transitData = null) {
        const requiredHouses = new Set(eventType.houses);
        let score = 0;
        let maxScore = 100;
        
        // Weight distribution for dasha levels
        const weights = {
            mahadasha: 35,      // Most influential
            antardasha: 30,     // Second most
            pratyantar: 20,     // Daily variations
            sookshma: 15        // Hourly/fine timing
        };
        
        // Check each dasha level's signification
        const dashaLords = [
            { level: "mahadasha", lord: dashaData.mahadasha },
            { level: "antardasha", lord: dashaData.antardasha },
            { level: "pratyantar", lord: dashaData.pratyantar },
            { level: "sookshma", lord: dashaData.sookshma }
        ];
        
        dashaLords.forEach(({ level, lord }) => {
            const signifiedHouses = this.houseSignificators[lord] || new Set();
            
            // Count how many required houses this lord signifies
            let matchCount = 0;
            requiredHouses.forEach(h => {
                if (signifiedHouses.has(h)) matchCount++;
            });
            
            // Proportional score for this level
            const matchRatio = matchCount / requiredHouses.size;
            score += weights[level] * matchRatio;
        });
        
        // Bonus: If all dasha lords signify at least one required house
        const allMatch = dashaLords.every(({ lord }) => {
            const sig = this.houseSignificators[lord] || new Set();
            return Array.from(requiredHouses).some(h => sig.has(h));
        });
        if (allMatch) score = Math.min(100, score * 1.15); // 15% bonus
        
        // Transit boost (if transit data provided)
        if (transitData && transitData.planets) {
            const transitMoon = transitData.planets.find(p => p.name === "Moon");
            if (transitMoon) {
                const moonStarLord = NAKSHATRA_LORDS[transitMoon.nakshatraId];
                const moonSig = this.houseSignificators[moonStarLord] || new Set();
                const moonMatch = Array.from(requiredHouses).some(h => moonSig.has(h));
                if (moonMatch) score = Math.min(100, score + 5); // Transit Moon trigger
            }
        }
        
        return Math.round(Math.max(0, Math.min(100, score)));
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
            const events = eventTypesToUse.map(eventType => ({
                type: eventType.id,
                name: eventType.name,
                icon: eventType.icon,
                score: this.calculateEventProbability(eventType, dasha),
                isNegative: eventType.isNegative || false
            }));
            
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
