import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Megaphone, Play, Square, Trash2, Clock } from 'lucide-react';
import api from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

export default function AnnouncementsView() {
    const { t } = useApp();
    const [files, setFiles] = useState<string[]>([]);
    const [playing, setPlaying] = useState<string | null>(null);
    const [ttsText, setTtsText] = useState("");
    const [ttsLoading, setTtsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await api.get('/files/announcements');
            setFiles(res.data);
        } catch (e) {
            console.error("Failed to load announcements");
        }
    };

    const confirmDelete = (filename: string) => {
        setFileToDelete(filename);
        setShowDeleteConfirm(true);
    };

    const deleteFile = async () => {
        if (!fileToDelete) return;
        try {
            await api.delete(`/files/announcements/${fileToDelete}`);
            setShowDeleteConfirm(false);
            setFileToDelete(null);
            fetchFiles();
        } catch (e) {
            alert("Silme işlemi başarısız!");
            setShowDeleteConfirm(false);
            setFileToDelete(null);
        }
    };

    const playAnnouncement = async (filename: string) => {
        try {
            setPlaying(filename);
            // Use preview endpoint to play ad-hoc. 
            // Ideally we should have a dedicated /control/announce but preview does the job (plays alert).
            await api.post('/control/preview', { folder: 'announcements', filename });
            setPlaying(null);
        } catch (e) {
            setPlaying(null);
        }
    };

    const playTTS = async () => {
        if (!ttsText.trim()) return;
        setTtsLoading(true);
        try {
            await api.post('/control/tts_announce', { text: ttsText });
            setTtsText(""); // Clear after sending
        } catch (e) {
            alert("TTS işlemi başarısız oldu. İnternet bağlantısını kontrol edin.");
        } finally {
            setTtsLoading(false);
        }
    };

    const stopPlayback = async () => {
        await api.post('/control/stop');
        setPlaying(null);
    };

    const regularFiles = files.filter(f => !f.startsWith('temp_tts_'));
    const tempFiles = files.filter(f => f.startsWith('temp_tts_'));

    // Convert timestamp in filename to readable date and extract slug
    const formatTempName = (filename: string) => {
        // Matches temp_tts_{timestamp}__{slug}.mp3 or legacy temp_tts_{timestamp}.mp3
        const match = filename.match(/temp_tts_(\d+)(?:__(.*))?\.mp3/);
        if (match) {
            const timestamp = parseInt(match[1]);
            const slug = match[2];
            const date = new Date(timestamp * 1000);
            const dateStr = date.toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            if (slug) {
                // Restore logic from python slugify: replace _ with space
                return `${dateStr} - ${slug.replace(/_/g, ' ')}`;
            }
            return dateStr;
        }
        return filename;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-600 rounded-2xl shadow-lg">
                    <Megaphone size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">{t('announcements')}</h1>
                    <p className="text-slate-400">{t('generalAnnouncementsDesc')}</p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 p-6 rounded-2xl border border-amber-500/20">

                {/* TTS Section */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-500/10">
                    <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        {t('ttsHeader')}
                    </h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={ttsText}
                            onChange={(e) => setTtsText(e.target.value)}
                            placeholder={t('ttsPlaceholder')}
                            className="bg-slate-900 text-white border border-slate-700 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-amber-500 transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && playTTS()}
                        />
                        <button
                            onClick={playTTS}
                            disabled={!ttsText || ttsLoading}
                            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${ttsText ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            {ttsLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Megaphone size={20} />}
                            {ttsLoading ? t('generating') : t('read')}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 ml-1">
                        {t('ttsNote')}
                    </p>
                </div>

                {/* Temp / History Section */}
                {tempFiles.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-amber-500/20">
                        <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                            <Clock size={16} />
                            Geçmiş Anlık Duyurular
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {tempFiles.slice().reverse().map(f => (
                                <div key={f} className="relative group">
                                    <button
                                        onClick={() => playing === f ? stopPlayback() : playAnnouncement(f)}
                                        className={`w-full h-12 rounded-lg flex items-center px-3 gap-3 transition-all border text-left
                                            ${playing === f
                                                ? 'bg-amber-600/20 text-white border-amber-500/50'
                                                : 'bg-slate-900/40 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-amber-200'}
                                        `}
                                    >
                                        {playing === f ? <Square size={16} fill="currentColor" /> : <Play size={16} />}
                                        <span className="text-xs font-mono">{formatTempName(f)}</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); confirmDelete(f); }}
                                        className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-slate-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {regularFiles.map(f => (
                    <div key={f} className="relative group">
                        <button
                            onClick={() => playing === f ? stopPlayback() : playAnnouncement(f)}
                            className={`
                                w-full relative h-32 rounded-xl flex flex-col items-center justify-center gap-3 transition-all border
                                ${playing === f
                                    ? 'bg-amber-600 text-white border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-95'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:text-white'}
                            `}
                        >
                            {playing === f ? <Square size={32} fill="currentColor" /> : <Play size={32} />}
                            <span className="font-medium text-center px-4 truncate w-full text-sm">{f.replace('.mp3', '')}</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); confirmDelete(f); }}
                            className="absolute top-2 right-2 p-2 bg-slate-900/80 text-slate-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {regularFiles.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-500 italic">
                        {t('noAnnouncements')}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title={t('deleteFileTitle')}
                message={t('deleteFileMessage').replace('{item}', fileToDelete || '')}
                onConfirm={deleteFile}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setFileToDelete(null);
                }}
                confirmText={t('confirmDelete')}
                cancelText={t('cancel')}
                isDanger={true}
            />
        </div>
    );
}
