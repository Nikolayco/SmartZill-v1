
import vlc
import time
import os
import sys

# Define parameters
FILE_PATH = "bells/Melodi1.mp3"
PORT = 5959

# Check if file exists
if not os.path.exists(FILE_PATH):
    print(f"Error: File {FILE_PATH} not found.")
    sys.exit(1)

print(f"Initializing VLC Instance...")
# Force ALSA and configured for streaming
try:
    instance = vlc.Instance(
        '--no-video',
        '--quiet',
        '--no-audio-time-stretch',
        #'--verbose=2' # Enable for debugging
    )
except Exception as e:
    print(f"Failed to create VLC instance: {e}")
    sys.exit(1)

player = instance.media_player_new()
media = instance.media_new(FILE_PATH)

# Configure Streaming Options
transcode_config = "vcodec=mp3,ab=128,channels=2,samplerate=44100"
std_config = f"access=http,mux=mp3,dst=0.0.0.0:{PORT}/stream"
network_chain = f"transcode{{{transcode_config}}}:std{{{std_config}}}"
sout = f"#duplicate{{dst=display,dst=\"{network_chain}\"}}"

print(f"Streaming Option: :sout={sout}")

media.add_option(f":sout={sout}")
media.add_option(":sout-keep")
media.add_option(":network-caching=1000")

player.set_media(media)

print(f"Starting playback of {FILE_PATH}...")
player.play()

# Monitor
time.sleep(1) # Wait for start
while True:
    state = player.get_state()
    if state in [vlc.State.Ended, vlc.State.Error, vlc.State.Stopped]:
        print(f"Playback ended or error. State: {state}")
        break
    
    print(f"Playing... State: {state}")
    time.sleep(2)

print("Exiting.")
