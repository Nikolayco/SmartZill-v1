import sys
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response 
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import threading
import json
from datetime import datetime
import uvicorn
import asyncio
import asyncio
import pandas as pd
from io import BytesIO
import platform
import subprocess
import random

from audio_engine import audio_engine
from scheduler_service import scheduler
from special_days_service import special_days_service

def get_local_ip():
    import socket
    try:
        # Connect to a public DNS to find own IP (doesn't send data)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1" 


app = FastAPI(title="Workplace Bell System")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
def shutdown_event():
    print("Application shutting down...", flush=True)
    try:
        # Stop all audio playback
        audio_engine.stop_media()
        
        # Stop and release all VLC players
        if audio_engine.player:
            try:
                audio_engine.player.stop()
                audio_engine.player.release()
            except: pass
            
        if audio_engine.announcement_player:
            try:
                audio_engine.announcement_player.stop()
                audio_engine.announcement_player.release()
            except: pass
        
        # Release VLC instance
        if audio_engine.instance:
            try:
                audio_engine.instance.release()
            except: pass
            
        print("VLC instances cleaned up", flush=True)
    except Exception as e:
        print(f"Cleanup error: {e}", flush=True)
    
    # Stop scheduler
    scheduler.stop()

# ... (Existing Models)
import subprocess
import re

def set_linux_volume(vol: int):
    """Sets system volume using pactl/amixer. Vol: 0-100"""
    try:
        vol = max(0, min(100, vol))
        # 1. Try PulseAudio (Modern Linux)
        try:
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{vol}%"], check=False)
            subprocess.run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "0"], check=False)
        except: pass
        
        # 2. Try ALSA (Master)
        subprocess.run(["amixer", "sset", "Master", f"{vol}%", "unmute"], check=False)
        # 3. Try ALSA (Specific fallback controls)
        subprocess.run(["amixer", "sset", "Speaker", f"{vol}%", "unmute"], check=False)
        subprocess.run(["amixer", "sset", "Headphone", f"{vol}%", "unmute"], check=False)
        
        print(f"System Volume Forced to {vol}%")
    except Exception as e:
        print(f"System Vol Set Error: {e}")

