
import vlc
import time
import sys

# Radyo URL (Power Turk)
RADIO_URL = "https://live.powerapp.com.tr/powerturk/mpeg/icecast.audio?/;stream.mp3"
PORT = 5959

print(f"Initializing VLC Instance for Radio Stream Test...")
try:
    instance = vlc.Instance(
        '--no-video',
        '--quiet',
        '--no-audio-time-stretch'
    )
except Exception as e:
    print(f"Failed to create VLC instance: {e}")
    sys.exit(1)

player = instance.media_player_new()
media = instance.media_new(RADIO_URL)

# Configure Streaming Options (Same as production)
transcode_config = "vcodec=mp3,ab=128,channels=2,samplerate=44100"
std_config = f"access=http,mux=mp3,dst=0.0.0.0:{PORT}/stream"
network_chain = f"transcode{{{transcode_config}}}:std{{{std_config}}}"
sout = f"#duplicate{{dst=display,dst=\"{network_chain}\"}}"

print(f"Streaming Radio URL: {RADIO_URL}")
print(f"Streaming Option: :sout={sout}")

media.add_option(f":sout={sout}")
media.add_option(":sout-keep")
media.add_option(":network-caching=1000")

player.set_media(media)
player.play()

print("Playing... Waiting for buffering...")
# Monitor
max_retries = 30
success = False

for i in range(max_retries):
    state = player.get_state()
    print(f"[{i}] State: {state}")
    
    if state == vlc.State.Playing:
        print("State is PLAYING! Stream should be active.")
        success = True
        break
        
    if state == vlc.State.Error:
        print("State is ERROR. Stream failed.")
        break
        
    time.sleep(1)

if success:
    print("Keeping alive for 60 seconds... Try to connect with VLC now!")
    # Keep alive loop
    for _ in range(20): 
        time.sleep(3)
        print("...still playing...")
else:
    print("Failed to reach PLAYING state.")

print("Exiting debug script.")
