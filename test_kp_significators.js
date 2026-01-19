/**
 * Test KP Significators against Reference Data
 * Birth Data: Female, 2000-12-14, 18:10:00, Hubli
 */

import kpEventEngine from './KPEventEngine.js';

// Actual planetary data from VedicAstroEngine
const testNatalData = {
    planets: [
        { name: "Ascendant", longitude: 61.93967623192282, signId: 2, nakshatraId: 4 },
        { name: "Sun", longitude: 238.9742740947627, signId: 7, nakshatraId: 17 },
        { name: "Moon", longitude: 102.61399211366938, signId: 3, nakshatraId: 7 },
        { name: "Mars", longitude: 180.7372162146417, signId: 6, nakshatraId: 13 },
        { name: "Mercury", longitude: 232.7154057836793, signId: 7, nakshatraId: 17 },
        { name: "Jupiter", longitude: 40.12117327048263, signId: 1, nakshatraId: 3 },
        { name: "Venus", longitude: 283.3061570433386, signId: 9, nakshatraId: 21 },
        { name: "Saturn", longitude: 31.70201833721419, signId: 1, nakshatraId: 2 },
        { name: "Ketu", longitude: 262.74473173138233, signId: 8, nakshatraId: 19 },
        { name: "Rahu", longitude: 82.74473173138232, signId: 2, nakshatraId: 6 }
    ]
};

// Reference Significators from KP App
const expectedResults = {
    "Sun": { L1: [6], L2: [6], L3: [1,2,5], L4: [4] },
    "Moon": { L1: [12], L2: [2], L3: [9,10], L4: [3] },
    "Mars": { L1: [5], L2: [5], L3: [6], L4: [6] },
    "Mercury": { L1: [6], L2: [6], L3: [1,2,5], L4: [1,2,5] },
    "Jupiter": { L1: [2], L2: [12], L3: [3], L4: [7,8,11] },
    "Venus": { L1: [2], L2: [8], L3: [3], L4: [12] },
    "Saturn": { L1: [6], L2: [12], L3: [4], L4: [9,10] },
    "Rahu": { L1: [12], L2: [1], L3: [7,8,11], L4: [] },
    "Ketu": { L1: [8], L2: [7], L3: [12], L4: [] }
};

function testSignificators() {
    console.log("=== KP Significator Test ===\n");
    console.log("Birth: Female, 2000-12-14, 18:10, Hubli");
    console.log("Ascendant: Gemini (signId=2)\n");
    
    // Build significators
    kpEventEngine.buildHouseSignificators(testNatalData.planets, []);
    
    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    let allMatch = true;
    
    planets.forEach(planet => {
        const actual = kpEventEngine.significatorLevels[planet];
        const expected = expectedResults[planet];
        
        console.log(`\n${planet}:`);
        console.log(`  Expected: L1=${JSON.stringify(expected.L1)}, L2=${JSON.stringify(expected.L2)}, L3=${JSON.stringify(expected.L3)}, L4=${JSON.stringify(expected.L4)}`);
        console.log(`  Actual:   L1=${JSON.stringify(actual?.level1 || [])}, L2=${JSON.stringify(actual?.level2 || [])}, L3=${JSON.stringify(actual?.level3 || [])}, L4=${JSON.stringify(actual?.level4 || [])}`);
        
        if (!actual) {
            console.log(`  ❌ ERROR: No significator data found`);
            allMatch = false;
            return;
        }
        
        const l1Match = JSON.stringify([...expected.L1].sort()) === JSON.stringify([...actual.level1].sort());
        const l2Match = JSON.stringify([...expected.L2].sort()) === JSON.stringify([...actual.level2].sort());
        const l3Match = JSON.stringify([...expected.L3].sort()) === JSON.stringify([...actual.level3].sort());
        const l4Match = JSON.stringify([...expected.L4].sort()) === JSON.stringify([...actual.level4].sort());
        
        if (l1Match && l2Match && l3Match && l4Match) {
            console.log(`  ✅ PERFECT MATCH`);
        } else {
            console.log(`  ❌ MISMATCH:`);
            if (!l1Match) console.log(`     L1: Expected ${JSON.stringify(expected.L1)} got ${JSON.stringify(actual.level1)}`);
            if (!l2Match) console.log(`     L2: Expected ${JSON.stringify(expected.L2)} got ${JSON.stringify(actual.level2)}`);
            if (!l3Match) console.log(`     L3: Expected ${JSON.stringify(expected.L3)} got ${JSON.stringify(actual.level3)}`);
            if (!l4Match) console.log(`     L4: Expected ${JSON.stringify(expected.L4)} got ${JSON.stringify(actual.level4)}`);
            allMatch = false;
        }
    });
    
    console.log(`\n${'='.repeat(50)}`);
    if (allMatch) {
        console.log("✅ ALL SIGNIFICATORS MATCH REFERENCE!");
    } else {
        console.log("❌ SOME SIGNIFICATORS DON'T MATCH");
        console.log("Check implementation logic");
    }
}

testSignificators();
