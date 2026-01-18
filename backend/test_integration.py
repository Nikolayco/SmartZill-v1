import requests
import json
import time

BASE_URL = "http://localhost:7777"

def test_status_and_boot_info():
    print("Testing /status...")
    try:
        res = requests.get(f"{BASE_URL}/status")
        res.raise_for_status()
        data = res.json()
        print(f"Status OK. Scheduler Running: {data.get('scheduler_running')}")
        print(f"Start on Boot setting: {data.get('start_on_boot')}")
        return data
    except Exception as e:
        print(f"Status check failed: {e}")
        return None

def test_change_boot_setting():
    print("\nTesting /settings/boot...")
    # Set to False
    try:
        res = requests.post(f"{BASE_URL}/settings/boot", json={"start_active": False})
        res.raise_for_status()
        print("Set boot to False: OK")
        
        # Verify
        res = requests.get(f"{BASE_URL}/status")
        data = res.json()
        if data.get('start_on_boot') is False:
            print("Verification OK: start_on_boot is False")
        else:
            print(f"Verification FAILED: start_on_boot is {data.get('start_on_boot')}")
            
        # Set back to True
        requests.post(f"{BASE_URL}/settings/boot", json={"start_active": True})
        print("Reset boot to True: OK")
        
    except Exception as e:
        print(f"Boot setting test failed: {e}")

def test_backup_download():
    print("\nTesting /backup/download...")
    try:
        res = requests.get(f"{BASE_URL}/backup/download", stream=True)
        res.raise_for_status()
        cd = res.headers.get("content-disposition", "")
        print(f"Content-Disposition: {cd}")
        
        content = res.json()
        if "schedule" in content and "config" in content:
            print("Backup content valid JSON structure: OK")
        else:
            print("Backup content invalid structure")
            
    except Exception as e:
        print(f"Backup download failed: {e}")

def test_holidays():
    print("\nTesting /settings/holidays...")
    try:
        res = requests.get(f"{BASE_URL}/settings/holidays")
        res.raise_for_status()
        data = res.json()
        holidays = data.get("upcoming_holidays", [])
        print(f"Holidays fetched: {len(holidays)} items found.")
        if len(holidays) > 0:
            print(f"First holiday: {holidays[0]['name']} on {holidays[0]['date']}")
    except Exception as e:
        print(f"Holidays fetch failed: {e}")

if __name__ == "__main__":
    time.sleep(2) # wait for server heat up
    if test_status_and_boot_info():
        test_change_boot_setting()
        test_backup_download()
        test_holidays()
    print("\nTest Sequence Complete.")
