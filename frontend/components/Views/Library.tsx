import { useState, useEffect } from 'react';
import { Upload, Music, AlertTriangle, Bell, Radio, Play, Square, Save, Trash2, Plus, Edit } from 'lucide-react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';

interface FileSectionProps {
    type: 'music' | 'announcements' | 'bells';
    title: string;
    icon: any;
}

import ConfirmModal from '../ConfirmModal';

function FileSection({ type, title, icon: Icon }: FileSectionProps) {
    const { t } = useApp();
    const [files, setFiles] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    const fetchFiles = async () => {
        try {
            const res = await api.get(`/files/${type}`);
            setFiles(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            setFiles([]);
        }
    };

    useEffect(() => { fetchFiles(); }, [type]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const formData = new FormData();
        Array.from(e.target.files).forEach(file => {
            formData.append('files', file);
        });

        try {
            await api.post(`/files/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchFiles();
        } catch (e) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClick = (filename: string) => {
        setFileToDelete(filename);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;
        try {
            await api.delete(`/files/${type}/${fileToDelete}`);
            fetchFiles();
        } catch (e) {
            alert("Delete failed");
        } finally {
            setDeleteModalOpen(false);
            setFileToDelete(null);
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3 mb-6">
                <Icon className="text-indigo-400" size={24} />
                <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>

            <div className="mb-4">
                <label className="block w-full cursor-pointer bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-3 text-center transition-colors group">
                    <span className="flex items-center justify-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                        <Upload size={18} /> {uploading ? '...' : t('uploadFile')}
                    </span>
                    <input type="file" className="hidden" accept=".mp3" multiple onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {(!files || files.length === 0) ? (
                    <div className="text-center text-slate-500 py-4 italic text-sm">{t('noEvents').replace('activities', 'files')}</div>
                ) : (
                    files.map((file, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-3 bg-slate-900/50 rounded border border-slate-700/50 text-slate-300 group">
                            <span className="truncate">{file}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDeleteClick(file)} className="text-slate-500 hover:text-red-500 transition-colors" title={t('delete')}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModalOpen}
                title={t('deleteConfirmTitle')}
                message={t('deleteConfirmMessage').replace('{item}', fileToDelete || '')}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
                isDanger={true}
                confirmText={t('confirmDelete')}
                cancelText={t('cancel')}
            />
        </div>
    );
}

export default function Library() {
    const { t } = useApp();
    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg">
                    <Music size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">{t('files')}</h1>
                    <p className="text-slate-400">{t('libraryDesc')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FileSection type="music" title={t('music')} icon={Music} />
                <FileSection type="bells" title={t('bell')} icon={Bell} />
                <FileSection type="announcements" title={t('announcements')} icon={AlertTriangle} />
            </div>

            {/* Future: Radio section */}
            {/* Radio Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Radio className="text-pink-500" size={24} />
                    <h2 className="text-xl font-bold text-white">{t('sourceRadio')}</h2>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 space-y-6">
                    <RadioManager />
                </div>
            </div>
        </div>
    )
}

function RadioManager() {
    const { t } = useApp();
    const [stations, setStations] = useState<{ name: string, url: string }[]>([]);
    const [newUrl, setNewUrl] = useState("");
    const [newName, setNewName] = useState("");
    const [currentUrl, setCurrentUrl] = useState("");
    const [source, setSource] = useState("local");

    // Edit Mode State
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        api.get('/status').then(res => {
            if (res.data.radio_stations) setStations(res.data.radio_stations);
            if (res.data.radio_url) setCurrentUrl(res.data.radio_url);
            if (res.data.music_source) setSource(res.data.music_source);
        });
    }, []);

    const saveSettings = async (updatedStations: any[], updatedSource?: string, updatedUrl?: string) => {
        try {
            await api.post('/settings/radio', {
                url: updatedUrl ?? currentUrl,
                stations: updatedStations,
                source: updatedSource ?? source
            });
            // Update local state
            setStations(updatedStations);
            if (updatedSource) setSource(updatedSource);
            if (updatedUrl) setCurrentUrl(updatedUrl);
        } catch (e) {
            alert(t('save') + " Failed");
        }
    };

    const handleSaveStation = () => {
        if (!newUrl || !newName) return;

        let newStations = [...stations];

        if (editingIndex !== null) {
            // Update existing
            newStations[editingIndex] = { name: newName, url: newUrl };
            setEditingIndex(null);
        } else {
            // Add new
            newStations.push({ name: newName, url: newUrl });
        }

        saveSettings(newStations);
        setNewName("");
        setNewUrl("");
    };

    const editStation = (index: number) => {
        const s = stations[index];
        setNewName(s.name);
        setNewUrl(s.url);
        setEditingIndex(index);
    };

    const cancelEdit = () => {
        setNewName("");
        setNewUrl("");
        setEditingIndex(null);
    }

    const removeStation = (idx: number) => {
        if (!confirm(t('delete') + "?")) return;
        const newStations = stations.filter((_, i) => i !== idx);
        saveSettings(newStations);
        if (editingIndex === idx) cancelEdit();
    };

    return (
        <div className="space-y-6">
            {/* Source Toggle */}
            <div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">{t('musicSource')}</h3>
                <div className="flex bg-slate-950 p-1 rounded-lg w-fit border border-slate-700">
                    <button
                        onClick={() => saveSettings(stations, 'local')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${source === 'local' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Music size={16} /> MP3
                    </button>
                    <button
                        onClick={() => saveSettings(stations, 'radio')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${source === 'radio' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Radio size={16} /> Radio
                    </button>
                </div>
            </div>

            {/* Add/Edit Station */}
            <div className={`bg-slate-950 p-4 rounded-lg border transition-colors space-y-3 ${editingIndex !== null ? 'border-amber-500/50' : 'border-slate-700'}`}>
                <h3 className={`font-bold text-sm flex items-center gap-2 ${editingIndex !== null ? 'text-amber-400' : 'text-white'}`}>
                    {editingIndex !== null ? <Edit size={16} /> : <Plus size={16} />}
                    {editingIndex !== null ? t('editStation') : t('addStation')}
                </h3>

                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        placeholder={t('stationName')}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm flex-grow md:w-1/3 focus:border-indigo-500 outline-none"
                    />
                    <input
                        type="text"
                        placeholder={t('radioUrl')}
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm flex-grow font-mono focus:border-indigo-500 outline-none"
                    />

                    <button onClick={handleSaveStation} className={`px-4 py-2 rounded font-bold text-sm text-white transition-colors ${editingIndex !== null ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {editingIndex !== null ? t('save') : t('add')}
                    </button>

                    {editingIndex !== null && (
                        <button onClick={cancelEdit} className="px-3 py-2 rounded font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600">
                            X
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {stations.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded border transition-colors ${currentUrl === s.url ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900 border-slate-700'} ${editingIndex === i ? 'ring-1 ring-amber-500/50' : ''}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Radio size={16} className={currentUrl === s.url ? "text-indigo-400" : "text-slate-500"} />
                            <div className="min-w-0">
                                <div className="text-white font-medium text-sm truncate">{s.name}</div>
                                <div className="text-slate-500 text-xs font-mono break-all">{s.url}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {/* Test Buttons */}
                            <button
                                onClick={() => {
                                    api.post('/settings/radio', {
                                        url: s.url,
                                        stations: stations,
                                        source: 'radio'
                                    });
                                    api.post('/control/manual_music', { enable: true });
                                }}
                                className="p-1.5 rounded-md bg-emerald-700/50 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-600/50 transition-colors"
                                title="Test Play"
                            >
                                <Play size={12} fill="currentColor" />
                            </button>
                            <button
                                onClick={() => api.post('/control/stop')}
                                className="p-1.5 rounded-md bg-red-900/50 text-red-300 hover:bg-red-700 hover:text-white border border-red-700/50 transition-colors"
                                title="Stop Test"
                            >
                                <Square size={12} fill="currentColor" />
                            </button>

                            {/* Play Selection Button */}
                            <button
                                onClick={() => saveSettings(stations, undefined, s.url)}
                                className={`text-xs px-2 py-1 rounded border ${currentUrl === s.url ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
                            >
                                {currentUrl === s.url ? t('selected') : t('select')}
                            </button>

                            <button onClick={() => editStation(i)} className="text-slate-500 hover:text-amber-400 transition-colors" title={t('edit')}>
                                <Edit size={16} />
                            </button>

                            <button onClick={() => removeStation(i)} className="text-slate-500 hover:text-red-500 transition-colors" title={t('delete')}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {stations.length === 0 && <div className="text-slate-500 text-center italic text-sm">{t('noRadioStations')}</div>}
            </div>
        </div>
    );
}
