import vlc
import sys

try:
    i = vlc.Instance('--no-video', '--quiet')
    p = i.media_player_new()
    
    print("Enumerating devices:")
    mods = p.audio_output_device_enum()
    if mods:
        mod = mods
        while mod:
            d = mod.contents
            print(f"ID: {d.device.decode('utf-8')} | Name: {d.description.decode('utf-8')}")
            mod = d.next
        vlc.libvlc_audio_output_device_list_release(mods)
    else:
        print("No devices found or enumeration failed.")

except Exception as e:
    print(f"Error: {e}")
