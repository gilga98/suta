
import gzip
import json

try:
    with gzip.open('indian_locations.json.gz', 'rb') as f:
        data = json.load(f)
    
    # Inspect first 5 items to check for State info
    print("--- First 5 Items ---") 
    for i in range(5):
        print(data[i])

        
    # Also just print simple ones
    print("--- Searching '1a' ---")
    found_1a = [x for x in data if "1a" == x[0]]
    print(found_1a)
        
except Exception as e:
    print(f"Error: {e}")