def get_linux_volume():
    """Gets system volume using amixer (Linux). Returns 0-100 or -1 on error."""
    try:
        cmd = ["amixer", "get", "Master"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        # Parse output: [50%]
        m = re.search(r"\[(\d+)%\]", res.stdout)
        if m:
            return int(m.group(1))
        return 50 # Default fallback
    except Exception:
        return -1

class SystemVolumeReq(BaseModel):
    volume: int

@app.post("/system/volume")
def api_set_system_volume(req: SystemVolumeReq):
    scheduler.volume_system = req.volume
    if os.name == 'posix': # Linux/Mac
         set_linux_volume(req.volume)
    scheduler._save_config()
    return {"status": "ok", "volume": req.volume}

@app.get("/system/volume")
def api_get_system_volume():
    # Default to stored volume
    vol = getattr(scheduler, 'volume_system', 50)
    
    # Try to get real system volume on Linux
    if os.name == 'posix':
        real_vol = get_linux_volume()
        if real_vol != -1:
            vol = real_vol
            
    return {"volume": vol}

# Special Days Endpoints
@app.get("/special-days")
def get_special_days():
    return {
        "config": special_days_service.config,
        "people": special_days_service.people
    }

class SpecialDayConfig(BaseModel):
    enabled: bool
    announcement_times: List[str]
    template: str

@app.post("/special-days/config")
def update_special_days_config(cfg: SpecialDayConfig):
    special_days_service.config["enabled"] = cfg.enabled
    special_days_service.config["announcement_times"] = cfg.announcement_times
    special_days_service.config["template"] = cfg.template
    special_days_service.save_data()
    return {"status": "updated"}

class Person(BaseModel):
    name: str
    date: str

@app.post("/special-days/people")
def update_special_days_people(people: List[Person]):
    special_days_service.people = [p.dict() for p in people]
    special_days_service.save_data()
    return {"status": "updated"}

@app.post("/special-days/import")
async def import_special_days(file: UploadFile = File(...)):
    # Save to temp
    path = f"temp_{file.filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        count = special_days_service.import_from_excel(path)
        os.remove(path)
        return {"status": "success", "count": count}
    except Exception as e:
        if os.path.exists(path): os.remove(path)
        raise HTTPException(400, str(e))

@app.get("/special-days/template")
def download_template():
    # Generate a dummy excel or csv
    # Use pandas
    df = pd.DataFrame([{"Ad Soyad": "Örnek İsim", "Tarih": "1990-01-30"}])
    output = BytesIO()
    # Excel is best for user
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    
    headers = {
        'Content-Disposition': 'attachment; filename="ozel_gunler_sablon.xlsx"'
    }
    return Response(content=output.getvalue(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers=headers)

class ManualAnnouncementRequest(BaseModel):
    name: str

@app.post("/special-days/announce")
def manual_special_day_announcement(req: ManualAnnouncementRequest):
    """Manually trigger a special day announcement for a specific person"""
    try:
        text = special_days_service.generate_announcement_text([req.name])
        filename = scheduler.generate_tts_audio(text)
        if filename:
            path = os.path.join(scheduler.announcement_dir, filename)
            # Run in thread to not block API
            threading.Thread(target=audio_engine.play_alert, args=(path, scheduler.volume_bell), daemon=True).start()
            return {"status": "playing", "text": text}
        else:
            raise HTTPException(500, "TTS Generation Failed")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/special-days/stop")
def stop_special_day_announcement():
    """Stop currently playing announcement"""
    try:
        audio_engine.stop_alert()
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.on_event("startup")
async def startup_event():
    print("Initializing Scheduler Service...")
    
    # Ensure directories exist
    for d in ["audio", "bells", "announcements"]:
        if not os.path.exists(d):
            os.makedirs(d)

    if scheduler.start_on_boot:
        print("Restoring active state...")
        scheduler.start()
    else:
        print("Scheduler inactive on boot (as per last state).")

    # Initialize Audio Engine with Streaming Config
    audio_engine.set_streaming_config(scheduler.streaming_enabled, scheduler.streaming_port)

    # Restore Manual Playback if it was active
    if getattr(scheduler, 'restore_manual_playback', False):
        async def delayed_restore():
            print("Waiting 5s for startup sound to finish before restoring radio...")
            await asyncio.sleep(5)
            print("Restoring Manual Playback...")
            scheduler.manual_music_toggle(True)
        
        asyncio.create_task(delayed_restore())

    # Auto-open browser logic -> MOVED TO SHELL SCRIPT
    # The backend shouldn't manage the browser window as it doesn't know when Frontend is ready.
    # See run_linux.sh for xdg-open logic.
    pass

class InterimAnnouncement(BaseModel):
    id: str
    time: str
    soundId: str
    enabled: bool

class Activity(BaseModel):
    id: str
    name: str
    startTime: str
    startSoundId: str
    startAnnouncementId: Optional[str] = None
    endTime: str
    endSoundId: str
    endAnnouncementId: Optional[str] = None
    playMusic: bool
    interimAnnouncements: List[InterimAnnouncement]

class DaySchedule(BaseModel):
    dayOfWeek: int
    enabled: bool
    activities: List[Activity]

# Endpoint expects a list of Days
class ScheduleRequest(BaseModel):
    schedule: List[DaySchedule]

class CompanyName(BaseModel):
    name: str

class Volume (BaseModel):
    level: int

class VolumeSettings(BaseModel):
    bell: int
    music: int
    manual: int

class TtsEngineReq(BaseModel):
    engine: str

@app.post("/settings/tts-engine")
def set_tts_engine(req: TtsEngineReq):
    scheduler.tts_engine = req.engine
    scheduler._save_config()
    return {"status": "ok", "engine": req.engine}

class PreviewRequest(BaseModel):
    folder: str
    filename: str

class RadioStation(BaseModel):
    name: str
    url: str

class RadioSettings(BaseModel):
    url: str
    stations: List[RadioStation]
    source: str # 'local' or 'radio'

@app.get("/status")
def get_status():
    stats = audio_engine.get_playback_stats()
    # Return volume of the CURRENT active channel (music or manual)
    current_vol = audio_engine.get_channel_volume(audio_engine.current_volume_type)
    
    return {
        "state": scheduler.current_state,
        "is_playing": audio_engine.check_music_status(),
        "volume": current_vol,
        "current_volume_type": audio_engine.current_volume_type,  # 'music' or 'manual'
        "current_media": audio_engine.current_media_source,
        "next_event": scheduler.next_event_name,
        "next_event_time": scheduler.next_event_time,
        "company_name": scheduler.company_name,
        "radio_url": scheduler.radio_url,
        "radio_stations": scheduler.radio_stations,
        "music_source": scheduler.music_source,
        "media_time": stats["time"],
        "media_duration": stats["duration"],
        "daily_timeline": scheduler.get_daily_timeline(),
        "scheduler_running": scheduler.running,
        "volume_bell": scheduler.volume_bell,
        "volume_music": scheduler.volume_music,
        "volume_manual": scheduler.volume_manual,
        "start_on_boot": scheduler.start_on_boot,
        "media_stats": stats.get("stats"),
        "streaming": {
            "enabled": scheduler.streaming_enabled,
            "port": scheduler.streaming_port
        },
        "app_autostart_enabled": scheduler.app_autostart_enabled,
        "system_ip": get_local_ip(),
        "audio_device_id": getattr(scheduler, "audio_device_id", None)
    }

# ... (rest of code)

@app.post("/settings/radio")
def set_radio_settings(payload: RadioSettings):
    scheduler.radio_url = payload.url
    # Handle stations - they might already be dicts or RadioStation objects
    if payload.stations:
        scheduler.radio_stations = sorted(
            [s if isinstance(s, dict) else s.dict() for s in payload.stations], 
            key=lambda x: x['name']
        )
    scheduler.music_source = payload.source
    
    # If currently playing radio and url changed, restart?
    if scheduler.music_source == "radio" and audio_engine.is_playing_music:
         # Check if current media is different
         if audio_engine.current_media_source != payload.url:
              target_channel = 'manual' if scheduler.manual_override_active else 'music'
              scheduler._play_music(channel=target_channel)
              
    scheduler._save_config()
    return {"status": "updated"}



@app.post("/control/stop")
def stop_playback():
    scheduler.manual_stop()
    return {"status": "stopped"}

@app.post("/control/enable_scheduler")
def enable_scheduler():
    """Enable the scheduler to run automatically"""
    if not scheduler.running:
        scheduler.start()
    return {"status": "enabled", "running": scheduler.running}

@app.post("/control/disable_scheduler")
def disable_scheduler():
    """Disable the scheduler (pause automation)"""
    scheduler.stop()
    audio_engine.stop_media()  # Also stop any playing media
    return {"status": "disabled", "running": scheduler.running}

class BootSettings(BaseModel):
    start_active: bool

@app.post("/settings/boot")
def set_boot_settings(payload: BootSettings):
    scheduler.start_on_boot = payload.start_active
    scheduler._save_config()
    return {"status": "updated", "start_on_boot": scheduler.start_on_boot}

class AppAutostartSettings(BaseModel):
    enabled: bool

class FrontendAutoOpenSettings(BaseModel):
    enabled: bool

@app.post("/settings/frontend-auto-open")
def set_frontend_auto_open(payload: FrontendAutoOpenSettings):
    scheduler.frontend_auto_open = payload.enabled
    scheduler._save_config()
    return {"status": "updated", "enabled": payload.enabled}

@app.post("/settings/app-autostart")
def set_app_autostart(payload: AppAutostartSettings):
    scheduler.app_autostart_enabled = payload.enabled
    scheduler._save_config()
    
    try:
        if os.name == 'nt': # Windows
            import winreg
            key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
            app_name = "SmartZill"
            
            # Determine path
            if getattr(sys, 'frozen', False):
                # We are running as an exe
                exe_path = sys.executable
                # Wrap in quotes to handle spaces
                run_cmd = f'"{exe_path}"' 
            else:
                # Dev mode: assumes python is in path or use sys.executable
                # Point to the run_windows.bat or similar if exists, or just python main logic
                # For safety/reliability in dev, pointing to sys.executable + script is tricky without a dedicated launcher.
                # We will point to the current python interpreter executing the main.py
                script_path = os.path.abspath(__file__)
                run_cmd = f'"{sys.executable}" "{script_path}"'

            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_ALL_ACCESS)
                if payload.enabled:
                    winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, run_cmd)
                    print(f"Windows Autostart ENABLED: {run_cmd}")
                else:
                    try:
                        winreg.DeleteValue(key, app_name)
                        print("Windows Autostart DISABLED")
                    except FileNotFoundError:
                        pass # Key didn't exist, already disabled
                winreg.CloseKey(key)
            except Exception as e:
                print(f"Windows Registry Error: {e}")
                raise HTTPException(500, f"Registry access failed: {e}")

        else: # Linux / Other
            # OS Level Autostart Logic (Linux - XDG Desktop Entry)
            home = os.path.expanduser("~")
            autostart_dir = os.path.join(home, ".config", "autostart")
            desktop_file = os.path.join(autostart_dir, "nikolayco_smartzill.desktop")
            
            if payload.enabled:
                if not os.path.exists(autostart_dir): os.makedirs(autostart_dir)
                
                # Determine path to run_linux.sh from backend/main.py
                # backend/main.py -> backend/ -> root/
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                script_path = os.path.join(base_dir, "run_linux.sh")
                
                # Verify script exists, if not try frozen path logic for linux too if needed, 
                # but currently linux relies on the shell script wrapper.
                
                content = f"""[Desktop Entry]
Type=Application
Exec={script_path}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=NikolayCo SmartZill
Comment=Otomatik başlatılan NikolayCo SmartZill sistemi
Terminal=true
"""
                with open(desktop_file, "w") as f:
                    f.write(content)
                os.chmod(desktop_file, 0o755)
                print("Autostart ENABLED via .desktop file")
            else:
                if os.path.exists(desktop_file):
                    os.remove(desktop_file)
                print("Autostart DISABLED (removed .desktop file)")
            
    except Exception as e:
        print(f"Failed to configure autostart: {e}")
        raise HTTPException(500, f"Autostart configuration failed: {e}")
        
    return {"status": "updated", "enabled": payload.enabled}

