
import gzip
import json

try:
    with gzip.open('indian_locations.json.gz', 'rb') as f:
        data = json.load(f)
    
    # Data is list of lists: [Name, Lat, Lng, Tz]
    # Check for short alphanumeric names starting with digit or just looking like garbage
    garbage = [x for x in data if x[0] in ["1a", "1b", "1c", "2a"] or (len(x[0]) < 3 and x[0][0].isdigit())]
    for item in garbage:
        print(f"Found Garbage? : {item}")
        
    # Also just print simple ones
    print("--- Searching '1a' ---")
    found_1a = [x for x in data if "1a" == x[0]]
    print(found_1a)
        
except Exception as e:
    print(f"Error: {e}")
