export interface InterimAnnouncement {
    id: string;
    time: string;
    soundId: string;
    enabled: boolean;
}

export interface Activity {
    id: string;
    name: string;
    startTime: string;
    startSoundId: string;
    startAnnouncementId?: string;
    endTime: string;
    endSoundId: string;
    endAnnouncementId?: string;
    playMusic: boolean;
    interimAnnouncements: InterimAnnouncement[];
}

export interface DaySchedule {
    dayOfWeek: number; // 0=Sunday, 1=Monday...
    enabled: boolean;
    activities: Activity[];
}

export interface Status {
    state: 'IDLE' | 'WORK' | 'BREAK';
    is_playing: boolean;
    volume: number;
    current_volume_type?: 'music' | 'manual' | 'bell';
    current_media: string | null;
    company_name?: string;
    // Radio Props
    radio_url?: string;
    radio_stations?: { name: string, url: string }[];
    music_source?: 'local' | 'radio';
    // Event
    next_event?: string;
    next_event_time?: string;
    next_event_name?: string;
    // Playback Stats
    media_time?: number;
    media_duration?: number;
    daily_timeline?: { time: string, name: string, type: string, passed: boolean }[];
    scheduler_running?: boolean;
    start_on_boot?: boolean;
    volume_bell?: number;
    volume_music?: number;
    volume_manual?: number;
    media_stats?: {
        input_bitrate: number;
        demux_bitrate: number;
        read_bytes: number;
        demux_read_bytes: number;
    };
}

export interface MediaPlayerProps {
    status: Status;
    toggleMusic: (enable: boolean) => void;
    toggleSource: (source: 'local' | 'radio') => void;
    changeVolume: (val: number) => void;
    playRadio: (url: string) => void;
    themeColor?: string;
}