class StreamingSettings(BaseModel):
    enabled: bool
    port: int

@app.post("/settings/streaming")
def set_streaming_settings(payload: StreamingSettings):
    scheduler.streaming_enabled = payload.enabled
    scheduler.streaming_port = payload.port
    scheduler._save_config()
    
    audio_engine.set_streaming_config(payload.enabled, payload.port)
    
    # Restart playback if active so streaming starts/stops immediately
    if audio_engine.check_music_status():
        print("Streaming config changed while playing. Restarting playback...")
        # Determine current channel type to preserve volume behavior
        channel = audio_engine.current_volume_type
        scheduler._play_music(channel=channel)

    return {"status": "updated"}


@app.post("/control/restart")
def restart_application():
    """Restarts the application."""
    print("Restart Request Received...", flush=True)
    
    try:
        scheduler.stop()
        audio_engine.stop_media()
    except: pass
    
    # Update browser lock to prevent re-opening UI on restart loops if checking specifically
    # But usually we WANT it to open if it was closed.
    
    if getattr(sys, 'frozen', False):
        print("Restarting Frozen Application (Respawn)...", flush=True)
        # Spawn new process
        try:
             subprocess.Popen([sys.executable] + sys.argv[1:])
        except Exception as e:
             print(f"Failed to respawn: {e}")
             
        # Kill current process
        os._exit(0)
    else:
        print("Restarting Application (Reload Trigger)...", flush=True)
        # Touch this file to trigger uvicorn --reload
        try:
            current_file = os.path.abspath(__file__)
            os.utime(current_file, None)
        except Exception as e:
            print(f"Failed to touch main file: {e}")
        
    return {"status": "restarting"}



