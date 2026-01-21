/**
 * VedicAstroEngine.js
 * 
 * A reusable module for high-precision Vedic Astrology calculations using Swiss Ephemeris.
 * 
 * FEATURES:
 * - Encapsulates checking/loading initialization of WASM.
 * - Defaults to "True Chitrapaksha" Ayanamsa (Mode 27).
 * - Defaults to "True Geometric" positions (No Aberration/Light deviation).
 * - Implements manual UTC conversion for precision.
 * - UPDATED: Supports custom House Systems (Placidus for KP, etc).
 */

import Swisseph from './swisseph.js';

// --- CONSTANTS ---
const RASHIS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const TITHIS = ["Prathama", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shasthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"];
const YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Sobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const KARANA_MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];

class SwissEphWrapper {
    constructor(module) {
        this.module = module;
        this.SE_GREG_CAL = 1;
        this.SE_SUN = 0;
        this.SE_MOON = 1;
        this.SE_MERCURY = 2;
        this.SE_VENUS = 3;
        this.SE_MARS = 4;
        this.SE_JUPITER = 5;
        this.SE_SATURN = 6;
        this.SE_URANUS = 7;
        this.SE_NEPTUNE = 8;
        this.SE_PLUTO = 9;
        this.SE_MEAN_NODE = 10;
        this.SE_TRUE_NODE = 11;
        
        this.SEFLG_SIDEREAL = 64 * 1024;
        this.SEFLG_SPEED = 256;
        this.SEFLG_SWIEPH = 2;
        this.SEFLG_TRUEPOS = 16;
    }

    swe_julday(year, month, day, hour, gregflag) {
        return this.module._swe_julday(year, month, day, hour, gregflag);
    }

    swe_set_sid_mode(sid_mode, t0, ayan_t0) {
        this.module._swe_set_sid_mode(sid_mode, t0, ayan_t0);
    }

    swe_get_ayanamsa_ut(tjd) {
        return this.module._swe_get_ayanamsa_ut(tjd);
    }

    swe_calc_ut(tjd, ipl, iflag) {
        const ptr_xx = this.module._malloc(6 * 8); 
        const ptr_serr = this.module._malloc(256);
        const ret = this.module._swe_calc_ut(tjd, ipl, iflag, ptr_xx, ptr_serr);
        const xx = new Float64Array(this.module.HEAPF64.buffer, ptr_xx, 6);
        const result = {
            longitude: xx[0],
            latitude: xx[1],
            distance: xx[2],
            speedLong: xx[3],
            speedLat: xx[4],
            speedDist: xx[5],
            rc: ret
        };
        this.module._free(ptr_xx);
        this.module._free(ptr_serr);
        return result;
    }

    swe_houses(tjd, lat, lon, hsysCharCode) {
        const ptr_hcusps = this.module._malloc(13 * 8);
        const ptr_ascmc = this.module._malloc(10 * 8);
        const ret = this.module._swe_houses(tjd, lat, lon, hsysCharCode, ptr_hcusps, ptr_ascmc);
        const ascmc = new Float64Array(this.module.HEAPF64.buffer, ptr_ascmc, 10);
        const hcusps = new Float64Array(this.module.HEAPF64.buffer, ptr_hcusps, 13);
        const result = {
            ascendant: ascmc[0],
            mc: ascmc[1],
            houses: Array.from(hcusps) 
        };
        this.module._free(ptr_hcusps);
        this.module._free(ptr_ascmc);
        return result;
    }
}

class VedicAstroEngine {
    constructor() {
        this.swe = null;
        this.isReady = false;
    }

    async init(wasmPath) {
        if (this.isReady) return;
        try {
            const module = await Swisseph({
                locateFile: (path) => {
                    if (path.endsWith('.wasm') && wasmPath) return wasmPath;
                    return path;
                }
            });
            this.swe = new SwissEphWrapper(module);
            this.isReady = true;
            console.log("VedicAstroEngine: Initialized successfully.");
        } catch (e) {
            console.error("VedicAstroEngine: Initialization failed.", e);
            throw e;
        }
    }

