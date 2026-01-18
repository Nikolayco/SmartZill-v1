import time
import threading
import random
import os
import json
from datetime import datetime
from audio_engine import audio_engine
import holidays
from gtts import gTTS
import vlc

import sys

# Import special days service for birthday announcements
try:
    from special_days_service import special_days_service
except ImportError:
    special_days_service = None
    print("Warning: special_days_service not available")

class SchedulerService:
    def __init__(self):
        self.running = False # Start as Stopped, explicit start() required
        self.start_on_boot = True # Default to True
        # Advanced 7-day schedule structure
        self.schedule = self._get_default_schedule()
        self.current_state = "IDLE"
        self.manual_override_active = False # Manual Override Flag
        self.next_event_name = "Yok"
        self.next_event_time = ""
        self.company_name = "NikolayCo SmartZill" # Default name
        self.restore_manual_playback = False # Default
        
        # Paths
        self.music_dir = "audio"
        self.announcement_dir = "announcements"
        self.bell_dir = "bells"
        self.config_file = "config.json"
        self.schedule_file = "schedule.json"
        
        self.last_minute_checked = ""
        
        # Radio Settings
        self.radio_stations = [
            {"name": "Power Türk", "url": "https://live.powerapp.com.tr/powerturk/mpeg/icecast.audio?/;stream.mp3"},
            {"name": "Slow Time", "url": "https://moondigitaledge.radyotvonline.net/slowtime/playlist.m3u8"},
            {"name": "Efsane 4'lü", "url": "https://ssl4.radyotvonline.com/radyohome/3baba.stream_aac/playlist.m3u8"},
            {"name": "Show Radyo", "url": "https://showradyo.radyotvonline.net/showradyoaac?/;stream.mp3"},
            {"name": "Radyo Alaturka", "url": "https://yayin.jumboserver.net:9100/stream?/;stream.mp3"},
            {"name": "Turkuvaz Radyo", "url": "https://trkvz-radyolar.ercdn.net/radyoturkuvaz/playlist.m3u8"},
            {"name": "Alem FM", "url": "https://turkmedya.radyotvonline.com/turkmedya/alemfm.stream/playlist.m3u8"},
            {"name": "Radyo Viva", "url": "https://radyoviva.radyotvonline.net/radyovivaaac.m3u8"}
        ]
        self.radio_url = self.radio_stations[0]["url"] # Default to Power Turk
        self.music_source = "local" # 'local' or 'radio'
        
        # Volume Settings
        self.volume_bell = 100
        self.volume_music = 25
        self.volume_manual = 50
        self.volume_system = 100
        
        self.volume = 100 # Legacy/Current volume placeholder

        # Holiday Settings
        self.holiday_country = "TR"  # Default: Turkey
        try:
            self.tr_holidays = holidays.country_holidays(self.holiday_country, years=datetime.now().year)
            # Default: Skip ALL holidays
            self.skipped_holidays = [d.isoformat() for d in self.tr_holidays.keys()]
        except Exception as e:
            print(f"Warning: Could not load holidays (no internet?): {e}")
            self.tr_holidays = {}
            self.skipped_holidays = []
        
        # New Settings
        self.streaming_enabled = False
        self.streaming_port = 5959
        self.app_autostart_enabled = False
        self.smart_start = True # Smart Start: Apply schedule immediately on boot
        self.tts_engine = "edge-tr-emel" # Default to High Quality Female Voice
        self.frontend_auto_open = True # Default to Auto-Open Browser

            
        self._load_config()
        self._load_schedule()
        
        # Cleanup old temporary TTS files
        threading.Thread(target=self._cleanup_old_tts, daemon=True).start()

    def _get_default_schedule(self):
        # Return empty structure for 7 days
        # Mon-Sat enabled (0-5), Sun(6) disabled
        # Return the specific default schedule requested
        return [
    {
      "dayOfWeek": 0,
      "enabled": False,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "15:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_4_1768235605",
          "name": "4. Aktivite",
          "startTime": "15:15",
          "startSoundId": "default",
          "endTime": "17:30",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241528616",
              "time": "15:25",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241575209",
              "time": "17:15",
              "soundId": "Daha huzurlu bir ortam için lütfen çalışma alanlarımızı düzenli tutalım. Gösterdiğiniz özen için teşekkür ederiz.mp3",
              "enabled": True
            }
          ]
        }
      ]
    },
    {
      "dayOfWeek": 1,
      "enabled": True,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "15:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_4_1768235605",
          "name": "4. Aktivite",
          "startTime": "15:15",
          "startSoundId": "default",
          "endTime": "17:30",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241528616",
              "time": "15:25",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241575209",
              "time": "17:15",
              "soundId": "Daha huzurlu bir ortam için lütfen çalışma alanlarımızı düzenli tutalım. Gösterdiğiniz özen için teşekkür ederiz.mp3",
              "enabled": True
            }
          ]
        }
      ]
    },
    {
      "dayOfWeek": 2,
      "enabled": True,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "15:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_4_1768235605",
          "name": "4. Aktivite",
          "startTime": "15:15",
          "startSoundId": "default",
          "endTime": "17:30",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241528616",
              "time": "15:25",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241575209",
              "time": "17:15",
              "soundId": "Daha huzurlu bir ortam için lütfen çalışma alanlarımızı düzenli tutalım. Gösterdiğiniz özen için teşekkür ederiz.mp3",
              "enabled": True
            }
          ]
        }
      ]
    },
    {
      "dayOfWeek": 3,
      "enabled": True,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "15:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_4_1768235605",
          "name": "4. Aktivite",
          "startTime": "15:15",
          "startSoundId": "default",
          "endTime": "17:30",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241528616",
              "time": "15:25",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241575209",
              "time": "17:15",
              "soundId": "Daha huzurlu bir ortam için lütfen çalışma alanlarımızı düzenli tutalım. Gösterdiğiniz özen için teşekkür ederiz.mp3",
              "enabled": True
            }
          ]
        }
      ]
    },
    {
      "dayOfWeek": 4,
      "enabled": True,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "15:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_4_1768235605",
          "name": "4. Aktivite",
          "startTime": "15:15",
          "startSoundId": "default",
          "endTime": "17:30",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241528616",
              "time": "15:25",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241575209",
              "time": "17:15",
              "soundId": "Daha huzurlu bir ortam için lütfen çalışma alanlarımızı düzenli tutalım. Gösterdiğiniz özen için teşekkür ederiz.mp3",
              "enabled": True
            }
          ]
        }
      ]
    },
    {
      "dayOfWeek": 5,
      "enabled": True,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "15:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_4_1768235605",
          "name": "4. Aktivite",
          "startTime": "15:15",
          "startSoundId": "default",
          "endTime": "17:30",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241528616",
              "time": "15:25",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241575209",
              "time": "17:15",
              "soundId": "Daha huzurlu bir ortam için lütfen çalışma alanlarımızı düzenli tutalım. Gösterdiğiniz özen için teşekkür ederiz.mp3",
              "enabled": True
            }
          ]
        }
      ]
    },
    {
      "dayOfWeek": 6,
      "enabled": True,
      "activities": [
        {
          "id": "1_1_1768235605",
          "name": "1. Aktivite",
          "startTime": "08:00",
          "startSoundId": "default",
          "endTime": "10:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241463641",
              "time": "08:10",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_2_1768235605",
          "name": "2. Aktivite",
          "startTime": "10:15",
          "startSoundId": "default",
          "endTime": "12:00",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241493270",
              "time": "10:25",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        },
        {
          "id": "1_3_1768235605",
          "name": "3. Aktivite",
          "startTime": "13:00",
          "startSoundId": "default",
          "endTime": "14:45",
          "endSoundId": "default",
          "playMusic": False,
          "interimAnnouncements": [
            {
              "id": "1768241524261",
              "time": "13:10",
              "soundId": "isg1.mp3",
              "enabled": True
            },
            {
              "id": "1768241619162",
              "time": "14:30",
              "soundId": "isg1.mp3",
              "enabled": True
            }
          ]
        }
      ]
    }
  ]

    def load_schedule(self, new_schedule):
        # Expecting list of DaySchedule
        # Frontend 0=Sun, 1=Mon. Backend (Python): 0=Mon, 6=Sun. 
        # We'll just trust the dayOfWeek passed matches what we use in check logic.
        # Let's standardise: Backend uses Python weekday (0=Mon).
        # Frontend needs to send data where dayOfWeek matches Python or we convert.
        # Frontend Translations: 1: "Monday"... 0: "Sunday".
        # Let's rely on dayOfWeek integer in the JSON.
        self.schedule = new_schedule
        self._save_schedule()
        print("Schedule updated.")

    def start(self):
        if not self.running:
            self.running = True
            print("Scheduler Service Started")
            time.sleep(1) # Extra stability sleep
            threading.Thread(target=self._loop, daemon=True).start()

    def stop(self):
        self.running = False
        print("Scheduler Service Stopped")

    def _loop(self):
        print("Scheduler: Loop Thread Started", flush=True)
        # Startup Sound (User Requested customization)
        time.sleep(2) # Give VLC and sound drivers time to settle
        try:
             # Check for system_audio/start.mp3 (Relative to backend)
             possible_paths = [
                 os.path.join("system_audio", "start.mp3"),
                 os.path.join(os.path.dirname(__file__), "system_audio", "start.mp3"),
                 "/home/nikolayco/.gemini/antigravity/scratch/Nikolayco-SmartZill/backend/system_audio/start.mp3"
             ]
             startup_sound = next((p for p in possible_paths if os.path.exists(p)), None)
             
             if startup_sound:
                 print(f"Playing Startup Sound: {startup_sound}", flush=True)
                 audio_engine.play_alert(startup_sound)
             else:
                 print(f"DEBUG: Startup sound not found in expected locations: {possible_paths}")
        except Exception as e: 
             print(f"Startup sound error: {e}")
             pass
        
        while self.running:
            try:
                now = datetime.now()
                current_time_str = now.strftime("%H:%M")
                current_day_idx = now.weekday() # 0=Monday, 6=Sunday
                
                # Holiday Check
                is_holiday = now.date() in self.tr_holidays
                holiday_name = self.tr_holidays.get(now.date()) if is_holiday else None

                # Logic: _get_default_schedule creates 0=Mon ... 6=Sun
                # So we match directly.
                today_sched = next((d for d in self.schedule if d["dayOfWeek"] == current_day_idx), None)
                
                if not today_sched:
                    print(f"Scheduler: No schedule found for day index {current_day_idx}")
                    time.sleep(5)
                    continue

                is_skipped_holiday = is_holiday and (now.date().isoformat() in self.skipped_holidays)

                if not today_sched.get("enabled", False) or is_skipped_holiday:
                    # Day is disabled or Skipped Holiday
                    if is_skipped_holiday:
                        self.next_event_name = f"RESMİ TATİL (ATLANDI): {holiday_name}"
                    else:
                        self.next_event_name = "Bugün Plan Yok (Kapalı)"
                    
                    self.next_event_time = "-"
                    self._handle_idle_state()
                    time.sleep(1)
                    continue
            except Exception as e:
                print(f"Scheduler Loop Error: {e}")
                time.sleep(5)
                continue

            # Calculate Next Event
            self._update_next_event(today_sched, current_time_str)

            # Heartbeat (Every minute)
            if current_time_str != getattr(self, "last_heartbeat", ""):
                print(f"♥ Scheduler Alive: {current_time_str} | Day: {current_day_idx} | State: {self.current_state}", flush=True)
                self.last_heartbeat = current_time_str

            # Check Activities & Determine State
            active_activity = None
            
            # --- Bell Logic (Always Active) ---
            if current_time_str != self.last_minute_checked:
                self.last_minute_checked = current_time_str
                
                # Special Days Announcement Check
                if special_days_service and special_days_service.config.get("enabled", False):
                    if current_time_str in special_days_service.config.get("announcement_times", []):
                        names = special_days_service.get_todays_people()
                        if names:
                            print(f"🎂 Special Day Announcement for: {', '.join(names)}")
                            playlist = []
                            
                            for i, name in enumerate(names):
                                # Generate individual text
                                # We need to use the template but for ONE person.
                                # The service's generate_announcement_text joins names. We'll do it manually here for better control or reuse a helper.
                                # Actually let's use the template directly from config
                                template = special_days_service.config.get("template", "İyi ki doğdun {name}")
                                text = template.replace("{name}", name)
                                
                                try:
                                    filename = self.generate_tts_audio(text)
                                    if filename:
                                        path = os.path.join(self.announcement_dir, filename)
                                        playlist.append(path)
                                        # Add delay if not the last one
                                        if i < len(names) - 1:
                                            playlist.append("DELAY:5")
                                except Exception as e:
                                    print(f"TTS Error for {name}: {e}")

                            if playlist:
                                # Run in thread to prevent blocking scheduler loop
                                threading.Thread(target=audio_engine.play_sequence, args=(playlist, 'bell'), daemon=True).start()
                
                for act in today_sched.get("activities", []):
                    # START Bell
                    if act["startTime"] == current_time_str:
                         print(f"Activity Start: {act['name']}")
                         playlist = []
                         # Bell
                         bell = act.get("startSoundId", "default")
                         if bell and bell != "None": playlist.append(self._resolve_sound_path(bell, "bells"))
                         # Announcement
                         ann = act.get("startAnnouncementId", None)
                         if ann and ann != "None": playlist.append(self._resolve_sound_path(ann, "announcements"))
                         
                         if playlist:
                             # Remove None entries from legacy data issues
                             playlist = [p for p in playlist if p]
                             if playlist:
                                 audio_engine.play_sequence(playlist, volume_type='bell')
                                 
                         active_activity = act

                    # END Bell
                    elif act["endTime"] == current_time_str:
                         print(f"Activity End: {act['name']}")
                         playlist = []
                         # Bell
                         bell = act.get("endSoundId", "default")
                         if bell and bell != "None": playlist.append(self._resolve_sound_path(bell, "bells"))
                         # Announcement
                         ann = act.get("endAnnouncementId", None)
                         if ann and ann != "None": playlist.append(self._resolve_sound_path(ann, "announcements"))

                         if playlist:
                             playlist = [p for p in playlist if p]
                             if playlist:
                                 audio_engine.play_sequence(playlist, volume_type='bell')

                    # Interim
                    for ann in act.get("interimAnnouncements", []):
                        if ann["enabled"] and ann["time"] == current_time_str:
                            path = self._resolve_sound_path(ann.get("soundId", "default"), "announcements")
                            if path:
                                audio_engine.play_sequence([path], volume_type='bell')

            # --- State Determination ---
            # Find if we are currently INSIDE an activity
            temp_state = "IDLE"
            active_activity_now = None
            for act in today_sched.get("activities", []):
                if act["startTime"] <= current_time_str < act["endTime"]:
                     active_activity_now = act
                     break
            
            if active_activity_now:
                temp_state = "WORK"
            else:
                # Check if within day bounds (Break)
                acts = today_sched.get("activities", [])
                if acts:
                    sorted_acts = sorted(acts, key=lambda x: x["startTime"])
                    day_start = sorted_acts[0]["startTime"]
                    day_end = sorted_acts[-1]["endTime"]
                    if day_start <= current_time_str < day_end:
                         temp_state = "BREAK"
                    else:
                         temp_state = "IDLE"
                else:
                    temp_state = "IDLE"

            # Detect State Change -> Reset Manual Override
            if temp_state != self.current_state:
                print(f"State Change: {self.current_state} -> {temp_state}. Resetting Auto.")
                self.manual_override_active = False 
                self.current_state = temp_state
            
            # --- Music Enforcement (Respect Manual Override) ---
            if not self.manual_override_active:
                if self.current_state == "WORK":
                    # WORK: Always Enforce Silence (playMusic prop now controls the NEXT break)
                    if audio_engine.is_playing_music:
                        audio_engine.stop_media()

                elif self.current_state == "BREAK":
                    # BREAK: Check previous activity's music setting
                    should_play = False
                    acts = today_sched.get("activities", [])
                    if acts:
                        sorted_acts = sorted(acts, key=lambda x: x["startTime"])
                        # Find the activity that just ended (or is currently passed)
                        # Iterate backwards to find the first act with endTime <= current_time
                        current_time_str_check = datetime.now().strftime("%H:%M")
                        for act in reversed(sorted_acts):
                            if act["endTime"] <= current_time_str_check:
                                should_play = act.get("playMusic", False)
                                # print(f"Current Break follows act: {act['name']}, playMusic: {should_play}")
                                break
                    
                    if should_play:
                        if not audio_engine.check_music_status():
                             print("Auto-playing Break Music - State: BREAK, Music Source:", self.music_source)
                             # Reload config logic if needed...
                             if os.path.exists(self.config_file):
                                try:
                                    with open(self.config_file, "r") as f:
                                        data = json.load(f)
                                        self.radio_url = data.get("radio_url", "")
                                        self.radio_stations = data.get("radio_stations", [])
                                        self.music_source = data.get("music_source", "local")
                                        self.company_name = data.get("company_name", "İşletme Zil Programı")
                                except: pass
                             self._play_music()
                    else:
                        # If break but music disabling requested (by previous activity)
                         if audio_engine.is_playing_music:
                            audio_engine.stop_media()
                
                elif self.current_state == "IDLE":
                    # IDLE: Enforce Silence
                    if audio_engine.is_playing_music:
                         audio_engine.stop_media()
            else:
                # Manual Override is Active: Do NOT enforce state-based rules
                # But we might want to ensure 'continuous playback' if in manual playing mode?
                # For now, let VLC handle playlist/stream. 
                pass

            time.sleep(1)

    def _handle_idle_state(self):
        if audio_engine.is_playing_music and not self.manual_override_active:
            audio_engine.stop_media()

    def _resolve_sound_path(self, filename, default_dir="bells"):
        if not filename or filename == "default":
             if default_dir == "bells": filename = "Melodi1.mp3"
             elif default_dir == "announcements": filename = "isg1.mp3" # Or return None?
             else: return None
        
        # Try finding it
        dirs_to_check = [
            os.path.join(self.bell_dir, filename),
            os.path.join(self.announcement_dir, filename),
            os.path.join(self.music_dir, filename)
        ]
        
        # Priority to the requested default_dir
        if default_dir == "bells":
             dirs_to_check.insert(0, os.path.join(self.bell_dir, filename))
        elif default_dir == "announcements":
             dirs_to_check.insert(0, os.path.join(self.announcement_dir, filename))

        for p in dirs_to_check:
             if os.path.exists(p): return p
        
        # Fallbacks for specific defaults if not found
        if filename == "Melodi1.mp3": return os.path.join(self.bell_dir, "work_start.mp3") if os.path.exists(os.path.join(self.bell_dir, "work_start.mp3")) else None
        
        print(f"File not found: {filename}")
        return None

    def _play_bell(self, sound_id):
        # Deprecated internally, but kept for safe measures or other calls?
        # This function is not being replaced, skipping.calls to this in loop.
        # But let's act as wrapper.
        path = self._resolve_sound_path(sound_id)
        if path: audio_engine.play_alert(path, volume=self.volume_bell)

    def _play_music(self, channel='music'):
        # Check source
        if self.music_source == "radio" and self.radio_url:
            print(f"DEBUG: Attempting to play radio: {self.radio_url} (Ch: {channel})")
            audio_engine.play_media(self.radio_url, 'url', volume_type=channel)
            
            # --- CONNECTION SAFEGUARD ---
            def check_radio_health():
                import time
                time.sleep(5) # Give 5 seconds for VLC to buffer/connect
                # Check status. Note: check_music_status() updates internal flag based on VLC state.
                if not audio_engine.check_music_status() or audio_engine.player.get_state() in [vlc.State.Error, vlc.State.Ended, vlc.State.Stopped]:
                    print("⚠️ RADIO CONNECTION FAILED (No Internet?). Falling back to Local MP3s.")
                    # Fallback: Play local music immediately
                    self._play_local_music(channel)

            # Run check in background so we don't block the scheduler
            import threading
            threading.Thread(target=check_radio_health, daemon=True).start()
            return

        # If not radio, play local
        self._play_local_music(channel)

    def _play_local_music(self, channel='music'):
        if not os.path.exists(self.music_dir): return
        
        # Smart Shuffle Logic
        if not hasattr(self, 'shuffled_playlist') or not self.shuffled_playlist:
            files = sorted([f for f in os.listdir(self.music_dir) if f.endswith(".mp3")])
            if not files: 
                print("❌ Local music folder is empty!")
                return
            # Create a new shuffled playlist
            import random
            random.shuffle(files)
            self.shuffled_playlist = files
            self.playlist_index = 0
            
        if self.playlist_index >= len(self.shuffled_playlist):
            self.playlist_index = 0 
            files = sorted([f for f in os.listdir(self.music_dir) if f.endswith(".mp3")])
            if not files: return
            import random
            random.shuffle(files)
            self.shuffled_playlist = files
            
        current_file = self.shuffled_playlist[self.playlist_index]
        full_path = os.path.join(self.music_dir, current_file)
        
        print(f"DEBUG: Playing local music: {full_path} (Ch: {channel})")
        audio_engine.play_media(full_path, 'file', volume_type=channel)
        
        self.playlist_index = (self.playlist_index + 1) % len(self.shuffled_playlist)

    def manual_stop(self):
        print("Manual Stop Requested")
        self.manual_override_active = True
        audio_engine.stop_media()

    def manual_music_toggle(self, enable: bool):
        print(f"Manual Override Request: {'Play' if enable else 'Stop'}")
        
        # Persist this state so we can restore on boot
        self.restore_manual_playback = enable
        self._save_config()
        
        if enable:
            self.manual_override_active = True
            if not audio_engine.is_playing_music:
                 self._play_music(channel='manual')
        else:
            # User explicitly stopped playback via Manual Control.
            # We must set override=True so the loop doesn't restart it immediately if inside a music-playing state.
            # The override resets on state change (e.g. Break -> IDLE).
            self.manual_override_active = True
            audio_engine.stop_media()

    def _update_next_event(self, today_sched, current_time_str):
        # Collect all triggers: Start Bell, End Bell, Announcements
        triggers = []
        for act in today_sched.get("activities", []):
            if act["startTime"] > current_time_str:
                triggers.append({"time": act["startTime"], "name": f"Başlangıç: {act['name']}"})
            if act["endTime"] > current_time_str:
                 triggers.append({"time": act["endTime"], "name": f"Bitiş: {act['name']}"})
            
            for ann in act.get("interimAnnouncements", []):
                if ann["enabled"] and ann["time"] > current_time_str:
                    triggers.append({"time": ann["time"], "name": "Ara Duyuru"})

        if not triggers:
             self.next_event_name = "Plan Tamamlandı"
             self.next_event_time = "-"
             return
             
        # Sort by time
        triggers.sort(key=lambda x: x["time"])
        next_evt = triggers[0]
        self.next_event_name = next_evt["name"]
        self.next_event_time = next_evt["time"]

    def get_daily_timeline(self):
        """Returns a sorted list of all events for today for UI visualization."""
        now = datetime.now()
        current_day_idx = now.weekday()
        current_time_str = now.strftime("%H:%M")
        
        # Be robust: Convert both to int just in case
        today_sched = next((d for d in self.schedule if int(d["dayOfWeek"]) == current_day_idx), None)
        
        # If disabled, we might still want to show what WAS planned but greyed out?
        # User feedback: "var aslında ama geçmiş olarak görünmeli" implies they want to see it.
        # So we loosen the check: If it exists, return it.
        # But if it is disabled, maybe we mark all as 'disabled' or 'passed'?
        # If today_sched is None, truly nothing.
        if not today_sched:
            print(f"Daily Timeline: No schedule for Day {current_day_idx}")
            return []

        events = []
        # If !enabled, we can still show them but maybe frontend handles passed/disabled?
        # Effectively, if disabled, they are 'cancelled'.
        # But for visibility, let's return them.
        is_enabled = today_sched.get("enabled", False)

        for act in today_sched.get("activities", []):
            # Start
            events.append({
                "time": act["startTime"],
                "name": f"Başlangıç: {act['name']}",
                "type": "start",
                "passed": act["startTime"] < current_time_str or not is_enabled # Mark passed if disabled too?
            })
            # End
            events.append({
                "time": act["endTime"],
                "name": f"Bitiş: {act['name']}",
                "type": "end",
                "passed": act["endTime"] < current_time_str or not is_enabled
            })
            # Announcements
            for ann in act.get("interimAnnouncements", []):
                if ann["enabled"]:
                    events.append({
                        "time": ann["time"],
                        "name": "Ara Duyuru",
                        "type": "announcement",
                        "passed": ann["time"] < current_time_str or not is_enabled
                    })
        
        # Sort by time
        events.sort(key=lambda x: x["time"])
        return events

    def generate_tts_audio(self, text, filename=None):
        """Generates a TTS MP3 file from text using selected engine."""
        try:
            import re
            import time
            
            # Determine Engine and Voice
            # Default to High Quality Edge TTS if not specified
            engine_voice = getattr(self, 'tts_engine', 'edge-tr-emel') 
            
            if not filename:
                # Use first 50 characters of text as filename
                safe_text = re.sub(r'[^\w\s-]', '', text[:50])
                safe_text = re.sub(r'[-\s]+', '_', safe_text).strip('_')
                filename = f"{safe_text}_{int(time.time())}.mp3" if safe_text else f"tts_{int(time.time())}.mp3"
            
            filename = "".join([c for c in filename if c.isalnum() or c in ('_', '.', '-')]).rstrip()
            if not filename.endswith(".mp3"): filename += ".mp3"

            path = os.path.join(self.announcement_dir, filename)

            # --- Edge TTS (Neural / High Quality) ---
            if engine_voice.startswith("edge-"):
                try:
                    import asyncio
                    import edge_tts
                    
                    # Map simplified names to Edge TTS Voice IDs
                    voice_map = {
                        "edge-tr-ahmet": "tr-TR-AhmetNeural",
                        "edge-tr-emel": "tr-TR-EmelNeural",
                        "edge-en-guy": "en-US-GuyNeural",
                        "edge-en-aria": "en-US-AriaNeural",
                        "edge-de-conrad": "de-DE-ConradNeural",
                        "edge-de-katja": "de-DE-KatjaNeural",
                        "edge-ru-dmitry": "ru-RU-DmitryNeural",
                        "edge-ru-svetlana": "ru-RU-SvetlanaNeural",
                        "edge-bg-borislav": "bg-BG-BorislavNeural",
                        "edge-bg-kalina": "bg-BG-KalinaNeural"
                    }
                    voice = voice_map.get(engine_voice, "tr-TR-EmelNeural")
                    print(f"TTS Generaton: Engine='{engine_voice}' -> Mapped Voice='{voice}'")
                    
                    async def _run_edge():
                        communicate = edge_tts.Communicate(text, voice)
                        await communicate.save(path)

                    # Determine if we are in an existing loop
                    try:
                        loop = asyncio.get_running_loop()
                        # If we are already in an async event loop (unlikely for this specific sync method call chain but possible)
                        # We cannot use asyncio.run. We have to use a thread or future.
                        # For simplicity in this sync method, we just run in a thread safely
                        # OR since this is usually called from valid sync context (Scheduler Loop), asyncio.run is fine.
                        # But wait, main.py is async. Scheduler runs in a Thread.
                        # Thread has no loop by default.
                    except RuntimeError:
                        loop = None

                    if loop:
                         # We are in a loop? Create a task? No, we need to block and wait for file.
                         # This shouldn't happen deep in scheduler thread.
                        pass
                        
                    asyncio.run(_run_edge())
                    return filename
                    
                except Exception as e:
                    print(f"EdgeTTS Error: {e}. Falling back to Google TTS...")
                    # Fallthrough to gTTS

            # --- Google TTS (Standard / Robotic) ---
            from gtts import gTTS
            tts = gTTS(text=text, lang='tr')
            tts.save(path)
            return filename

        except Exception as e:
            print(f"TTS Error (internet required): {e}")
            return None

    def _cleanup_old_tts(self):
        """Cleans up temporary TTS files older than 7 days."""
        try:
            now = time.time()
            retention_period = 7 * 24 * 3600  # 7 Days
            
            if not os.path.exists(self.announcement_dir):
                return

            for f in os.listdir(self.announcement_dir):
                if f.startswith("temp_tts_") and f.endswith(".mp3"):
                    try:
                        # Format: temp_tts_{timestamp}__{slug}.mp3 or temp_tts_{timestamp}.mp3
                        parts = f.replace("temp_tts_", "").split("_")
                        timestamp = int(parts[0])
                        
                        if now - timestamp > retention_period:
                            path = os.path.join(self.announcement_dir, f)
                            os.remove(path)
                            print(f"Cleaned up old TTS file: {f}")
                    except ValueError:
                        continue # Skip if parsing fails
                        
        except Exception as e:
            print(f"Error during TTS cleanup: {e}")

    def _load_config(self):
        if os.path.exists(self.config_file):
            try:
                import json
                with open(self.config_file, "r") as f:
                    data = json.load(f)
                    self.radio_url = data.get("radio_url", self.radio_url) # Keep default if missing
                    # Only overwrite stations if the file has a non-empty list
                    loaded_stations = data.get("radio_stations", [])
                    if loaded_stations:
                        self.radio_stations = sorted(loaded_stations, key=lambda x: x['name'])
                    
                    self.start_on_boot = data.get("start_on_boot", True)

                    self.music_source = data.get("music_source", "local")
                    self.company_name = data.get("company_name", "İşletme Zil Programı")
                    
                    self.volume_bell = data.get("volume_bell", 100)
                    self.volume_music = data.get("volume_music", 25)
                    self.volume_manual = data.get("volume_manual", 50)
                    self.volume_system = data.get("volume_system", 100)
                    
                    # If key exists, use it. If not, fallback to whatever we set in __init__ (all holidays)
                    if "skipped_holidays" in data:
                        self.skipped_holidays = data["skipped_holidays"]
                    
                    self.holiday_country = data.get("holiday_country", "TR")
                    self.restore_manual_playback = data.get("restore_manual_playback", False)
                
                    # Load Streaming config
                    if "streaming" in data:
                        self.streaming_enabled = data["streaming"].get("enabled", False)
                        self.streaming_port = data["streaming"].get("port", 8080)
                    
                    # Load App Autostart config
                    self.app_autostart_enabled = data.get("app_autostart_enabled", False)
                    
                    # TTS Engine
                    self.tts_engine = data.get("tts_engine", "edge-tr-emel")
                    
                    # Frontend Auto Open
                    self.frontend_auto_open = data.get("frontend_auto_open", True)
                    
                    # KEY FIX: Apply loaded volume to engine immediately
                    # Otherwise engine defaults to hardcoded values
                    audio_engine.set_channel_volume('bell', self.volume_bell)
                    audio_engine.set_channel_volume('music', self.volume_music)
                    audio_engine.set_channel_volume('manual', self.volume_manual)

            except Exception as e:
                print(f"Error loading config: {e}")
        else:
            self._save_config()

    def _save_config(self):
        import json
        data = {
            "radio_url": self.radio_url,
            "start_on_boot": self.start_on_boot,
            "radio_stations": self.radio_stations,
            "music_source": self.music_source,
            "company_name": self.company_name,
            "volume_bell": self.volume_bell,
            "volume_music": self.volume_music,
            "volume_manual": self.volume_manual,
            "volume_system": self.volume_system,
            "skipped_holidays": self.skipped_holidays,
            "holiday_country": self.holiday_country,
            "restore_manual_playback": self.restore_manual_playback,
            "streaming": {
                 "enabled": self.streaming_enabled,
                 "port": self.streaming_port
            },
            "app_autostart_enabled": self.app_autostart_enabled,
            "tts_engine": getattr(self, "tts_engine", "edge-tr-emel"),
            "audio_device_id": getattr(self, "audio_device_id", None),
            "frontend_auto_open": getattr(self, "frontend_auto_open", True)
        }
        try:
            with open(self.config_file, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"Config save error: {e}")

    def _load_schedule(self):
        if os.path.exists(self.schedule_file):
            try:
                import json
                with open(self.schedule_file, "r") as f:
                    self.schedule = json.load(f)
                    print(f"Schedule loaded from {self.schedule_file}")
            except Exception as e:
                print(f"Schedule load error: {e}, using default.")
                self.schedule = self._get_default_schedule()
        else:
            self.schedule = self._get_default_schedule()

    def _save_schedule(self):
        import json
        try:
            with open(self.schedule_file, "w") as f:
                json.dump(self.schedule, f, indent=4)
        except Exception as e:
            print(f"Schedule save error: {e}")

scheduler = SchedulerService()
