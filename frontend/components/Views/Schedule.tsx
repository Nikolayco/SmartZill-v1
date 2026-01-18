import { useState, useEffect } from 'react';
import { DaySchedule, Activity, InterimAnnouncement } from '../../types';
import { Plus, Trash2, Save, Copy, Clock, Music, Bell, Play, Square } from 'lucide-react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';

interface Props {
    schedule: DaySchedule[]; // Now receiving full week
    onUpdate: () => void;
}

export default function Schedule({ schedule, onUpdate }: Props) {
    const { t } = useApp();
    const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
    const [activeDay, setActiveDay] = useState(new Date().getDay()); // Default to current day (0=Sun, 1=Mon...)
    const [isSaving, setIsSaving] = useState(false);
    const [bellFiles, setBellFiles] = useState<string[]>([]);
    const [announcementFiles, setAnnouncementFiles] = useState<string[]>([]);

    useEffect(() => {
        // If schedule is empty or legacy format, init default
        if (!schedule || !Array.isArray(schedule) || schedule.length === 0 || !('dayOfWeek' in schedule[0])) {
            // Create default empty week
            const defaultWeek: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
                dayOfWeek: i,
                enabled: i > 0 && i < 6, // Mon-Fri
                activities: []
            }));
            setWeekSchedule(defaultWeek);
        } else {
            setWeekSchedule(schedule);
        }

        // Fetch bells for dropdowns
        api.get('/files/bells').then(res => setBellFiles(res.data)).catch(console.error);
        api.get('/files/announcements').then(res => setAnnouncementFiles(res.data)).catch(console.error);
    }, [schedule]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.post('/schedule', weekSchedule);
            onUpdate();
        } catch (e) {
            alert(t('save') + " Failed"); // Simple fail fallback
        } finally {
            setIsSaving(false);
        }
    };

    const currentDay = weekSchedule.find(d => d.dayOfWeek === activeDay) || weekSchedule[0];

    const updateCurrentDay = (updatedDay: DaySchedule) => {
        setWeekSchedule(prev => prev.map(d => d.dayOfWeek === updatedDay.dayOfWeek ? updatedDay : d));
    }

    const handleCopyAll = () => {
        const current = weekSchedule.find(d => d.dayOfWeek === activeDay);
        if (!current) return;

        // Dynamic confirm message
        const dayName = t('weekDays')[activeDay as 1 | 2 | 3 | 4 | 5 | 6 | 0];
        if (!confirm(t('copyToAllConfirm').replace('{day}', dayName))) return;

        const newWeek = weekSchedule.map(d => {
            if (d.dayOfWeek === activeDay) return d;
            return {
                ...d,
                enabled: current.enabled,
                activities: JSON.parse(JSON.stringify(current.activities))
            };
        });
        setWeekSchedule(newWeek);
    };

    const handleCopyWeekdays = () => {
        const current = weekSchedule.find(d => d.dayOfWeek === activeDay);
        if (!current) return;
        if (!confirm(`${t('copyWeekdays')}?`)) return;

        const newSched = weekSchedule.map(d => {
            // 1=Mon .. 5=Fri
            if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.dayOfWeek !== activeDay) {
                return {
                    ...d,
                    enabled: current.enabled,
                    activities: JSON.parse(JSON.stringify(current.activities))
                }
            }
            return d;
        });
        setWeekSchedule(newSched);
    };

    const handleCopyWeekend = () => {
        const current = weekSchedule.find(d => d.dayOfWeek === activeDay);
        if (!current) return;
        if (!confirm(`${t('copyWeekend')}?`)) return;

        const newSched = weekSchedule.map(d => {
            // 6=Sat, 0=Sun
            if ((d.dayOfWeek === 6 || d.dayOfWeek === 0) && d.dayOfWeek !== activeDay) {
                return {
                    ...d,
                    enabled: current.enabled,
                    activities: JSON.parse(JSON.stringify(current.activities))
                }
            }
            return d;
        });
        setWeekSchedule(newSched);
    };

    const addActivity = () => {
        // Calculate smart default times based on last activity
        let startT = "09:00";
        let endT = "10:00";

        if (currentDay.activities.length > 0) {
            // Sort to find actual last
            const sorted = [...currentDay.activities].sort((a, b) => a.endTime.localeCompare(b.endTime));
            const last = sorted[sorted.length - 1];

            try {
                const [h, m] = last.endTime.split(':').map(Number);
                const d = new Date(); d.setHours(h); d.setMinutes(m);
                // Start 15 mins after last end
                d.setMinutes(d.getMinutes() + 15);
                startT = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                // End 60 mins after start
                d.setMinutes(d.getMinutes() + 60);
                endT = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            } catch (e) { }
        }

        const newAct: Activity = {
            id: Date.now().toString(),
            name: t('newActivity'),
            startTime: startT,
            endTime: endT,
            startSoundId: "Melodi1.mp3",
            endSoundId: "Melodi1.mp3",
            playMusic: true,
            interimAnnouncements: []
        };

        // Add and sort immediately
        const newActs = [...currentDay.activities, newAct].sort((a, b) => a.startTime.localeCompare(b.startTime));

        updateCurrentDay({
            ...currentDay,
            activities: newActs
        });
    };

    const updateActivity = (actId: string, field: keyof Activity, val: any) => {
        let updatedActs = currentDay.activities.map(a => a.id === actId ? { ...a, [field]: val } : a);
        // Re-sort if time changed
        if (field === 'startTime') {
            updatedActs.sort((a, b) => a.startTime.localeCompare(b.startTime));
        }
        updateCurrentDay({ ...currentDay, activities: updatedActs });
    };

    const deleteActivity = (actId: string) => {
        updateCurrentDay({ ...currentDay, activities: currentDay.activities.filter(a => a.id !== actId) });
    };

    const toggleDayEnabled = () => {
        updateCurrentDay({ ...currentDay, enabled: !currentDay.enabled });
    };

    // --- Sub-components helpers ---

    const addAnnouncement = (actId: string) => {
        const act = currentDay.activities.find(a => a.id === actId);
        let defaultTime = "09:30";

        if (act) {
            try {
                const [hours, minutes] = act.startTime.split(':').map(Number);
                const date = new Date();
                date.setHours(hours);
                date.setMinutes(minutes);
                date.setMinutes(date.getMinutes() + 10); // +10 minutes
                defaultTime = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                console.error("Time calc error", e);
            }
        }

        const newAnn: InterimAnnouncement = {
            id: Date.now().toString(),
            time: defaultTime,
            soundId: "isg1.mp3",
            enabled: true
        };

        if (act) {
            updateActivity(actId, 'interimAnnouncements', [...act.interimAnnouncements, newAnn]);
        }
    };

    const updateAnnouncement = (actId: string, annId: string, field: keyof InterimAnnouncement, val: any) => {
        const act = currentDay.activities.find(a => a.id === actId);
        if (!act) return;
        const newAnns = act.interimAnnouncements.map(ann => ann.id === annId ? { ...ann, [field]: val } : ann);
        updateActivity(actId, 'interimAnnouncements', newAnns);
    };

    const removeAnnouncement = (actId: string, annId: string) => {
        const act = currentDay.activities.find(a => a.id === actId);
        if (!act) return;
        updateActivity(actId, 'interimAnnouncements', act.interimAnnouncements.filter(a => a.id !== annId));
    }

    const previewSound = async (folder: 'bells' | 'music' | 'announcements', filename: string) => {
        if (!filename) return;
        try {
            await api.post('/control/preview', { folder, filename });
        } catch (e) {
            console.error(e);
        }
    };

    const stopPreview = async () => {
        try { await api.post('/control/stop'); } catch (e) { }
    };

    if (weekSchedule.length === 0) return <div>{t('loading')}</div>;

    // Get localized day name
    const activeDayName = t('weekDays')[activeDay as 1 | 2 | 3 | 4 | 5 | 6 | 0];


    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg">
                    <Clock size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">{t('scheduleTitle')}</h1>
                    <p className="text-slate-400">{t('scheduleDesc')}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors text-xs shadow-lg shadow-indigo-500/20"
                    title={t('copyToAll')}
                >
                    <Copy size={16} /> [{activeDayName}] → {t('copyToAll')}
                </button>
                <button onClick={handleCopyWeekdays} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white border border-slate-600 transition-all">
                    [{activeDayName}] → {t('copyWeekdays')}
                </button>
                <button onClick={handleCopyWeekend} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white border border-slate-600 transition-all">
                    [{activeDayName}] → {t('copyWeekend')}
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors shadow-lg shadow-emerald-500/20 ml-auto"
                >
                    <Save size={18} /> {isSaving ? '...' : t('save')}
                </button>
            </div>

            {/* Week Tabs */}
            <div className="flex overflow-x-auto gap-1 pb-2 custom-scrollbar">
                {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => (
                    <button
                        key={dayIdx}
                        onClick={() => setActiveDay(dayIdx)}
                        className={`px-4 py-2 rounded-t-lg font-bold min-w-[100px] transition-colors ${activeDay === dayIdx
                            ? 'bg-slate-800 text-white border-t-2 border-indigo-500'
                            : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                    >
                        {t('weekDays')[dayIdx as any]}
                    </button>
                ))}
            </div>

            {/* Day Content */}
            <div className="bg-slate-800 p-6 rounded-b-lg rounded-tr-lg border border-slate-700 min-h-[500px]">

                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${currentDay.enabled ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${currentDay.enabled ? 'translate-x-6' : ''}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={currentDay.enabled} onChange={toggleDayEnabled} />
                        <span className="text-lg font-bold text-white">{t('enableDay')}</span>
                    </label>
                </div>

                {!currentDay.enabled ? (
                    <div className="text-center py-20 text-slate-500">
                        {t('weekDays')[activeDay as any]} {t('disabled')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentDay.activities.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)).map((act, idx) => (
                            <div key={act.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4 shadow-lg">
                                {/* Activity Header Row */}
                                <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
                                    <input
                                        type="text"
                                        value={act.name}
                                        onChange={e => updateActivity(act.id, 'name', e.target.value)}
                                        className="bg-transparent text-lg font-bold text-white border-b border-transparent hover:border-slate-500 focus:border-indigo-500 outline-none w-full md:w-auto"
                                        placeholder={t('activityName')}
                                    />
                                    <div className="flex-grow" />
                                    <button onClick={() => deleteActivity(act.id)} className="text-slate-500 hover:text-red-500"><Trash2 size={20} /></button>
                                </div>

                                {/* Start */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                                        <Clock size={16} /> {t('startBell')}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {/* Time & Bell */}
                                        <div className="flex gap-2">
                                            <input
                                                type="time"
                                                value={act.startTime}
                                                onChange={e => updateActivity(act.id, 'startTime', e.target.value)}
                                                className="bg-slate-800 border border-slate-600 rounded p-2 text-white w-28"
                                            />
                                            <select
                                                value={act.startSoundId}
                                                onChange={e => updateActivity(act.id, 'startSoundId', e.target.value)}
                                                className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm flex-grow w-0 min-w-0 truncate"
                                            >
                                                <option value="Melodi1.mp3">{t('defaultMelody')}</option>
                                                {bellFiles.map(f => (
                                                    <option key={f} value={f}>
                                                        {f.length > 111 ? f.substring(0, 111) + '...' : f}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={() => previewSound('bells', act.startSoundId)} className="p-2 text-indigo-400 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-indigo-600 transition-colors" title={t('preview')}>
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                            <button onClick={stopPreview} className="p-2 text-red-500 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-red-600 transition-colors" title={t('stop')}>
                                                <Square size={14} fill="currentColor" />
                                            </button>
                                        </div>
                                        {/* Announcement Selector */}
                                        <div className="flex gap-2 items-center pl-30"> {/* Indent if preferred or full width */}
                                            <span className="text-xs text-slate-400 font-bold w-28 text-right pr-2">{t('bellAnnouncement')}:</span>
                                            <select
                                                value={act.startAnnouncementId || "None"}
                                                onChange={e => updateActivity(act.id, 'startAnnouncementId', e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-300 text-xs flex-grow w-0 min-w-0 truncate"
                                            >
                                                <option value="None">{t('none')}</option>
                                                {announcementFiles.map(f => (
                                                    <option key={f} value={f}>
                                                        {f.length > 111 ? f.substring(0, 111) + '...' : f}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={() => previewSound('announcements', act.startAnnouncementId || "")} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-slate-600 transition-colors">
                                                <Play size={12} fill="currentColor" />
                                            </button>
                                            <button onClick={stopPreview} className="p-1.5 text-red-500 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-red-600 transition-colors" title={t('stop')}>
                                                <Square size={12} fill="currentColor" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* End */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                                        <Clock size={16} /> {t('endBell')}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {/* Time & Bell */}
                                        <div className="flex gap-2">
                                            <input
                                                type="time"
                                                value={act.endTime}
                                                onChange={e => updateActivity(act.id, 'endTime', e.target.value)}
                                                className="bg-slate-800 border border-slate-600 rounded p-2 text-white w-28"
                                            />
                                            <select
                                                value={act.endSoundId}
                                                onChange={e => updateActivity(act.id, 'endSoundId', e.target.value)}
                                                className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm flex-grow w-0 min-w-0 truncate"
                                            >
                                                <option value="Melodi1.mp3">{t('defaultMelody')}</option>
                                                {bellFiles.map(f => (
                                                    <option key={f} value={f}>
                                                        {f.length > 111 ? f.substring(0, 111) + '...' : f}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={() => previewSound('bells', act.endSoundId)} className="p-2 text-amber-500 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-amber-600 transition-colors" title={t('preview')}>
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                            <button onClick={stopPreview} className="p-2 text-red-500 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-red-600 transition-colors" title={t('stop')}>
                                                <Square size={14} fill="currentColor" />
                                            </button>
                                        </div>
                                        {/* Announcement Selector */}
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs text-slate-400 font-bold w-28 text-right pr-2">{t('bellAnnouncement')}:</span>
                                            <select
                                                value={act.endAnnouncementId || "None"}
                                                onChange={e => updateActivity(act.id, 'endAnnouncementId', e.target.value)}
                                                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-300 text-xs flex-grow w-0 min-w-0 truncate"
                                            >
                                                <option value="None">{t('none')}</option>
                                                {announcementFiles.map(f => (
                                                    <option key={f} value={f}>
                                                        {f.length > 111 ? f.substring(0, 111) + '...' : f}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={() => previewSound('announcements', act.endAnnouncementId || "")} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-slate-600 transition-colors">
                                                <Play size={12} fill="currentColor" />
                                            </button>
                                            <button onClick={stopPreview} className="p-1.5 text-red-500 hover:text-white bg-slate-800 rounded border border-slate-700 hover:bg-red-600 transition-colors" title={t('stop')}>
                                                <Square size={12} fill="currentColor" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Music Toggle */}
                                <div className="flex items-center gap-2">
                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${act.playMusic ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                        <input type="checkbox" className="hidden" checked={act.playMusic} onChange={e => updateActivity(act.id, 'playMusic', e.target.checked)} />
                                        <Music size={16} />
                                        <span className="text-sm font-medium">{t('playBreakMusic')}</span>
                                    </label>
                                </div>

                                {/* Interim Announcements */}
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Bell size={12} /> {t('interimAnnouncements')}
                                    </h4>
                                    <div className="space-y-2">
                                        {act.interimAnnouncements.map(ann => (
                                            <div key={ann.id} className="flex gap-2 items-center">
                                                <input type="checkbox" checked={ann.enabled} onChange={e => updateAnnouncement(act.id, ann.id, 'enabled', e.target.checked)} />
                                                <input
                                                    type="time"
                                                    value={ann.time}
                                                    onChange={e => updateAnnouncement(act.id, ann.id, 'time', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                />
                                                <select
                                                    value={ann.soundId}
                                                    onChange={e => updateAnnouncement(act.id, ann.id, 'soundId', e.target.value)}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white flex-grow w-0 min-w-0 truncate"
                                                >
                                                    <option value="isg1.mp3">{t('defaultAnnounce')}</option>
                                                    {announcementFiles.map(f => (
                                                        <option key={f} value={f}>
                                                            {f.length > 111 ? f.substring(0, 111) + '...' : f}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button onClick={() => previewSound('announcements', ann.soundId)} className="p-1 text-slate-400 hover:text-white" title={t('preview')}>
                                                    <Play size={12} fill="currentColor" />
                                                </button>
                                                <button onClick={stopPreview} className="p-1 text-slate-500 hover:text-red-500" title={t('stop')}>
                                                    <Square size={12} fill="currentColor" />
                                                </button>
                                                <button onClick={() => removeAnnouncement(act.id, ann.id)} className="text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        {act.interimAnnouncements.length < 3 && (
                                            <button onClick={() => addAnnouncement(act.id)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ {t('addAnnouncement')}</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addActivity}
                            className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-lg"
                        >
                            <Plus size={24} /> {t('addActivity')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
