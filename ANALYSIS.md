# Analysis of Significator Mismatch

## Birth Data
- Female, 2000-12-14, 18:10, Hubli
- Ascendant: Gemini (signId=2) at 61.94°

## Planetary Positions & Star Lords

| Planet | Sign (SignId) | House | Nakshatra | Star Lord |
|--------|---------------|-------|-----------|-----------|
| **Ascendant** | Gemini (2) | H1 |  Mrigashira (4) | Mars |
| **Sun** | Scorpio (7) | H6 | Jyeshtha (17) | Mercury |
| **Moon** | Cancer (3) | H2 | Pushya (7) | Saturn |
| **Mars** | Libra (6) | H5 | Chitra (13) | Mars |
| **Mercury** | Scorpio (7) | H6 | Jyeshtha (17) | Mercury |
| **Jupiter** | Taurus (1) | H12 | Rohini (3) | Moon |
| **Venus** | Capricorn (9) | H8 | Shravana (21) | Moon |
| **Saturn** | Taurus (1) | H12 | Krittika (2) | Sun |
| **Rahu** | Gemini (2) | H1 | Punarvasu (6) | Jupiter |
| **Ketu** | Sagittarius (8) | H7 | Purva Ashadha (19) | Venus |

## House Mapping from Ascendant (Gemini=2)
- House 1 = Gemini (signId 2)
- House 2 = Cancer (signId 3)
- House 3 = Leo (signId 4)
- House 4 = Virgo (signId 5)
- House 5 = Libra (signId 6)
- House 6 = Scorpio (signId 7)
- House 7 = Sagittarius (signId 8)
- House 8 = Capricorn (signId 9)
- House 9 = Aquarius (signId 10)
- House 10 = Pisces (signId 11)
- House 11 = Aries (signId 0)
- House 12 = Taurus (signId 1)

## Sign Ownership
- Aries (H11): Mars
- Taurus (H12): Venus
- Gemini (H1): Mercury
- Cancer (H2): Moon
- Leo (H3): Sun
- Virgo (H4): Mercury
- Libra (H5): Venus
- Scorpio (H6): Mars
- Sagittarius (H7): Jupiter
- Capricorn (H8): Saturn
- Aquarius (H9): Saturn
- Pisces (H10): Jupiter

## TEST: Sun Significators

**Reference:** L1=[6], L2=[6], L3=[1,2,5], L4=[4]

**Our Calculation:**
- Sun is in House 6 (Scorpio)
- Sun's star lord: Mercury
- Mercury is in House 6 (Scorpio)

L1: Mercury's occupancy = House 6 ✓
L2: Sun's occupancy = House 6 ✓  
L3: Mercury's ownership = Gemini (H1), Virgo (H4) = [1, 4]  
        But reference shows [1,2,5]... ❌
L4: Sun's ownership = Leo (H3) = [3]
        But reference shows [4]... ❌

**PROBLEM IDENTIFIED!**

L3 and L4 don't match. Let me check if reference is using a DIFFERENT house system or if there's an error in our logic...

Actually wait - I suspect the reference might be using BHAVA (cusp-based houses) instead of equal houses!

Looking at cusps:
- Cusp 1: 61.94° (Gemini)
- Cusp 2: 87.24° (Gemini)
- Cusp 3: 113.77° (Cancer)
- Cusp 4: 143.76° (Leo)
- Cusp 5: 177.10° (Virgo)
- Cusp 6: 210.71° (Scorpio)
- Cusp 7: 241.94° (Sagittarius)
- Cusp 8: 267.24° (Sagittarius)
- Cusp 9: 293.77° (Capricorn)
- Cusp 10: 323.76° (Aquarius)
- Cusp 11: 357.10° (Pisces)
- Cusp 12: 30.71° (Taurus)

If KP uses cusp-based bhava:
- **Sun at 238.97°** is between Cusp 6 (210.71°) and Cusp 7 (241.94°) = **Bhava 6** ✓

But for ownership... KP still us sign lords, not bhava lords!

**WAIT - I think I found it!**

The issue might be that KP uses **BHAVA positions for occupancy** (houses based on cusps, not equal signs) but **SIGN ownership** for lordship!

Let me recalculate using bhavas:

Sun (238.97°) is between Cusp 6 (210.71°) and Cusp 7 (241.94°) → Bhava 6 ✓
Mercury (232.72°) is between Cusp 6 (210.71°) and Cusp 7 (241.94°) → Bhava 6 ✓
Moon (102.61°) is between Cusp 2 (87.24°) and Cusp 3 (113.77°) → Bhava 2 ✓

This matches! The issue is we're using SIGN-based houses instead of CUSP-based bhavas!