class VolumeReq(BaseModel):
    volume: int

@app.post("/settings/volume")
def set_single_volume(req: VolumeReq):
    # This captures updates from simple sliders (like Dashboard)
    # It applies to the currently active music channel
    channel = audio_engine.current_volume_type 
    audio_engine.set_channel_volume(channel, req.volume)
    
    # Sync scheduler
    if channel == 'music': scheduler.volume_music = req.volume
    elif channel == 'manual': scheduler.volume_manual = req.volume
    scheduler._save_config()
    
    return {"status": "updated", "channel": channel, "volume": req.volume}

class VolumeSettings(BaseModel):
    bell: int
    music: int
    manual: int

@app.post("/settings/volumes")
def set_all_volumes(vols: VolumeSettings):
    audio_engine.set_channel_volume("bell", vols.bell)
    audio_engine.set_channel_volume("music", vols.music)
    audio_engine.set_channel_volume("manual", vols.manual)
    
    scheduler.volume_bell = vols.bell
    scheduler.volume_music = vols.music
    scheduler.volume_manual = vols.manual
    scheduler._save_config()
    
    return {"status": "updated"}

@app.post("/control/preview")
def preview_audio(req: PreviewRequest):
    base_dir = req.folder # "bells", "music", "announcements"
    # Basic validation
    if base_dir not in ["bells", "music", "announcements"]:
        raise HTTPException(400, "Invalid folder")
    
    # Handle "Default"
    filename = "work_start.mp3" if req.filename == "default" else req.filename
    if req.filename == "default" and "end" in base_dir: filename = "work_end.mp3" # Naive, better to trust filename passed from frontend handles defaults? 
    # Frontend sends "default" string. Let's just try to play 'work_start.mp3' if default.
    
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
         # Try fallback for default
         if req.filename == "default":
             # We don't know if it's start or end here easily without more context.
             # Let's assume frontend resolves "default" to actual filename?
             # No, frontend sends "default".
             # Let's just trust the user selected a file, or if default, play work_start as generic test.
             path = os.path.join("bells", "work_start.mp3")
    
    if os.path.exists(path):
        if base_dir == "music":
             # Use manual channel logic for previews
             audio_engine.play_media(path, 'file', volume_type='manual')
        else:
             audio_engine.play_alert(path)
        return {"status": "playing", "file": path}
    else:
        raise HTTPException(status_code=404, detail="File not found")

