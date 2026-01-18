
from gtts import gTTS
import os

try:
    print("Testing gTTS...")
    tts = gTTS(text="Merhaba dünya, bu bir ses denemesidir.", lang='tr')
    filename = "test_tts_debug.mp3"
    tts.save(filename)
    print(f"Successfully saved {filename}")
    if os.path.exists(filename):
        print(f"File exists, size: {os.path.getsize(filename)} bytes")
        os.remove(filename)
except Exception as e:
    print(f"gTTS Failed: {e}")
