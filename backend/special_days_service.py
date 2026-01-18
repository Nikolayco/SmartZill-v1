import json
import os
import threading
from datetime import datetime
import pandas as pd
from typing import List, Dict, Optional

class SpecialDaysService:
    def __init__(self, data_file="special_days.json"):
        self.data_file = data_file
        self.lock = threading.Lock()
        self.config = {
            "enabled": True,
            "announcement_times": ["09:00", "14:00"],
            "template": "Bugün {name} arkadaşımızın doğum günü. Doğum gününü kutlar, sevdikleriyle mutlu, sağlıklı bir yıl dileriz."
        }
        self.people = [] # List of { name: str, date: "MM-DD" }
        self.load_data()

    def load_data(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.config = data.get("config", self.config)
                    self.people = data.get("people", [])
            except Exception as e:
                print(f"Error loading special days: {e}")

    def save_data(self):
        with self.lock:
            try:
                with open(self.data_file, 'w') as f:
                    json.dump({
                        "config": self.config,
                        "people": self.people
                    }, f, indent=4)
            except Exception as e:
                print(f"Error saving special days: {e}")

    def import_from_excel(self, file_path: str) -> int:
        """Imports people from Excel/CSV. Expected columns: Name, Date (YYYY-MM-DD or DD.MM.YYYY)"""
        try:
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            
            # Normalize columns
            df.columns = [c.strip().lower() for c in df.columns]
            
            # Look for suitable columns
            name_col = next((c for c in df.columns if 'name' in c or 'ad' in c or 'isim' in c), None)
            date_col = next((c for c in df.columns if 'date' in c or 'tarih' in c or 'gün' in c), None)
            
            if not name_col or not date_col:
                print("Columns not found. headers:", df.columns)
                return 0

            count = 0
            new_people = []
            
            for _, row in df.iterrows():
                try:
                    name = str(row[name_col]).strip()
                    raw_date = row[date_col]
                    
                    # Parse date
                    parsed_date = pd.to_datetime(raw_date, errors='coerce')
                    if pd.isna(parsed_date): continue
                    
                    # Format as YYYY-MM-DD for storage (Full Date)
                    date_str = parsed_date.strftime("%Y-%m-%d")
                    
                    new_people.append({"name": name, "date": date_str})
                    count += 1
                except Exception as ex:
                    print(f"Skipping row: {ex}")
            
            self.people.extend(new_people)
            self.save_data()
            return count
        except Exception as e:
            print(f"Import failed: {e}")
            raise e

    def get_todays_people(self) -> List[str]:
        """Returns list of names for today."""
        today = datetime.now()
        today_md = today.strftime("%m-%d")
        
        matches = []
        for p in self.people:
            # Handle both MM-DD (legacy) and YYYY-MM-DD formats
            p_date = p.get('date', '')
            if not p_date: continue
            
            # Extract MM-DD
            if len(p_date) == 5: # MM-DD
                p_md = p_date
            elif len(p_date) == 10: # YYYY-MM-DD
                p_md = p_date[5:]
            else:
                continue
                
            if p_md == today_md:
                matches.append(p['name'])
                
        return matches

    def generate_announcement_text(self, names: List[str]) -> str:
        if not names: return ""
        # If multiple people?
        # "Bugün Ahmet ve Mehmet arkadaşımızın..."
        names_str = " ve ".join(names)
        return self.config["template"].replace("{name}", names_str)

special_days_service = SpecialDaysService()
