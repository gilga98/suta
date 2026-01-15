# Vedic Astro Engine Documentation

## Overview
`VedicAstroEngine.js` is a high-precision calculation module for Vedic Astrology (Sidereal), built on top of the Swiss Ephemeris (`swisseph.js`/WASM).

It is configured to match rigorous professional standards, specifically addressing common discrepancies found in web-based calculators (like light-time aberration and ayanamsa definitions).

## Configuration Specifications

### 1. Ayanamsa
- **Default**: `27` (True Chitrapaksha)
- **Why**: Traditional Lahiri (`1`) is a mean value. "True Chitrapaksha" aligns with the exact position of Spica (Chitra) and is increasingly the standard for high-precision software (like Jagannatha Hora).
- **Impact**: Resolves ~2 arcsecond discrepancies often seen against standard Lahiri.

### 2. Planetary Positions
- **Flag**: `SEFLG_TRUEPOS` (16)
- **Why**: Standard Swiss Ephemeris returns *Apparent* positions, which include Light-Time Aberration (the time it takes light to reach Earth). Many Vedic astrology traditions and software implementations use *True Geometric* positions (where the planet *actually* is now, not where we see it).
- **Impact**: Resolves ~40 arcsecond discrepancies in planetary longitudes (especially the Sun).

### 3. Node Calculation
- **Setting**: `SE_MEAN_NODE`
- **Why**: Mean Node is the standard for most K.P. and Traditional Vedic Systems.

### 4. Time Calculation
- **Method**: Manual UTC Conversion
- **Why**: Reliance on browser `Date` objects introduces system-level time zone artifacts. This engine manually subtracts the timezone offset (`LMT - Offset`) to derive UT, ensuring `1998-02-11 15:15:00` in IST is processed identical to `09:45:00 UT`, regardless of the user's computer timezone.

## Usage

```javascript
import engine from './VedicAstroEngine.js';

// 1. Initialize (loads WASM)
await engine.init();

// 2. Calculate
// Input: Date (YYYY-MM-DD), Time (HH:MM:SS), UTC Offset, Lat, Lng
const result = engine.calculate(
    "1998-02-11", 
    "15:15:00", 
    5.5, // Indian Standard Time
    13.5, // Latitude
    77.0  // Longitude
);

// 3. Access Data
console.log(result.meta.ayanamsaValue); // e.g. 23.830...
console.log(result.planets[0]); // Sun Data
```

## Flags Reference
- `SEFLG_SIDEREAL` (64 * 1024): Forces Sidereal mode.
- `SEFLG_SPEED` (256): Calculates planetary speed (retrograde detection).
- `SEFLG_TRUEPOS` (16): Geometric position, no aberration.