class TTSRequest(BaseModel):
    text: str

@app.post("/control/tts_announce")
def make_tts_announcement(req: TTSRequest):
    import time
    import re
    
    # Create a safe slug for the filename to display in UI history
    slug = re.sub(r'[^\w\s-]', '', req.text[:30]) # First 30 chars
    slug = re.sub(r'[-\s]+', '_', slug).strip('_')
    if not slug: slug = "text"
    
    filename = f"temp_tts_{int(time.time())}__{slug}.mp3"
    
    filename = scheduler.generate_tts_audio(req.text, filename=filename)
    if filename:
        path = os.path.join(scheduler.announcement_dir, filename)
        
        # Verify file integrity (Basic check) to prevent playing empty/corrupt files
        if os.path.exists(path) and os.path.getsize(path) > 1024: # > 1KB
            audio_engine.play_alert(path)
            return {"status": "playing", "file": filename}
        else:
            # If Edge TTS failed silently or with partial file
            if os.path.exists(path): os.remove(path)
            raise HTTPException(500, "TTS Audio file is invalid or too small.")
            
    else:
        raise HTTPException(500, "TTS Generation Failed")

@app.get("/settings/holidays")
def get_holiday_settings():
    # Get all holidays for current year
    all_holidays = []
    now = datetime.now().date()
    current_year = now.year
    
    try:
        import holidays
        country_holidays = holidays.country_holidays(scheduler.holiday_country, years=current_year)
        
        for date, name in sorted(country_holidays.items()):
            d_str = date.isoformat()
            all_holidays.append({
                "date": d_str,
                "name": name,
                "is_past": date < now,
                "is_today": date == now,
                "is_skipped": d_str in scheduler.skipped_holidays
            })
    except Exception as e:
        print(f"Warning: Could not fetch holidays (no internet?): {e}")
            
    return {
        "skipped_holidays": scheduler.skipped_holidays,
        "upcoming_holidays": all_holidays,
        "holiday_country": scheduler.holiday_country
    }

class HolidaySettings(BaseModel):
    skipped_holidays: List[str]
    country: Optional[str] = None

@app.post("/settings/holidays")
def set_holiday_settings(payload: HolidaySettings):
    scheduler.skipped_holidays = payload.skipped_holidays
    if payload.country:
        scheduler.holiday_country = payload.country
        try:
            import holidays
            scheduler.tr_holidays = holidays.country_holidays(payload.country, years=datetime.now().year)
        except Exception as e:
            print(f"Warning: Could not load holidays for {payload.country}: {e}")
    scheduler._save_config()
    return {"status": "updated", "skipped_holidays": payload.skipped_holidays, "holiday_country": scheduler.holiday_country}

@app.get("/schedule")
def get_schedule():
    return scheduler.schedule

@app.post("/schedule")
def update_schedule(items: List[DaySchedule]):
    scheduler.load_schedule([item.dict() for item in items])
    return {"status": "updated"}

@app.get("/files/{folder}")
def list_files(folder: str):
    if folder not in ["music", "bells", "announcements"]:
        return []
    
    target_dir = "audio" if folder == "music" else folder
    if not os.path.exists(target_dir): return []
    
    files = sorted([f for f in os.listdir(target_dir) if f.endswith(".mp3")])
    
    # We return ALL files now, allowing Frontend to separate "temp_tts_" into a history section
    
    return files

