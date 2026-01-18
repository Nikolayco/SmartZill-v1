import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Clock, Calendar, CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import { Status } from '../../types';
import MediaPlayer from '../MediaPlayer';

// Helper function to format time (handles both seconds and milliseconds)
const formatTime = (time?: number): string => {
    if (!time || time <= 0) return "00:00";

    // If time is very large, it's likely in milliseconds
    const seconds = time > 10000 ? Math.floor(time / 1000) : Math.floor(time);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function Dashboard() {
    const { t, themeColor, language } = useApp();
    const [status, setStatus] = useState<Status>({
        state: 'IDLE',
        is_playing: false,
        volume: 100,
        current_media: null,
        radio_stations: [], // Ensure this is in type definition
        music_source: 'local',
        radio_url: ''
    });
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    const refreshData = async () => {
        try {
            const res = await api.get('/status');
            setStatus(res.data);
        } catch (e) { console.error(e); }
    };

    const [errorCount, setErrorCount] = useState(0);

    useEffect(() => {
        // Initial fetch
        refreshData();

        // Interval
        const interval = setInterval(async () => {
            setCurrentTime(new Date());
            try {
                const res = await api.get('/status');
                setStatus(res.data);
                setErrorCount(0); // Reset on success
            } catch (e) {
                console.error("Connection failed", e);
                setErrorCount(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Auto-reload check
    useEffect(() => {
        if (errorCount >= 30) {
            console.log("Connection lost for 30s. Reloading...");
            window.location.reload();
        }
    }, [errorCount]);

    const toggleSystem = async (cmd: 'start' | 'stop') => {
        if (cmd === 'stop') await api.post('/control/stop');
        refreshData();
    };

    const toggleMusic = async (enable: boolean) => {
        try {
            await api.post('/control/manual_music', { enable });
            // Small delay to ensure backend processes the command
            setTimeout(() => refreshData(), 200);
        } catch (e) { alert("Failed"); }
    };

    const changeVolume = async (val: number) => {
        try { await api.post('/settings/volume', { level: val }); } catch (e) { }
    }

    const toggleSource = async (source: string) => {
        try {
            await api.post('/settings/radio', {
                url: status.radio_url,
                stations: status.radio_stations || [],
                source
            });
            refreshData();
        } catch (e) { alert("Source change failed"); }
    }

    const playRadio = async (url: string) => {
        try {
            await api.post('/settings/radio', {
                url,
                stations: status.radio_stations || [],
                source: 'radio'
            });
            refreshData();
        } catch (e) { alert("Radio set failed"); }
    };

    const toggleScheduler = async () => {
        try {
            if (status.scheduler_running) {
                await api.post('/control/disable_scheduler');
            } else {
                await api.post('/control/enable_scheduler');
            }
            refreshData();
        } catch (e) {
            alert("Sistem durumu değiştirilemedi");
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                <div className="lg:col-span-2 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 rounded-xl shadow-xl border border-indigo-500/20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-50 blur-3xl animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>

                    <div className="relative z-10 flex items-center justify-center gap-8">
                        {/* Time Section */}
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-600/20 rounded-xl border border-indigo-400/30">
                                <Clock size={36} className="text-indigo-300" />
                            </div>
                            <div>
                                <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">{t('time')}</div>
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 tracking-tight tabular-nums">
                                    {currentTime ? currentTime.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US') : '--:--:--'}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-20 w-px bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent"></div>

                        {/* Date Section */}
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-purple-600/20 rounded-xl border border-purple-400/30">
                                <Calendar size={36} className="text-purple-300" />
                            </div>
                            <div>
                                <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-1">{t('date')}</div>
                                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                                    {currentTime ? currentTime.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : '...'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`relative p-4 rounded-xl shadow-xl border-2 transition-all overflow-hidden ${status.scheduler_running === false
                    ? 'bg-gradient-to-br from-red-950 to-red-900 border-red-500/50'
                    : status.state === 'WORK'
                        ? 'bg-gradient-to-br from-blue-950 to-blue-900 border-blue-500/50'
                        : status.state === 'BREAK'
                            ? 'bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-500/50'
                            : 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700'
                    }`}>
                    <div className="absolute top-0 right-0 opacity-10">
                        <Activity size={60} className={
                            status.scheduler_running === false ? 'text-red-300' :
                                status.state !== 'IDLE' ? 'text-white' : 'text-slate-700'
                        } />
                    </div>

                    <div className="relative z-10 space-y-3 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('systemStatus')}</div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 backdrop-blur-sm shadow-lg transition-all ${status.scheduler_running === false
                                ? 'bg-red-500/30 border-red-400 shadow-red-500/50'
                                : 'bg-emerald-500/30 border-emerald-400 shadow-emerald-500/50'
                                }`}>
                                {/* Pulsing Dot with Glow */}
                                <div className="relative flex items-center justify-center">
                                    <div className={`absolute w-3 h-3 rounded-full ${status.scheduler_running === false
                                        ? 'bg-red-400 animate-ping opacity-75'
                                        : 'bg-emerald-400 animate-ping opacity-75'
                                        }`}></div>
                                    <div className={`relative w-2 h-2 rounded-full ${status.scheduler_running === false
                                        ? 'bg-red-400 shadow-lg shadow-red-400/80'
                                        : 'bg-emerald-400 shadow-lg shadow-emerald-400/80'
                                        }`}></div>
                                </div>
                                <span className={`font-black text-xs tracking-wide ${status.scheduler_running === false
                                    ? 'text-red-200'
                                    : 'text-emerald-200'
                                    }`}>
                                    {status.scheduler_running === false ? t('stoppedUpper') :
                                        status.state === 'IDLE' ? t('active') : status.state === 'WORK' ? t('workUpper') : t('breakUpper')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={toggleScheduler}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-lg ${status.scheduler_running === false
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                        >
                            {status.scheduler_running === false ? '▶ ' + t('activate') : '⏸ ' + t('stop').toUpperCase()}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-250px)] min-h-[600px]">

                {/* Left: Schedule List */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl shadow-xl border border-slate-700 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <h3 className="font-black text-xl text-white flex items-center gap-2">
                            <CalendarDays size={24} className={`text-${themeColor}-400`} />
                            {t('todaysPlan')}
                        </h3>
                        {status.scheduler_running && status.next_event_time && (
                            <div className="flex items-center gap-2 bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-500/50 animate-pulse">
                                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{t('next')}</div>
                                <div className="text-amber-300 font-mono text-lg font-bold">{status.next_event_time}</div>
                                <div className="text-xs text-amber-200 font-semibold max-w-[150px] truncate">{status.next_event_name}</div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-0.5 flex-grow overflow-y-auto custom-scrollbar pr-1">
                        {status.scheduler_running === false ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <Activity size={40} className="mx-auto mb-2 opacity-30" />
                                <p className="font-bold text-base">{t('systemStopped')}</p>
                                <p className="text-xs mt-1">{t('systemStoppedDesc')}</p>
                            </div>
                        ) : (!status.daily_timeline || status.daily_timeline.length === 0) ? (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                <p className="font-bold text-base">{t('noEvents')}</p>
                            </div>
                        ) : (
                            status.daily_timeline?.map((evt, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${evt.passed
                                        ? 'bg-slate-950/20 border-slate-800/50 text-slate-600 opacity-40'
                                        : (status.next_event_time === evt.time
                                            ? 'bg-gradient-to-r from-amber-900/40 to-amber-900/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
                                            : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-slate-500/50 hover:bg-slate-800/60')
                                        }`}
                                >
                                    <div className={`font-mono font-bold text-sm min-w-[45px] ${evt.passed ? 'text-slate-800' :
                                        status.next_event_time === evt.time ? 'text-amber-400' :
                                            'text-indigo-400'
                                        }`}>
                                        {evt.time}
                                    </div>
                                    <div className="h-5 w-[1px] bg-slate-700/50"></div>
                                    <div className="flex-grow min-w-0">
                                        <div className={`font-bold text-xs truncate ${evt.passed ? 'line-through' :
                                            status.next_event_time === evt.time ? 'text-amber-50' :
                                                'text-slate-200'
                                            }`}>
                                            {evt.name}
                                        </div>
                                        {status.next_event_time === evt.time && !evt.passed && (
                                            <div className="text-[9px] text-amber-500/80 uppercase tracking-tighter font-black mt-0.5">
                                                {t('nextEvent')}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full ${evt.passed ? 'bg-slate-800' :
                                        status.next_event_time === evt.time ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                            'bg-indigo-500'
                                        }`}></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Media Player (Compact) */}
                <div className="h-full">
                    <MediaPlayer
                        status={status}
                        toggleMusic={toggleMusic}
                        toggleSource={toggleSource}
                        changeVolume={changeVolume}
                        playRadio={playRadio}
                        themeColor={themeColor}
                    />
                </div>
            </div>
        </div>
    );
}
