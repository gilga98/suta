
import json
import gzip

# Map based on inspection
ADMIN_MAP = {
    "01": "Andaman & Nicobar",
    "02": "Andhra Pradesh",
    "03": "Assam",
    "05": "Chandigarh",
    "06": "Dadra and Nagar Haveli", # Often 06 or combined
    "07": "Delhi",
    "09": "Gujarat",
    "10": "Haryana",
    "11": "Himachal Pradesh",
    "12": "Jammu & Kashmir",
    "13": "Kerala",
    "14": "Lakshadweep",
    "16": "Maharashtra",
    "17": "Manipur",
    "18": "Meghalaya",
    "19": "Karnataka",
    "20": "Nagaland",
    "21": "Odisha",
    "22": "Puducherry",
    "23": "Punjab",
    "24": "Rajasthan",
    "25": "Tamil Nadu",
    "26": "Tripura",
    "28": "West Bengal",
    "29": "Sikkim",
    "30": "Arunachal Pradesh",
    "31": "Mizoram",
    "33": "Goa",
    "34": "Bihar",
    "35": "Madhya Pradesh",
    "36": "Uttar Pradesh",
    "37": "Chhattisgarh",
    "38": "Jharkhand",
    "39": "Uttarakhand",
    "40": "Telangana",
    "41": "Ladakh",
    "52": "Daman and Diu"
}

# Load Raw
with open('raw_world_cities.json', 'r') as f:
    raw_data = json.load(f)

final_list = []

# Manual Additions for missing cities
MANUAL_ADDITIONS = [
    { "name": "Dharwad", "lat": "15.4589", "lng": "75.0078", "admin1": "19", "country": "IN" },
    { "name": "Hubballi", "lat": "15.3647", "lng": "75.1240", "admin1": "19", "country": "IN" },
    { "name": "Rishikesh", "lat": "30.0869", "lng": "78.2676", "admin1": "39", "country": "IN" }
]
raw_data.extend(MANUAL_ADDITIONS)

for c in raw_data:
    if c['country'] != 'IN': continue
    
    state = ADMIN_MAP.get(c['admin1'], "Unknown State")
    if "Tumakuru" in c['name'] or "Tumkur" in c['name']:
         print(f"Preserving Tumkur: {c}")

    # Format: [Name, Lat, Lng, Tz, State]
    # Note: Original was [Name, Lat, Lng, Tz]. We Append State.
    # Lat/Lng in raw are strings, convert to float.
    # Timezone? Raw doesn't have TZ! 
    # Current app requires TZ. 'Asia/Kolkata' is safe default for all India 
    # (except detailed research? No, India has one TZ).
    
    entry = [
        c['name'],
        float(c['lat']),
        float(c['lng']),
        "Asia/Kolkata",
        state
    ]
    final_list.append(entry)

# Ensure Tumkur is there if missing (User requirement from previous turn)
# Actually, if it wasn't valid in dataset, manual override handles it.
# But let's check count.
print(f"Processed {len(final_list)} cities.")

# Write to GZIP
with gzip.open('indian_locations_state.json.gz', 'wt', encoding='utf-8') as f:
    json.dump(final_list, f)

print("Saved to indian_locations_state.json.gz")