@app.post("/files/{folder}")
async def upload_files(folder: str, files: List[UploadFile] = File(...)):
    if folder not in ["music", "bells", "announcements"]:
         raise HTTPException(status_code=400, detail="Invalid folder")
    
    target_dir = "audio" if folder == "music" else folder
    saved_files = []
    
    for file in files:
        if not file.filename.endswith(".mp3"): continue
        
        path = os.path.join(target_dir, file.filename)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_files.append(file.filename)
        
    return {"filenames": saved_files}

class ManualMusic(BaseModel):
    enable: bool

@app.post("/control/manual_music")
def manual_music(payload: ManualMusic):
    scheduler.manual_music_toggle(payload.enable)
    return {"status": "ok", "state": payload.enable}

class CompanyName(BaseModel):
    name: str

@app.post("/settings/company")
def set_company_name(payload: CompanyName):
    scheduler.company_name = payload.name
    scheduler._save_config()
    return {"status": "updated", "name": payload.name}

@app.delete("/files/{folder}/{filename}")
def delete_file(folder: str, filename: str):
    if folder not in ["music", "bells", "announcements"]:
         raise HTTPException(status_code=400, detail="Invalid folder")
         
    target_dir = "audio" if folder == "music" else folder
    path = os.path.join(target_dir, filename)
    
    if os.path.exists(path):
        os.remove(path)
        return {"status": "deleted", "filename": filename}
    else:
        raise HTTPException(status_code=404, detail="File not found")


from fastapi.responses import Response

@app.get("/backup/export")
def export_settings():
    """Exports schedule and configuration as JSON."""
    export_data = {
        "timestamp": datetime.now().isoformat(),
        "schedule": scheduler.schedule,
        "config": {
             "radio_url": scheduler.radio_url,
             "radio_stations": scheduler.radio_stations,
             "music_source": scheduler.music_source,
             "company_name": scheduler.company_name,
             "volume_bell": scheduler.volume_bell,
             "volume_music": scheduler.volume_music,
             "volume_manual": scheduler.volume_manual,
             "skipped_holidays": scheduler.skipped_holidays,
             "holiday_country": scheduler.holiday_country,
             "start_on_boot": scheduler.start_on_boot,
             "restore_manual_playback": scheduler.restore_manual_playback,
             "streaming": {
                 "enabled": scheduler.streaming_enabled,
                 "port": scheduler.streaming_port
             },
             "app_autostart_enabled": scheduler.app_autostart_enabled
        }

    }
    return export_data

@app.get("/backup/download")
def download_backup():
    """Downloads the backup as a file directly."""
    data = export_settings()
    json_str = json.dumps(data, indent=4)
    filename = f"NikolayCo_SmartZill_Yedek_{datetime.now().strftime('%Y-%m-%d')}.json"
    return Response(content=json_str, media_type="application/json", headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })

