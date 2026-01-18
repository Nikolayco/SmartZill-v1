
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Volume2, Globe, Download, Upload, AlertCircle, Palette, Power, Copy, Check, Headphones, Layers, Monitor, Radio, Music, FileJson, FileSpreadsheet, LayoutTemplate, Building2, RefreshCw, ChevronDown } from 'lucide-react';
import api from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

export default function SettingsView() {
    const { t, language, setLanguage, themeColor, setThemeColor } = useApp();
    const [bellVol, setBellVol] = useState(95);
    const [musicVol, setMusicVol] = useState(20);
    const [manualVol, setManualVol] = useState(50);
    const [companyName, setCompanyName] = useState("");
    const [startOnBoot, setStartOnBoot] = useState(true);
    const [appAutostart, setAppAutostart] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [frontendAutoOpen, setFrontendAutoOpen] = useState(true);
    const [ttsEngine, setTtsEngine] = useState(() => {
        // Try local storage first for immediate UI feedback, falling back to default
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ttsEngine') || "edge-tr-emel";
        }
        return "edge-tr-emel";
    });
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);

    const languagesList = [
        { code: 'bg', name: 'Български', flag: '[BG]' },
        { code: 'de', name: 'Deutsch', flag: '[DE]' },
        { code: 'en', name: 'English', flag: '[EN]' },
        { code: 'ru', name: 'Русский', flag: '[RU]' },
        { code: 'tr', name: 'Türkçe', flag: '[TR]' }
    ];

    const voiceOptions = [
        { id: 'edge-bg-borislav', name: 'Borislav (Erkek - Doğal)', flag: '[BG]' },
        { id: 'edge-bg-kalina', name: 'Kalina (Kadın - Doğal)', flag: '[BG]' },
        { id: 'edge-de-conrad', name: 'Conrad (Erkek - Doğal)', flag: '[DE]' },
        { id: 'edge-de-katja', name: 'Katja (Kadın - Doğal)', flag: '[DE]' },
        { id: 'edge-en-aria', name: 'Aria (Kadın - Doğal)', flag: '[EN]' },
        { id: 'edge-en-guy', name: 'Guy (Erkek - Doğal)', flag: '[EN]' },
        { id: 'gtts', name: 'Google TTS (Standart - Robotik)', flag: '🤖' },
        { id: 'edge-ru-dmitry', name: 'Dmitry (Erkek - Doğal)', flag: '[RU]' },
        { id: 'edge-ru-svetlana', name: 'Svetlana (Kadın - Doğal)', flag: '[RU]' },
        { id: 'edge-tr-ahmet', name: 'Alp (Erkek - Doğal)', flag: '[TR]' },
        { id: 'edge-tr-emel', name: 'Emel (Kadın - Doğal)', flag: '[TR]' }
    ];

    // ... (rest of states)

    const themeColors = [
        { name: "İndigo", value: "indigo" },
        { name: "Mavi", value: "blue" },
        { name: "Mor", value: "purple" },
        { name: "Pembe", value: "pink" },
        { name: "Kırmızı", value: "red" },
        { name: "Turuncu", value: "orange" },
        { name: "Yeşil", value: "emerald" },
        { name: "Turkuaz", value: "cyan" },
    ];

    // Renklerin görünmeme sorununu düzeltmek için Hex kodları
    const colorMap: Record<string, string> = {
        indigo: '#6366f1',
        blue: '#3b82f6',
        purple: '#a855f7',
        pink: '#ec4899',
        red: '#ef4444',
        orange: '#f97316',
        emerald: '#10b981',
        cyan: '#06b6d4',
    };
    const activeColor = colorMap[themeColor] || '#6366f1';

    useEffect(() => {
        const fetchStatus = () => {
            // ...
        }

        api.get('/status').then(res => {
            const d = res.data;
            if (d.volume_bell !== undefined) setBellVol(d.volume_bell);
            if (d.volume_music !== undefined) setMusicVol(d.volume_music);
            if (d.volume_manual !== undefined) setManualVol(d.volume_manual);
            if (d.company_name) setCompanyName(d.company_name);
            if (d.start_on_boot !== undefined) setStartOnBoot(d.start_on_boot);
            if (d.app_autostart_enabled !== undefined) setAppAutostart(d.app_autostart_enabled);
            if (d.streaming) setStreaming(d.streaming.enabled);
            if (d.frontend_auto_open !== undefined) setFrontendAutoOpen(d.frontend_auto_open);
            if (d.system_ip) setSystemIp(d.system_ip);
            if (d.tts_engine) setTtsEngine(d.tts_engine);
        }).catch(() => { });

        // ...

    }, []);

    const updateTtsEngine = async (val: string) => {
        setTtsEngine(val);
        localStorage.setItem('ttsEngine', val); // Persist to local storage
        try {
            await api.post('/settings/tts-engine', { engine: val });
        } catch (e) {
            console.error("Failed to update TTS engine");
        }
    };

    // --- HOST & UTILS ---
    const [systemIp, setSystemIp] = useState("127.0.0.1");
    const [copied, setCopied] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);
    const [saved, setSaved] = useState(false);
    const [systemVol, setSystemVol] = useState(50);

    const saveCompanyName = async () => {
        try {
            await api.post('/settings/company', { name: companyName });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { alert("Kaydedilemedi"); }
    };

    const toggleBoot = async (val: boolean) => {
        try {
            setStartOnBoot(val);
            await api.post('/settings/boot', { start_active: val });
        } catch (e) { }
    };

    const toggleAppAutostart = async (val: boolean) => {
        try {
            setAppAutostart(val);
            await api.post('/settings/app-autostart', { enabled: val });
        } catch (e) { }
    };

    const toggleStreaming = async (val: boolean) => {
        try {
            setStreaming(val);
            await api.post('/settings/streaming', { enabled: val, port: 5959 });
        } catch (e) { }
    };

    const toggleFrontendAutoOpen = async (val: boolean) => {
        try {
            setFrontendAutoOpen(val);
            await api.post('/settings/frontend-auto-open', { enabled: val });
        } catch (e) { }
    };

    const copyToClipboard = () => {
        const url = `http://${systemIp}:5959/stream`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const updateSystemVolume = async (val: number) => {
        setSystemVol(val);
        try {
            await api.post('/system/volume', { volume: val });
        } catch (e) { }
    };

    // --- AUDIO UTILS ---
    // --- AUDIO UTILS ---
    // Update local state ONLY (Visual)
    const updateLocalVolume = (type: 'bell' | 'music' | 'manual', val: number) => {
        if (type === 'bell') setBellVol(val);
        if (type === 'music') setMusicVol(val);
        if (type === 'manual') setManualVol(val);
    };

    // Commit to Backend (API Call)
    const commitVolumes = async () => {
        try {
            await api.post('/settings/volumes', {
                bell: bellVol,
                music: musicVol,
                manual: manualVol
            });
        } catch (e) {
            console.error("Volume save failed:", e);
        }
    };


    // --- BUTTON HANDLERS ---

    // Explicitly typed and bound inside component
    const handleExportJson = () => {
        const host = window.location.hostname;
        const port = "7777";
        window.location.href = `http://${host}:${port}/backup/download`;
    };

    const handleExportExcel = () => {
        const host = window.location.hostname;
        const port = "7777";
        window.location.href = `http://${host}:${port}/backup/export/excel`;
    };

    const handleDownloadTemplate = () => {
        const host = window.location.hostname;
        const port = "7777";
        window.location.href = `http://${host}:${port}/backup/template/excel`;
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        if (!confirm("Tüm ayarlar üzerine yazılacak. Devam edilsin mi?")) {
            e.target.value = ""; // Reset input
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        api.post('/backup/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(() => {
            alert("Yedek başarıyla yüklendi! Sayfa yenileniyor...");
            window.location.reload();
        }).catch(() => alert("Yedek yükleme başarısız! Dosya bozuk olabilir."));
    };

    const handleRestart = () => {
        // Trigger modal
        setShowRestartConfirm(true);
    };

    const executeRestart = () => {
        // The actual API call executed by the modal
        api.post('/control/restart').then(() => {
            // Wait briefly before reloading frontend, giving backend time to kill itself
            setTimeout(() => window.location.reload(), 3000);
        }).catch(() => alert("Yeniden başlatma komutu gönderilemedi."));
        setShowRestartConfirm(false);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className={`p-4 bg-${themeColor}-600 rounded-2xl shadow-lg`}>
                    <AlertCircle size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">Ayarlar</h1>
                    <p className="text-slate-400">Sistem ayarlarını yönetin</p>
                </div>
            </div>

            {/* Clean Single Page Layout - Stacked Categories */}
            <div className="space-y-8">

                {/* 1. GENERAL SETTINGS */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                        <Layers size={22} className={`text-${themeColor}-400`} />
                        {t('generalSettings')}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* Company Name */}
                            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Building2 size={20} className={`text-${themeColor}-400`} />
                                    {t('businessName')}
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className={`flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-${themeColor}-500`}
                                        placeholder="İşletme adı..."
                                    />
                                    <button
                                        onClick={saveCompanyName}
                                        disabled={saved}
                                        className={`px-6 py-3 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${saved ? 'bg-emerald-600 text-white cursor-default' : `bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white`}`}
                                    >
                                        {saved ? <><Check size={18} /> Kaydedildi!</> : t('save')}
                                    </button>
                                </div>
                            </div>

                            {/* Language Selection - Separate Card */}
                            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Globe size={20} className={`text-${themeColor}-400`} />
                                    {t('language')}
                                </h4>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 flex items-center justify-between text-white hover:border-slate-500 transition-all font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{languagesList.find(l => l.code === language)?.flag}</span>
                                            <span>{languagesList.find(l => l.code === language)?.name}</span>
                                        </div>
                                        <ChevronDown size={18} className={`transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''} text-slate-400`} />
                                    </button>

                                    {isLangMenuOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                            {languagesList.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => {
                                                        setLanguage(lang.code as any);
                                                        setIsLangMenuOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${language === lang.code
                                                        ? `bg-${themeColor}-600/20 text-white`
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{lang.flag}</span>
                                                        <span className="font-medium">{lang.name}</span>
                                                    </div>
                                                    {language === lang.code && <Check size={16} className={`text-${themeColor}-400`} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>

                        {/* Right Column: Combined Startup Configuration */}
                        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-full">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Monitor size={20} className={`text-${themeColor}-400`} />
                                {t('startupBehavior')}
                            </h3>

                            <div className="space-y-6">
                                {/* 1. App Autostart Row */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-slate-200 font-medium">{t('autoStartApp')}</label>
                                        <span className={`text-xs px-2 py-0.5 rounded ${appAutostart ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{appAutostart ? t('active_btn') : t('passive_btn')}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-3">{t('autoStartDesc')}</p>
                                    <div className="flex bg-slate-900 p-1.5 rounded-xl">
                                        <button
                                            onClick={() => toggleAppAutostart(true)}
                                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${appAutostart ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            {t('on')}
                                        </button>
                                        <button
                                            onClick={() => toggleAppAutostart(false)}
                                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${!appAutostart ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            {t('off')}
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-700/50"></div>

                                {/* 2. Frontend Auto-Open Row */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-slate-200 font-medium">{t('frontendAutoOpen')}</label>
                                        <span className={`text-xs px-2 py-0.5 rounded ${frontendAutoOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{frontendAutoOpen ? t('active_btn') : t('passive_btn')}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-3">{t('frontendAutoOpenDesc')}</p>
                                    <div className="flex bg-slate-900 p-1.5 rounded-xl">
                                        <button
                                            onClick={() => toggleFrontendAutoOpen(true)}
                                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${frontendAutoOpen ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            {t('on')}
                                        </button>
                                        <button
                                            onClick={() => toggleFrontendAutoOpen(false)}
                                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${!frontendAutoOpen ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            {t('off')}
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-700/50"></div>

                                {/* 3. Smart Schedule Row */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-slate-200 font-medium flex items-center gap-2">
                                            <Power size={16} className={`text-${themeColor}-400`} />
                                            {t('smartSchedule')}
                                        </label>
                                        <span className={`text-xs px-2 py-0.5 rounded ${startOnBoot ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{startOnBoot ? t('active_btn') : t('passive_btn')}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-3">{t('smartScheduleDesc')}</p>
                                    <div className="flex bg-slate-900 p-1.5 rounded-xl">
                                        <button
                                            onClick={() => toggleBoot(true)}
                                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${startOnBoot ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            {t('active_btn')}
                                        </button>
                                        <button
                                            onClick={() => toggleBoot(false)}
                                            className={`flex-1 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${!startOnBoot ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        >
                                            {t('passive_btn')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 2. AUDIO SETTINGS */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                        <Headphones size={22} className={`text-${themeColor}-400`} />
                        {t('audioSettings')}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Volume */}
                        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-full">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                                <Volume2 size={20} className={`text-${themeColor}-400`} />
                                {t('volume')}
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-semibold text-slate-300 mb-2 block">{t('bellVolume')}</label>
                                    <div className="relative h-10 w-full flex items-center group select-none">
                                        {/* Track Background */}
                                        <div className="absolute inset-0 bg-slate-900 rounded-xl border border-slate-700/50"></div>

                                        {/* Input range (Invisible overlay) */}
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={bellVol}
                                            onChange={(e) => updateLocalVolume('bell', parseInt(e.target.value))}
                                            onMouseUp={commitVolumes}
                                            onTouchEnd={commitVolumes}
                                            className="relative w-full h-full opacity-0 z-20 cursor-pointer"
                                        />

                                        {/* Filled Track */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 rounded-l-xl pointer-events-none transition-all duration-75"
                                            style={{ width: `${Math.max(5, bellVol)}%`, backgroundColor: activeColor, borderRadius: bellVol >= 98 ? '0.75rem' : '0.75rem 0 0 0.75rem' }}
                                        ></div>

                                        {/* Value Label inside bar */}
                                        <div className="absolute right-4 top-0 bottom-0 flex items-center pointer-events-none z-10">
                                            <span className="text-sm font-bold text-white drop-shadow-md bg-slate-900/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">{bellVol}%</span>
                                        </div>

                                        {/* Icon overlay */}
                                        <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none z-10 opacity-50">
                                            <Volume2 size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-300 mb-2 block">{t('musicVolLabel')} <span className="text-xs font-normal text-slate-500 ml-2">{t('musicVolDesc')}</span></label>
                                    <div className="relative h-10 w-full flex items-center group select-none">
                                        <div className="absolute inset-0 bg-slate-900 rounded-xl border border-slate-700/50"></div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={musicVol}
                                            onChange={(e) => updateLocalVolume('music', parseInt(e.target.value))}
                                            onMouseUp={commitVolumes}
                                            onTouchEnd={commitVolumes}
                                            className="relative w-full h-full opacity-0 z-20 cursor-pointer"
                                        />
                                        <div
                                            className="absolute left-0 top-0 bottom-0 rounded-l-xl pointer-events-none transition-all duration-75"
                                            style={{ width: `${Math.max(5, musicVol)}%`, backgroundColor: activeColor, borderRadius: musicVol >= 98 ? '0.75rem' : '0.75rem 0 0 0.75rem' }}
                                        ></div>
                                        <div className="absolute right-4 top-0 bottom-0 flex items-center pointer-events-none z-10">
                                            <span className="text-sm font-bold text-white drop-shadow-md bg-slate-900/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">{musicVol}%</span>
                                        </div>
                                        <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none z-10 opacity-50">
                                            <Music size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-300 mb-2 block">{t('manualVolLabel')} <span className="text-xs font-normal text-slate-500 ml-2">{t('manualVolDesc')}</span></label>
                                    <div className="relative h-10 w-full flex items-center group select-none">
                                        <div className="absolute inset-0 bg-slate-900 rounded-xl border border-slate-700/50"></div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={manualVol}
                                            onChange={(e) => updateLocalVolume('manual', parseInt(e.target.value))}
                                            onMouseUp={commitVolumes}
                                            onTouchEnd={commitVolumes}
                                            className="relative w-full h-full opacity-0 z-20 cursor-pointer"
                                        />
                                        <div
                                            className="absolute left-0 top-0 bottom-0 rounded-l-xl pointer-events-none transition-all duration-75"
                                            style={{ width: `${Math.max(5, manualVol)}%`, backgroundColor: activeColor, borderRadius: manualVol >= 98 ? '0.75rem' : '0.75rem 0 0 0.75rem' }}
                                        ></div>
                                        <div className="absolute right-4 top-0 bottom-0 flex items-center pointer-events-none z-10">
                                            <span className="text-sm font-bold text-white drop-shadow-md bg-slate-900/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10">{manualVol}%</span>
                                        </div>
                                        <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none z-10 opacity-50">
                                            <Headphones size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Voice Settings */}
                        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-full">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                                <Headphones size={20} className={`text-${themeColor}-400`} />
                                {t('voiceEngine')}
                            </h3>
                            <div className="space-y-4">
                                <p className="text-slate-400 text-sm">{t('selectVoiceEngine')}</p>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 flex items-center justify-between text-white hover:border-slate-500 transition-all font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{voiceOptions.find(v => v.id === ttsEngine)?.flag || '🤖'}</span>
                                            <span>{voiceOptions.find(v => v.id === ttsEngine)?.name || ttsEngine}</span>
                                        </div>
                                        <ChevronDown size={18} className={`transition-transform duration-200 ${isVoiceMenuOpen ? 'rotate-180' : ''} text-slate-400`} />
                                    </button>

                                    {isVoiceMenuOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                                            {voiceOptions.map((voice) => (
                                                <button
                                                    key={voice.id}
                                                    onClick={() => {
                                                        updateTtsEngine(voice.id);
                                                        setIsVoiceMenuOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${ttsEngine === voice.id
                                                        ? `bg-${themeColor}-600/20 text-white`
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{voice.flag}</span>
                                                        <span className="font-medium text-left">{voice.name}</span>
                                                    </div>
                                                    {ttsEngine === voice.id && <Check size={16} className={`text-${themeColor}-400 shrink-0 ml-2`} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Streaming & Devices */}
                        <div className="space-y-6">
                            {/* Streaming */}
                            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Radio size={20} className={`text-${themeColor}-400`} />
                                    {t('streaming')}
                                </h3>
                                <p className="text-slate-400 text-sm mb-4">{t('streamingDesc')}</p>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex items-start gap-3">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                    <p className="text-amber-200 text-xs font-medium">
                                        {t('ipNote')}
                                    </p>
                                </div>
                                <div className="flex bg-slate-900 p-1.5 rounded-xl mb-4">
                                    <button
                                        onClick={() => toggleStreaming(true)}
                                        className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${streaming ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${streaming ? 'bg-white' : 'bg-slate-600'}`}></span>
                                        {t('streamActive')}
                                    </button>
                                    <button
                                        onClick={() => toggleStreaming(false)}
                                        className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${!streaming ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${!streaming ? 'bg-white' : 'bg-slate-600'}`}></span>
                                        {t('streamPassive')}
                                    </button>
                                </div>
                                {streaming && (
                                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-600 mt-2">
                                        <p className="text-xs text-slate-400 mb-2 font-medium">{t('streamLink')}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-emerald-400 text-sm break-all select-all">
                                                http://{systemIp}:5959/stream
                                            </div>
                                            <button
                                                onClick={copyToClipboard}
                                                className={`p-2 rounded-lg transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                                                title={t('copy')}
                                            >
                                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>


                {/* 3. SYSTEM SETTINGS */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                        <Monitor size={22} className={`text-${themeColor}-400`} />
                        {t('systemAndTheme')}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Theme & Language */}
                        <div className="space-y-6">
                            {/* Theme */}
                            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Palette size={20} className={`text-${themeColor}-400`} />
                                    {t('themeColor')}
                                </h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {themeColors.map(theme => (
                                        <button
                                            key={theme.value}
                                            onClick={() => setThemeColor(theme.value)}
                                            className={`relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${themeColor === theme.value ? 'border-white scale-105 shadow-xl bg-slate-700' : 'border-slate-600 hover:border-slate-500 bg-slate-900'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full bg-${theme.value}-600 shadow-lg`}></div>
                                            <div className="text-[10px] font-bold text-slate-300">{(t('colors') as any)[theme.value]}</div>
                                            {themeColor === theme.value && <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 rounded-full shadow"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Language */}

                        </div>

                        {/* System Controls */}
                        <div className="space-y-6">
                            {/* Blocks Moved to General Settings */}
                            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Download size={20} className={`text-${themeColor}-400`} />
                                    {t('backupRestore')}
                                </h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleExportJson}
                                            className={`w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02]`}
                                        >
                                            <FileJson size={24} className={`text-${themeColor}-400`} />
                                            <span className="text-xs">Yedek (JSON)</span>
                                        </button>
                                        <button
                                            onClick={handleExportExcel}
                                            className={`w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02]`}
                                        >
                                            <FileSpreadsheet size={24} className={`text-${themeColor}-400`} />
                                            <span className="text-xs">Yedek (Excel)</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className={`w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02]`}
                                        >
                                            <LayoutTemplate size={24} className={`text-${themeColor}-400`} />
                                            <span className="text-xs">Şablon İndir</span>
                                        </button>
                                        <label className="block h-full">
                                            <input type="file" accept=".json,.xlsx,.xls" onChange={handleImport} className="hidden" />
                                            <div className={`w-full h-full px-4 py-3 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg transition-all hover:scale-[1.02]`}>
                                                <Upload size={24} />
                                                <span className="text-center text-xs">Yedek Yükle</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {/* System Restart */}
                            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <RefreshCw size={20} className={`text-${themeColor}-400`} />
                                    {t('appControl')}
                                </h3>
                                <button
                                    onClick={handleRestart}
                                    className={`w-full px-6 py-3 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all`}
                                >
                                    <AlertCircle size={18} />
                                    {t('restartApp')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <ConfirmModal
                isOpen={showRestartConfirm}
                onConfirm={executeRestart}
                onCancel={() => setShowRestartConfirm(false)}
                title="Uygulamayı Yeniden Başlat"
                message="Uygulama yeniden başlatılacak. Bu işlem devam eden sesleri durdurabilir. Devam etmek istiyor musunuz?"
                confirmText="Evet, Başlat"
                cancelText="İptal"
                isDanger={true}
            />
        </div>
    );
}