    /**
     * @param options.houseSystem 'P' (Placidus), 'O' (Porphyry), 'E' (Equal), 'W' (Whole Sign)
     */
    calculate(dateStr, timeStr, tzOffset, lat, lng, options = {}) {
        if (!this.isReady) throw new Error("Engine not initialized. Call init() first.");

        const ayanamsaMode = options.ayanamsaMode !== undefined ? options.ayanamsaMode : 27; 
        const calcModeFlag = options.calcModeFlag !== undefined ? options.calcModeFlag : 16; 
        // Default to Placidus if not specified, commonly used in KP and defaults
        const houseSystem = options.houseSystem || 'P'; 

        // 1. Time Conversion
        const [y, m, d] = dateStr.split('-').map(Number);
        const [h, min, s = 0] = timeStr.split(':').map(Number);
        
        // Manual UT calculation
        let totalHour = h + (min / 60.0) + (s / 3600.0);
        let utHour = totalHour - tzOffset;
        
        const utcDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
        const msToAdd = utHour * 3600 * 1000;
        utcDate.setTime(utcDate.getTime() + msToAdd);
        
        const year = utcDate.getUTCFullYear();
        const month = utcDate.getUTCMonth() + 1;
        const day = utcDate.getUTCDate();
        const hour = utcDate.getUTCHours() + utcDate.getUTCMinutes()/60 + utcDate.getUTCSeconds()/3600;

        // 2. Julian Day
        const jd_ut = this.swe.swe_julday(year, month, day, hour, this.swe.SE_GREG_CAL);

        // 3. Ayanamsa
        this.swe.swe_set_sid_mode(ayanamsaMode, 0, 0);
        const ayanamsaVal = this.swe.swe_get_ayanamsa_ut(jd_ut);

        // 4. Planets
        let flags = this.swe.SEFLG_SIDEREAL | this.swe.SEFLG_SPEED | this.swe.SEFLG_SWIEPH;
        if (calcModeFlag > 0) flags |= calcModeFlag;

        const planetIds = [
            { id: this.swe.SE_SUN, name: "Sun" },
            { id: this.swe.SE_MOON, name: "Moon" },
            { id: this.swe.SE_MARS, name: "Mars" },
            { id: this.swe.SE_MERCURY, name: "Mercury" },
            { id: this.swe.SE_JUPITER, name: "Jupiter" },
            { id: this.swe.SE_VENUS, name: "Venus" },
            { id: this.swe.SE_SATURN, name: "Saturn" },
            { id: this.swe.SE_MEAN_NODE, name: "Rahu" }
        ];

        let planets = [];
        let moonLong = 0, sunLong = 0;

        planetIds.forEach(p => {
            const res = this.swe.swe_calc_ut(jd_ut, p.id, flags);
            let longitude = res.longitude;

            if (p.name === "Rahu") {
                let ketuLong = (longitude + 180) % 360;
                planets.push(this._formatBody("Ketu", ketuLong, res.speedLong));
            }
            if (p.name === "Moon") moonLong = longitude;
            if (p.name === "Sun") sunLong = longitude;

            planets.push(this._formatBody(p.name, longitude, res.speedLong));
        });

        // 5. Houses (Sidereal)
        // Note: swe_houses returns Tropical by default unless configured.
        // But since we set SID_MODE above, does it apply to houses?
        // Swiss Eph docs say swe_houses needs explicit sidereal handling or it returns Tropical.
        // Actually best practice: Calc Tropical Houses -> Subtract Ayanamsa -> Normalize.
        
        this.swe.swe_set_sid_mode(0, 0, 0); // Turn off sidereal for house calc to get raw Tropical
        const housesCalc = this.swe.swe_houses(jd_ut, lat, lng, houseSystem.charCodeAt(0));
        
        // Convert to Sidereal
        housesCalc.ascendant = (housesCalc.ascendant - ayanamsaVal + 360) % 360;
        housesCalc.mc = (housesCalc.mc - ayanamsaVal + 360) % 360;
        housesCalc.houses = housesCalc.houses.map(h => {
             // Index 0 in C array often unused or 1-based, wrapper handles 13 doubles.
             // houses[1] is 1st house. houses[0] is usually 0.
             if(h === 0) return 0;
             return (h - ayanamsaVal + 360) % 360;
        });
        
        // Re-enable Ayanamsa settings for future calls if needed
        this.swe.swe_set_sid_mode(ayanamsaMode, 0, 0);

        // Add Ascendant to planets list
        planets.unshift(this._formatBody("Ascendant", housesCalc.ascendant, 0));

        // 6. Panchanga
        const panchanga = this._calcPanchanga(sunLong, moonLong, dateStr);

        return {
            meta: {
                ayanamsaValue: ayanamsaVal,
                ayanamsaMode: ayanamsaMode,
                julianDay: jd_ut,
                calcFlags: flags,
                houseSystem: houseSystem
            },
            planets: planets,
            houses: housesCalc, 
            panchanga: panchanga
        };
    }

    _formatBody(name, longitude, speed) {
        const signIndex = Math.floor(longitude / 30);
        const degreeVal = longitude % 30;
        const nakIndex = Math.floor(longitude / 13.3333333);
        
        return {
            name: name,
            longitude: longitude,
            sign: RASHIS[signIndex],
            signId: signIndex, // 0-11
            degree: degreeVal,
            dms: this.decimalToDMS(degreeVal),
            nakshatra: NAKSHATRAS[nakIndex],
            nakshatraId: nakIndex, // 0-26
            speed: speed,
            isRetrograde: speed < 0
        };
    }

    _calcPanchanga(sunLong, moonLong, dateStr) {
        let diff = (moonLong - sunLong + 360) % 360;
        let tithiIndex = Math.floor(diff / 12);
        let tithiName = TITHIS[tithiIndex % 15];
        let paksha = tithiIndex < 15 ? "Shukla" : "Krishna";

        let nakIndex = Math.floor(moonLong / 13.3333333);
        let yogaIndex = Math.floor((sunLong + moonLong) / 13.3333333) % 27;

        let karanaNum = Math.floor(diff / 6) + 1; 
        let karanaName = "";
        if (karanaNum === 1) karanaName = "Kinstughna";
        else if (karanaNum >= 58) {
            if (karanaNum === 58) karanaName = "Shakuni";
            else if (karanaNum === 59) karanaName = "Chatushpada";
            else if (karanaNum === 60) karanaName = "Naga";
        } else {
            let movableIndex = (karanaNum - 2) % 7;
            karanaName = KARANA_MOVABLE[movableIndex];
        }

        const [y, m, d] = dateStr.split('-').map(Number);
        const inputD = new Date(y, m-1, d); 
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let vara = days[inputD.getDay()];

        return {
            vara: vara,
            tithi: `${tithiName} (${paksha})`,
            nakshatra: NAKSHATRAS[nakIndex],
            yoga: YOGAS[yogaIndex],
            karana: karanaName
        };
    }

    decimalToDMS(d) {
        const deg = Math.floor(d);
        const minFloat = (d - deg) * 60;
        let min = Math.floor(minFloat);
        let sec = Math.round((minFloat - min) * 60);
        if (sec === 60) { sec = 0; min++; }
        if (min === 60) { min = 0; deg++; }
        return `${deg}° ${min}' ${sec}"`;
    }
}

const engine = new VedicAstroEngine();
export default engine;