@app.post("/backup/import")
async def import_settings(file: UploadFile = File(...)):
    """Imports settings from JSON file."""
    
    if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
         return await import_settings_excel(file)

    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        content = await file.read()
        data = json.loads(content)
        
        # Validate and Apply
        if "schedule" in data:
            scheduler.schedule = data["schedule"]
            scheduler._save_schedule()
            
        if "config" in data:
            cfg = data["config"]
            scheduler.radio_url = cfg.get("radio_url", scheduler.radio_url)
            scheduler.radio_stations = cfg.get("radio_stations", scheduler.radio_stations)
            scheduler.music_source = cfg.get("music_source", scheduler.music_source)
            scheduler.company_name = cfg.get("company_name", scheduler.company_name)
            scheduler.volume_bell = cfg.get("volume_bell", scheduler.volume_bell)
            scheduler.volume_music = cfg.get("volume_music", scheduler.volume_music)
            scheduler.volume_manual = cfg.get("volume_manual", scheduler.volume_manual)
            scheduler.skipped_holidays = cfg.get("skipped_holidays", scheduler.skipped_holidays)
            scheduler.holiday_country = cfg.get("holiday_country", scheduler.holiday_country)
            scheduler.start_on_boot = cfg.get("start_on_boot", scheduler.start_on_boot)
            scheduler.restore_manual_playback = cfg.get("restore_manual_playback", scheduler.restore_manual_playback)
            
            if "streaming" in cfg:
                 scheduler.streaming_enabled = cfg["streaming"].get("enabled", False)
                 scheduler.streaming_port = cfg["streaming"].get("port", 5959)
            
            scheduler.app_autostart_enabled = cfg.get("app_autostart_enabled", False)
            
            # Apply immediate effects where possible
            audio_engine.set_streaming_config(scheduler.streaming_enabled, scheduler.streaming_port)

            
            scheduler._save_config()
            
        return {"status": "ok", "message": "Settings imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Excel Import/Export Helpers
def get_day_name(idx):
    days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
    return days[idx] if 0 <= idx < 7 else "Bilinmeyen"

def get_day_index(name):
    days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
    name = name.capitalize()
    return days.index(name) if name in days else -1

@app.get("/backup/export/excel")
def export_settings_excel():
    """Exports settings and schedule as an Excel file."""
    # 1. Config Sheet
    config_data = {
        "Ayar": [
            "İşletme Adı", "Zil Sesi", "Müzik Sesi", "Manuel Müzik Sesi", 
            "Radyo URL", "Tatil Ülkesi", "Atlanan Tatiller", 
            "Açılışta Başlat", "Manuel Oynatma Durumu", "Oto Başlatma (App)"
        ],
        "Değer": [
            scheduler.company_name,
            scheduler.volume_bell,
            scheduler.volume_music,
            scheduler.volume_manual,
            scheduler.radio_url,
            scheduler.holiday_country,
            ",".join(scheduler.skipped_holidays),
            "Evet" if scheduler.start_on_boot else "Hayır",
            "Evet" if scheduler.restore_manual_playback else "Hayır",
            "Evet" if scheduler.app_autostart_enabled else "Hayır"
        ]
    }
    df_config = pd.DataFrame(config_data)

    # 2. Schedule Sheet
    schedule_rows = []
    # Sort by dayOfWeek
    sorted_schedule = sorted(scheduler.schedule, key=lambda x: x["dayOfWeek"])
    
    for day in sorted_schedule:
        day_name = get_day_name(day["dayOfWeek"])
        is_day_active = "Evet" if day["enabled"] else "Hayır"
        
        if not day["activities"]:
            # Add a row just to show the day exists/status, or skip? 
            # Better to show it so user can enable it.
            schedule_rows.append({
                "Gün": day_name, "Gün Aktif": is_day_active, 
                "Aktivite": "-", "Başlangıç": "-", "Bitiş": "-", 
                "Müzik": "-", "Giriş Zili": "-", "Çıkış Zili": "-",
                "Giriş Anons": "-", "Çıkış Anons": "-", "Ara Anonslar": "-"
            })
            continue

        for act in day["activities"]:
            # Serialize Interim Announcements
            # Format: 08:10|file1.mp3; 09:00|file2.mp3
            interim_str = ""
            if act.get("interimAnnouncements"):
                 parts = []
                 for ia in act["interimAnnouncements"]:
                     if ia.get("enabled", True):
                         parts.append(f"{ia['time']}|{ia.get('soundId', 'default')}")
                 interim_str = "; ".join(parts)

            schedule_rows.append({
                "Gün": day_name,
                "Gün Aktif": is_day_active,
                "Aktivite": act["name"],
                "Başlangıç": act["startTime"],
                "Bitiş": act["endTime"],
                "Müzik": "Evet" if act["playMusic"] else "Hayır",
                "Giriş Zili": act.get("startSoundId", "default"),
                "Çıkış Zili": act.get("endSoundId", "default"),
                "Giriş Anons": act.get("startAnnouncementId", "") or "",
                "Çıkış Anons": act.get("endAnnouncementId", "") or "",
                "Ara Anonslar": interim_str
            })

    df_schedule = pd.DataFrame(schedule_rows)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_config.to_excel(writer, sheet_name='Ayarlar', index=False)
        df_schedule.to_excel(writer, sheet_name='Zaman Çizelgesi', index=False)
    
    filename = f"NikolayCo_SmartZill_Yedek_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    return Response(content=output.getvalue(), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })

@app.get("/backup/template/excel")
def download_template_excel():
    """Download a template excel file."""
    # Just export current settings as the template is the best starting point
    return export_settings_excel()

async def import_settings_excel(file: UploadFile):
    try:
        contents = await file.read()
        xls = pd.ExcelFile(BytesIO(contents))
        
        # 1. Import Config
        if 'Ayarlar' in xls.sheet_names:
            df_config = pd.read_excel(xls, 'Ayarlar')
            # Helper to safely get value
            def get_val(key):
                row = df_config[df_config['Ayar'] == key]
                if not row.empty:
                    val = row.iloc[0]['Değer']
                    return val if pd.notna(val) else None
                return None

            name = get_val("İşletme Adı")
            if name: scheduler.company_name = str(name)
            
            # Numeric values
            try: scheduler.volume_bell = int(get_val("Zil Sesi")) or scheduler.volume_bell
            except: pass
            try: scheduler.volume_music = int(get_val("Müzik Sesi")) or scheduler.volume_music
            except: pass
            try: scheduler.volume_manual = int(get_val("Manuel Müzik Sesi")) or scheduler.volume_manual
            except: pass
            
            radio = get_val("Radyo URL")
            if radio: scheduler.radio_url = str(radio)
            
            country = get_val("Tatil Ülkesi")
            if country: scheduler.holiday_country = str(country)
            
            skipped = get_val("Atlanan Tatiller")
            if skipped: scheduler.skipped_holidays = [s.strip() for s in str(skipped).split(",") if s.strip()]
            
            boot = get_val("Açılışta Başlat")
            if boot: scheduler.start_on_boot = (str(boot).lower() == "evet")
            
            manual_restore = get_val("Manuel Oynatma Durumu")
            if manual_restore: scheduler.restore_manual_playback = (str(manual_restore).lower() == "evet")
            
            app_auto = get_val("Oto Başlatma (App)")
            if app_auto: scheduler.app_autostart_enabled = (str(app_auto).lower() == "evet")
            
            scheduler._save_config()

        # 2. Import Schedule
        if 'Zaman Çizelgesi' in xls.sheet_names:
            df_schedule = pd.read_excel(xls, 'Zaman Çizelgesi')
            # Rebuild schedule structure
            new_schedule = []
            
            # Initialize empty 7 days
            for i in range(7):
                new_schedule.append({
                    "dayOfWeek": i,
                    "enabled": False,
                    "activities": []
                })
            
            # Group by Day
            for _, row in df_schedule.iterrows():
                day_name = str(row['Gün'])
                day_idx = get_day_index(day_name)
                if day_idx == -1: continue
                
                day_active = str(row['Gün Aktif']).lower() == 'evet'
                new_schedule[day_idx]["enabled"] = day_active
                
                # If activity data exists
                act_name = str(row['Aktivite'])
                if act_name == "-" or pd.isna(act_name): continue
                
                # Create ID
                import time
                # Simple unique ID generation
                act_id = f"{day_idx}_{int(time.time()*1000)}_{random.randint(100,999)}"
                
                # Interim Announcements Parse
                interim_list = []
                interim_raw = str(row.get('Ara Anonslar', ''))
                if interim_raw and interim_raw != "-" and interim_raw != "nan":
                    # Split by ;
                    parts = interim_raw.split(";")
                    for p in parts:
                        p = p.strip()
                        if "|" in p:
                            t_str, f_str = p.split("|", 1)
                            interim_list.append({
                                "id": f"{int(time.time()*1000)}_{random.randint(100,999)}",
                                "time": t_str.strip(),
                                "soundId": f_str.strip(),
                                "enabled": True
                            })

                activity = {
                    "id": act_id,
                    "name": act_name,
                    "startTime": str(row['Başlangıç']),
                    "endTime": str(row['Bitiş']),
                    "playMusic": str(row['Müzik']).lower() == 'evet',
                    "startSoundId": str(row['Giriş Zili']) if pd.notna(row['Giriş Zili']) and row['Giriş Zili'] != "-" else "default",
                    "endSoundId": str(row['Çıkış Zili']) if pd.notna(row['Çıkış Zili']) and row['Çıkış Zili'] != "-" else "default",
                    "startAnnouncementId": str(row['Giriş Anons']) if pd.notna(row['Giriş Anons']) and row['Giriş Anons'] != "-" else None,
                    "endAnnouncementId": str(row['Çıkış Anons']) if pd.notna(row['Çıkış Anons']) and row['Çıkış Anons'] != "-" else None,
                    "interimAnnouncements": interim_list
                }
                new_schedule[day_idx]["activities"].append(activity)
            
            scheduler.schedule = new_schedule
            scheduler._save_schedule()

        return {"status": "ok", "message": "Excel Settings imported successfully"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Excel import failed: {str(e)}")



# Serve Static Files (Frontend)
if os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    print("Starting NikolayCo SmartZill...", flush=True)
    
    # SYSTEM SAFETY: Force system volume to safe level on startup
    if os.name == 'posix':
        print("Safety: Setting System Master Volume to 50%...")
        set_linux_volume(50)

    print("UI: http://localhost:7777", flush=True)
    print("Docs: http://localhost:7777/docs", flush=True)
    uvicorn.run("main:app", host="0.0.0.0", port=7777, reload=True)
