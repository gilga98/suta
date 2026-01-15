
import json

with open('raw_world_cities.json', 'r') as f:
    data = json.load(f)

india_cities = [c for c in data if c['country'] == 'IN']

print(f"Total Indian Cities: {len(india_cities)}")

# Group by admin1
admin_map = {}
for c in india_cities:
    code = c['admin1']
    if code not in admin_map:
        admin_map[code] = []
    if len(admin_map[code]) < 3:
        admin_map[code].append(c['name'])
    
    
    if "tumkur" in c['name'].lower() or "tumakuru" in c['name'].lower():
        print(f"Tumkur Found: {c['name']} (Code {code})")
        
print("--- Admin1 Code Samples ---")
for code in sorted(admin_map.keys()):
    print(f"Code: {code} -> Cities: {admin_map[code]}")
