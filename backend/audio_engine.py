import vlc
import time
import os
import threading

class AudioEngine:
    def __init__(self):
        self.lock = threading.Lock()
        self.is_playing_music = False
        self.current_media_type = None 
        self.current_media_source = None
        self.current_volume_type = 'music'
        
        # LOGICAL VOLUME MIXER (0-100 scale)
        # Replaces generic 'self.volume' with channel-specific gains
        self.channel_volumes = {
            'music': 25,  # User request: 25%
            'bell': 100,  # User request: 100%
            'manual': 50  # User request: 50% (default on first launch)
        }
        
        # Streaming Settings
        self.streaming_enabled = False
        self.streaming_port = 5959

        try:
            if os.name == 'nt':
                 # Try to add VLC path for Windows
                 vlc_paths = [r"C:\Program Files\VideoLAN\VLC", r"C:\Program Files (x86)\VideoLAN\VLC"]
                 for p in vlc_paths:
                     if os.path.exists(p) and hasattr(os, 'add_dll_directory'):
                         os.add_dll_directory(p)
                         break

            # Initialize VLC with no video output (Audio Only)
            # Force ALSA output with default device and max internal volume
            # We'll control volume via VLC's audio_set_volume which works better with ALSA
            self.instance = vlc.Instance(
                '--no-video', 
                '--quiet', 
                '--no-audio-time-stretch',
                '--aout=pulse',
                '--http-reconnect', # Auto reconnect for HTTP streams
                '--sout-keep'
            )
            self.player = self.instance.media_player_new()
            self.announcement_player = self.instance.media_player_new()
            
            self.buffering_start_time = 0

        except Exception as e:
            print(f"CRITICAL ERROR: Could not initialize VLC: {e}")
            if os.name == 'nt':
                print("Windows Detect: Please install VLC Media Player (64-bit) from videolan.org")
                print("Note: If installed, you may need to add C:\\Program Files\\VideoLAN\\VLC to your System PATH")
            else:
                print("Please ensure VLC is installed on the system: 'sudo apt install vlc'")
            self.instance = None
            self.player = None
            self.announcement_player = None
            self.active_device_id = None

    def set_output_device(self, device_id: str):
        # Legacy stub
        self.active_device_id = device_id
        return True

    def get_output_devices(self):
        # Legacy stub
        return []

    def get_channel_volume(self, channel: str) -> int:
        return self.channel_volumes.get(channel, 50)

    def set_channel_volume(self, channel: str, volume: int):
        """Sets the logical volume (gain) for a specific channel (0-100)."""
        with self.lock:
            vol = max(0, min(100, volume))
            self.channel_volumes[channel] = vol
            
            # Apply immediately to active players
            if channel == 'bell':
                if self.announcement_player and self.announcement_player.is_playing():
                    self.announcement_player.audio_set_volume(vol)
            
            elif channel == self.current_volume_type:
                 print(f"Applying volume {vol} to {channel} (Active)")
                 if self.player:
                     ret = self.player.audio_set_volume(vol)
                     print(f"Volume set result: {ret}")
            else:
                 print(f"Volume update stored for {channel} (Not Active). Current: {self.current_volume_type}, Playing: {self.is_playing_music}")

    def set_streaming_config(self, enabled: bool, port: int):
        print(f"Update Audio Streaming Config: {enabled} (Port {port})")
        self.streaming_enabled = enabled
        self.streaming_port = port

    def _resolve_url(self, url: str) -> str:
        """Resolves YouTube URLs to direct stream URLs using yt-dlp."""
        if not url: return url
        if "youtube.com" in url or "youtu.be" in url:
            print(f"Resolving YouTube URL: {url}...")
            try:
                import yt_dlp
                ydl_opts = {'format': 'bestaudio/best', 'noplaylist': True, 'quiet': True, 'nocheckcertificate': True, 'live_from_start': True}
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    return info.get('url', url)
            except Exception as e:
                print(f"YouTube resolution failed: {e}")
                return url
        return url

    def _get_media_options(self, include_sout=True):
        """Returns list of VLC media options based on current config"""
        opts = [":network-caching=3000"] # Increased caching for HLS stability
        if self.streaming_enabled and include_sout:
            print(f"DEBUG: Configured VLC for streaming on port {self.streaming_port}")
            # transcode: enc=mp3, bitrate=128kbps, 2 channels, 44.1kHz, sync for HLS
            transcode_config = "acodec=mp3,ab=128,channels=2,samplerate=44100,audio-sync"
            # std: access=http, mux=mp3, bind to 0.0.0.0 (all interfaces)
            std_config = f"access=http,mux=mp3,dst=0.0.0.0:{self.streaming_port}/stream"
            
            network_chain = f"transcode{{{transcode_config}}}:std{{{std_config}}}"
            # duplicate: play locally (display) AND stream
            sout = f"#duplicate{{dst=display,dst=\"{network_chain}\"}}"
            opts.append(f":sout={sout}")
            opts.append(":sout-keep") 
        return opts
    
    def play_media(self, source: str, media_type: str = 'file', volume_type: str = 'music'):
        """
        Plays music/radio using the specific channel gain.
        volume_type: 'music' or 'manual' to select the gain channel.
        """
        if not self.player: return

        # Resolve URL... (same as before)
        if media_type == 'url':
            real_source = self._resolve_url(source)
        else:
            real_source = source

        with self.lock:
            self.stop_media()
            # Wait for port release if we were streaming
            if self.streaming_enabled: time.sleep(0.5)
            
            self.current_media_type = media_type
            self.current_media_source = source
            self.current_volume_type = volume_type
            
            target_vol = self.channel_volumes.get(volume_type, 50)
            media = self.instance.media_new(real_source)
            for opt in self._get_media_options(include_sout=True): media.add_option(opt)
                
            self.player.set_media(media)
            
            # SOFT START: Mute first to avoid connection glitches
            self.player.audio_set_volume(0) 
            self.player.play()
            self.is_playing_music = True
            
            # Only apply long stabilization for Network Streams (URLs)
            # For local files, we want instant playback.
            stabilization_time = 5.0 if media_type == 'url' else 0.2
            
            # Wait for stable 'Playing' state before unmutes
            if self._wait_for_start(self.player, timeout=10.0): 
                time.sleep(stabilization_time) 
                self.player.audio_set_volume(target_vol)
                print(f"Playing stable: {media_type} (Ch: {volume_type}) at vol {target_vol}")
            else:
                print(f"Warning: Playback started but timed out waiting for stable state. Vol set anyway.")
                self.player.audio_set_volume(target_vol)

    def stop_media(self):
        """Stops all media players."""
        if self.player.is_playing():
            self.player.stop()
        
        # Stop announcement player too
        self.stop_alert()

        self.is_playing_music = False
        print("Media stopped")

    def stop_alert(self):
        """Stops the announcement player immediately."""
        # Unconditionally stop to ensure broken states are cleared
        self.announcement_player.stop()
        # Note: If play_sequence is blocked in a loop, stopping the player 
        # causes the loop to exit (is_playing becomes false).

    def check_music_status(self):
        """Syncs internal flag with actual VLC state. Returns True if music is officially playing."""
        if self.is_playing_music:
             state = self.player.get_state()
             
             # 5=Stopped, 6=Ended, 7=Error
             if state in [vlc.State.Stopped, vlc.State.Ended, vlc.State.Error]:
                 self.is_playing_music = False
                 self.buffering_start_time = 0
                 
             # Check for Stalled / Infinite Buffering (Common with YouTube Expired Links)
             elif state == vlc.State.Buffering:
                 if self.buffering_start_time == 0:
                     self.buffering_start_time = time.time()
                 elif time.time() - self.buffering_start_time > 20: # 20s Timeout
                     print("⚠️ Playback Stalled (Buffering > 20s). Forcing Restart...")
                     self.stop_media() # This sets is_playing_music = False
                     self.buffering_start_time = 0
                     return False
             elif state == vlc.State.Playing:
                 self.buffering_start_time = 0
                 
        return self.is_playing_music

    def play_alert(self, file_path: str, volume_override: int = None):
        """
        Plays alert using 'bell' channel gain.
        """
        if not os.path.exists(file_path): return False

        # Use 'bell' channel volume unless override provided (rare)
        target_vol = volume_override if volume_override is not None else self.channel_volumes['bell']

        print(f"Playing alert (Ch: Bell): {file_path} at vol {target_vol}")
        
        # 1. Handle background music
        was_playing = self.player.is_playing() or self.is_playing_music
        resume_source = self.current_media_source
        resume_type = self.current_media_type
        # Resume volume depends on what was playing (music or manual?)
        # For simplicity, assume music unless we track it. 
        # Actually, let's just re-read the channel volume on resume.
        
        if was_playing:
            if self.streaming_enabled: self.player.stop()
            else: self.player.pause() 
            time.sleep(0.5)
        
        # 2. Play Alert on Announcement Player
        media = self.instance.media_new(file_path)
        for opt in self._get_media_options(): media.add_option(opt)

        self.announcement_player.set_media(media)
        self.announcement_player.play()
        
        for _ in range(5):
             time.sleep(0.1)
             self.announcement_player.audio_set_volume(target_vol)
             if self.announcement_player.is_playing(): break
        
        time.sleep(0.5)
        while self.announcement_player.is_playing(): time.sleep(0.1)
            
        print("Alert finished")

        # 3. Resume Music
        if was_playing:
            # Re-fetch volume for music channel
            resume_vol = self.channel_volumes['music'] 
            print(f"Resuming media at vol {resume_vol}...")
            
            if resume_type == 'url' or self.streaming_enabled:
                 self.player.stop()
                 # Re-call play_media with explicit 'music' type
                 self.play_media(resume_source, 'url' if resume_type == 'url' else 'file', 'music')
            else:
                 if not self.player.is_playing():
                    self.player.play()
                    time.sleep(0.2)
                    self.player.audio_set_volume(resume_vol)
        
        return True

    def get_playback_stats(self):
        """Returns { time: ms, duration: ms, stats: dict }"""
        if not self.player: return {"time": 0, "duration": 0, "stats": None}
        
        stats_info = None
        media = self.player.get_media()
        if media:
            stats = vlc.MediaStats()
            if media.get_stats(stats):
                try:
                    stats_info = {
                        "input_bitrate": getattr(stats, 'f_input_bitrate', 0.0),
                        "demux_bitrate": getattr(stats, 'f_demux_bitrate', 0.0),
                        "read_bytes": getattr(stats, 'i_read_bytes', 0),
                        "demux_read_bytes": getattr(stats, 'i_demux_read_bytes', 0)
                    }
                except Exception as e:
                    print(f"Stats error: {e}")
                    stats_info = None

        return {
            "time": self.player.get_time(),
            "duration": self.player.get_length(),
            "stats": stats_info
        }

    def _wait_for_start(self, player, timeout=3.0):
        """Waits for player to transition away from 'NothingSpecial' or 'Stopped'."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            state = player.get_state()
            # If it's Opening (1), Buffering (2), or Playing (3), it has officially started
            if state in [vlc.State.Opening, vlc.State.Buffering, vlc.State.Playing]:
                return True
            time.sleep(0.05)
        return False

    def play_sequence(self, file_paths: list, volume_type: str = 'bell'):
        """
        Plays a list of alert files in sequence, blocking until all are finished.
        Handles music pause/resume only once.
        """
        if not file_paths: return
        
        print(f"DEBUG: Starting sequence playback (Ch: {volume_type})")
        
        # 1. Handle background music
        was_playing = self.player.is_playing() or self.is_playing_music
        resume_source = self.current_media_source
        resume_type = self.current_media_type
        
        if was_playing:
            print("DEBUG: Pausing background music for sequence...")
            self.was_volume_type = getattr(self, 'current_volume_type', 'music')
            if self.streaming_enabled: self.player.stop()
            else: self.player.pause()
            time.sleep(0.3)
            
        # 2. Play each file
        for file_path in file_paths:
            if file_path.startswith("DELAY:"):
                try:
                    delay_sec = float(file_path.split(":")[1])
                    print(f"DEBUG: Sequence Delay for {delay_sec}s")
                    time.sleep(delay_sec)
                except:
                    pass
                continue

            if not os.path.exists(file_path):
                print(f"WARNING: Skipping missing file: {file_path}")
                continue
            
            target_vol = self.get_channel_volume(volume_type)
                
            media = self.instance.media_new(file_path)
            for opt in self._get_media_options(include_sout=False): media.add_option(opt)
                
            # Set volume PRE-PLAY
            self.announcement_player.audio_set_volume(target_vol)
            self.announcement_player.set_media(media)
            self.announcement_player.play()
            
            # Wait for start (be more patient)
            if self._wait_for_start(self.announcement_player, timeout=5.0):
                # Volume Brute-Force for Alerts: Keep applying until it sticks
                for _ in range(10):
                    self.announcement_player.audio_set_volume(target_vol)
                    time.sleep(0.05)
                    
                print(f"DEBUG: Playing alert: {os.path.basename(file_path)} (Vol: {target_vol})")
                
                # Wait for finish (Wait through Opening, Buffering, and Playing)
                while True:
                    state = self.announcement_player.get_state()
                    if state not in [vlc.State.Playing, vlc.State.Opening, vlc.State.Buffering]:
                        # Check error state
                        if state == vlc.State.Error:
                            print(f"ERROR: Playback error for {file_path}")
                        break
                    time.sleep(0.1)
            else:
                print(f"ERROR: Timeout waiting for announcement to start: {file_path}. State: {self.announcement_player.get_state()}")
                
            # Small structural gap between sequence items
            time.sleep(0.3)

        print("DEBUG: Sequence finished.")
        
        # 3. Resume Music with Volume Protection
        if was_playing:
            v_type = getattr(self, 'was_volume_type', 'music')
            snapshot_vol = self.get_channel_volume(v_type)
            print(f"DEBUG: Restoring {v_type} at level {snapshot_vol}%")
            
            if resume_type == 'url' or self.streaming_enabled:
                self.play_media(resume_source, 'url' if resume_type == 'url' else 'file', v_type)
            else:
                if not self.player.is_playing():
                    self.player.audio_set_volume(snapshot_vol)
                    self.player.play()
                    # Catch-up volume enforcement for pause/resume
                    for _ in range(5):
                        time.sleep(0.1)
                        self.player.audio_set_volume(snapshot_vol)

    def play_alert(self, file_path: str, volume_override: int = None):
        """
        Plays a blocking alert using 'bell' channel gain.
        """
        # If override is provided, we temporarily update the bell volume or just use play_sequence.
        # For professional usage, we'll just use the sequence.
        self.play_sequence([file_path], volume_type='bell')
        return True

audio_engine = AudioEngine()
