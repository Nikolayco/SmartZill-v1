import yt_dlp
import sys

url = "https://www.youtube.com/watch?v=dubxvVmHOu0"
ydl_opts = {
    'format': 'bestaudio/best',
    'noplaylist': True,
    'quiet': False, # See output
    'nocheckcertificate': True
}
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        print(f"URL: {info.get('url')}")
        print(f"Format: {info.get('format')}")
        print(f"Is Live: {info.get('is_live')}")
except Exception as e:
    print(f"Error: {e}")
