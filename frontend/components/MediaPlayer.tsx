import React from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { Status, MediaPlayerProps } from '../types';
import { Play, Square, Volume2, Radio, Music, List, RadioReceiver } from 'lucide-react';

const formatTime = (time?: number): string => {
    if (!time || time <= 0) return "00:00";
    const seconds = time > 10000 ? Math.floor(time / 1000) : Math.floor(time);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const colorMap: Record<string, string> = {
    'slate': '#64748b', 'gray': '#6b7280', 'zinc': '#71717a',
    'neutral': '#737373', 'stone': '#78716c', 'red': '#ef4444',
    'orange': '#f97316', 'amber': '#f59e0b', 'yellow': '#eab308',
    'lime': '#84cc16', 'green': '#22c55e', 'emerald': '#10b981',
    'teal': '#14b8a6', 'cyan': '#06b6d4', 'sky': '#0ea5e9',
    'blue': '#3b82f6', 'indigo': '#6366f1', 'violet': '#8b5cf6',
    'purple': '#a855f7', 'fuchsia': '#d946ef', 'pink': '#ec4899',
    'rose': '#f43f5e',
};

export default function MediaPlayer({ status, toggleMusic, toggleSource, changeVolume, playRadio, themeColor }: MediaPlayerProps) {
    const { t } = useApp();
    const activeColor = themeColor && colorMap[themeColor] ? colorMap[themeColor] : colorMap['indigo'];
    // START_ON_BOOT check or Manual Override logic might be causing mixed signals.
    // We broaden the check: If playing AND (manual OR (music channel but source is radio/local))
    const isManualPlaying = status.is_playing && (
        status.current_volume_type === 'manual' ||
        ((status.music_source === 'radio' || status.music_source === 'local') && status.current_volume_type === 'music')
    );

    // ALWAYS show and control manual volume
    const [localVolume, setLocalVolume] = React.useState(status.volume_manual || 50);
    const [isLoading, setIsLoading] = React.useState(false);
    const [localFiles, setLocalFiles] = React.useState<string[]>([]);
    const lastInteractionTime = React.useRef(0);
    const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

    const handleToggle = async (enable: boolean) => {
        setIsLoading(true);
        toggleMusic(enable);
        setTimeout(() => setIsLoading(false), 2000);
    };

    // Sync with backend volume
    React.useEffect(() => {
        if (Date.now() - lastInteractionTime.current > 2000) {
            setLocalVolume(status.volume_manual || 50);
        }
    }, [status.volume_manual]);

    // Fetch local files when source is local
    React.useEffect(() => {
        if (status.music_source === 'local') {
            api.get('/files/music')
                .then(res => {
                    // Backend returns direct list ["file1.mp3", ...], NOT {files: [...]}
                    const files = Array.isArray(res.data) ? res.data : (res.data.files || []);
                    setLocalFiles(files);
                })
                .catch(err => console.error('Failed to fetch music files', err));
        }
    }, [status.music_source]);

    const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setLocalVolume(val);
        lastInteractionTime.current = Date.now();

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(async () => {
            try {
                // Use single volume endpoint to control whatever is currently active (Manual or Music)
                await api.post('/settings/volume', { volume: val });
            } catch (error: any) {
                console.error('Failed to update volume:', error);
            }
        }, 100);
    };

    return (
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden h-full flex flex-col">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-50"></div>

            {/* Visualizer - ONLY for Manual Music */}
            {isManualPlaying && (
                <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-center gap-0.5 px-4 opacity-10 pointer-events-none">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-full rounded-t-sm ${status.music_source === 'radio'
                                ? 'bg-gradient-to-t from-pink-500 to-purple-500'
                                : 'bg-gradient-to-t from-indigo-500 to-blue-500'
                                } animate-pulse`}
                            style={{
                                height: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.05}s`,
                                animationDuration: `${0.5 + Math.random()}s`
                            }}
                        ></div>
                    ))}
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full p-4">
                {/* Header Compact */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg transition-colors ${isManualPlaying ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Music size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 tracking-wider">{t('mediaBoard')}</span>
                    </div>
                    {/* Source Toggle */}
                    <div className="flex bg-slate-950/50 p-0.5 rounded-lg border border-slate-800/50">
                        <button
                            onClick={() => toggleSource('local')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${status.music_source !== 'radio'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {t('local')}
                        </button>
                        <button
                            onClick={() => toggleSource('radio')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${status.music_source === 'radio'
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {t('radioUpper')}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                {/* Main Content Area */}
                <div className="flex flex-col gap-2">

                    {/* Media Info Card */}
                    <div className={`relative w-full rounded-xl p-3 border transition-all ${isManualPlaying
                        ? (status.music_source === 'radio' ? 'bg-pink-950/20 border-pink-500/20' : 'bg-indigo-950/20 border-indigo-500/20')
                        : 'bg-slate-900/40 border-slate-800'
                        }`}>

                        <div className="flex items-center gap-3">
                            {/* Album Art / Icon */}
                            <div className={`relative w-12 h-12 flex-shrink-0 rounded-lg shadow-lg flex items-center justify-center border border-slate-700/50 ${isManualPlaying
                                ? (status.music_source === 'radio' ? 'bg-pink-600' : 'bg-indigo-600')
                                : 'bg-slate-800'
                                }`}>
                                {status.music_source === 'radio'
                                    ? <Radio size={20} className="text-white" />
                                    : <Music size={20} className="text-white" />
                                }
                                {isManualPlaying && (
                                    <div className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-slate-900"></span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow min-w-0">
                                <h3 className={`text-sm font-bold leading-tight line-clamp-1 mb-0.5 ${isManualPlaying ? 'text-white' : 'text-slate-500'}`}>
                                    {isManualPlaying
                                        ? (status.music_source === 'radio'
                                            ? (status.radio_stations?.find((s: any) => s.url === status.current_media)?.name || t('radioStream'))
                                            : (status.current_media ? decodeURIComponent(status.current_media.split('/').pop() || '') : t('unknownTrack')))
                                        : t('readySelectMedia')}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                                        {isManualPlaying ? (status.music_source === 'radio' ? t('sourceRadio') : t('sourceLocal')) : t('paused')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar (Visible if playing local) */}
                        {isManualPlaying && status.music_source !== 'radio' && (
                            <div className="mt-3">
                                <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                                    <span>{formatTime(status.media_time)}</span>
                                    <span>{formatTime(status.media_duration)}</span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${status.media_duration ? ((status.media_time || 0) / status.media_duration) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* Radio Signal Animation */}
                        {isManualPlaying && status.music_source === 'radio' && (
                            <div className="mt-3 flex items-center gap-1.5">
                                <div className="text-[10px] text-pink-400 font-bold animate-pulse">{t('liveBroadcast')}</div>
                                <div className="flex gap-0.5 items-end h-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-0.5 bg-pink-500 animate-[bounce_1s_infinite]" style={{ height: '60%', animationDelay: `${i * 0.1}s` }}></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls Row */}
                    <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800 flex items-center gap-3">
                        {/* Play/Stop Buttons */}
                        <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-lg border border-slate-800/50 shadow-inner">
                            <button
                                onClick={() => handleToggle(true)}
                                disabled={isManualPlaying || isLoading}
                                className={`h-8 w-10 rounded-md flex items-center justify-center transition-all ${isManualPlaying
                                    ? 'bg-emerald-500/10 text-emerald-500 cursor-default opacity-50'
                                    : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95'
                                    }`}
                            >
                                <Play size={16} fill="currentColor" className={isManualPlaying ? "" : "ml-0.5"} />
                            </button>
                            <button
                                onClick={() => handleToggle(false)}
                                disabled={!isManualPlaying || isLoading}
                                className={`h-8 w-10 rounded-md flex items-center justify-center transition-all ${!isManualPlaying
                                    ? 'bg-slate-800 text-slate-600 cursor-default opacity-50'
                                    : 'bg-red-500 text-white shadow-lg shadow-red-900/20 hover:bg-red-400 active:scale-95'
                                    }`}
                            >
                                <Square size={14} fill="currentColor" />
                            </button>
                        </div>

                        <div className="w-px h-8 bg-slate-800"></div>

                        {/* Volume Control - Inline - ONLY MANUAL */}
                        <div className="flex-grow flex items-center gap-2 min-w-0">
                            <Volume2 size={16} className={`flex-shrink-0 transition-colors ${isManualPlaying ? 'text-indigo-400' : 'text-slate-600'}`} />
                            <div className="flex-grow relative h-6 flex items-center group">
                                <div className="absolute inset-0 bg-slate-800 rounded-lg"></div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={localVolume}
                                    onChange={handleVolumeChange}
                                    className="relative w-full h-full opacity-0 z-10 cursor-pointer"
                                />
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-indigo-600 rounded-l-lg pointer-events-none transition-all"
                                    style={{ width: `${localVolume}%` }}
                                ></div>
                                <div className="absolute right-2 top-0 bottom-0 flex items-center pointer-events-none">
                                    <span className="text-[10px] font-bold text-white shadow-black drop-shadow-md">{localVolume}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radio Stations List */}
                <div className="mt-2 flex-grow min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    {status.music_source === 'radio' && (
                        <div className="grid grid-cols-2 gap-1.5">
                            {status.radio_stations && status.radio_stations.length > 0 ? (
                                status.radio_stations.map((s: any, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => playRadio(s.url)}
                                        style={{
                                            backgroundColor: (status.radio_url === s.url || status.current_media === s.url) ? activeColor : undefined,
                                            color: (status.radio_url === s.url || status.current_media === s.url) ? '#ffffff' : undefined
                                        }}
                                        className={`px-2 py-2 rounded-lg text-[10px] font-bold text-left truncate transition-all ${(status.radio_url === s.url || status.current_media === s.url)
                                            ? 'shadow-md ring-1 ring-white/20'
                                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/30'
                                            }`}
                                    >
                                        {s.name}
                                    </button>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-4 text-xs text-slate-500 italic bg-slate-900/30 rounded-lg border border-slate-800/50">
                                    {t('noRadioFound')}
                                </div>
                            )}
                        </div>
                    )}

                    {status.music_source === 'local' && (
                        <div className="grid grid-cols-1 gap-1.5">
                            {localFiles.length > 0 ? (
                                localFiles.map((file, i) => (
                                    <div
                                        key={i}
                                        className={`px-3 py-2 rounded-lg text-[10px] font-bold text-left truncate transition-all flex items-center gap-2 ${status.current_media && decodeURIComponent(status.current_media).endsWith(file)
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-slate-800/50 text-slate-400 border border-slate-700/30'
                                            }`}
                                    >
                                        <Music size={12} className="flex-shrink-0" />
                                        <span className="truncate">{file}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-24 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/50">
                                    <Music size={24} className="mb-2 opacity-50" />
                                    <span className="text-[10px]">{t('emptyMusicDir')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
