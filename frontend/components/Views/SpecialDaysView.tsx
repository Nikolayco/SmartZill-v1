import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, Clock, Upload, Download, Plus, Trash2, Save, Gift, Play, Square, UserPlus, MessageSquare, Edit2, X, Users, User } from 'lucide-react';
import api from '../../lib/api';
import ConfirmModal from '../ConfirmModal';
import { translations } from '../../lib/translations';

interface Person {
    name: string;
    date: string; // MM-DD format
}

interface SpecialDaysConfig {
    enabled: boolean;
    announcement_times: string[];
    template: string;
}

export default function SpecialDaysView() {
    const { t, themeColor, language } = useApp();
    const [config, setConfig] = useState<SpecialDaysConfig>({
        enabled: true,
        announcement_times: ["09:00", "14:00"],
        template: t('defaultBirthdayMessage')
    });
    const [people, setPeople] = useState<Person[]>([]);
    const [newName, setNewName] = useState("");
    const [newDate, setNewDate] = useState("");
    const [time1, setTime1] = useState("09:00");
    const [time2, setTime2] = useState("14:00");
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [sortMethod, setSortMethod] = useState<'date' | 'name'>('date');

    const sortList = (list: Person[], method: 'date' | 'name') => {
        return [...list].sort((a, b) => {
            if (method === 'name') {
                return a.name.localeCompare(b.name, 'tr');
            } else {
                const getMD = (d: string) => {
                    const parts = d.split('-');
                    if (parts.length === 3) return `${parts[1]}-${parts[2]}`;
                    return d;
                };
                return getMD(a.date).localeCompare(getMD(b.date));
            }
        });
    };

    const handleSortChange = (method: 'date' | 'name') => {
        setSortMethod(method);
        setPeople(prev => sortList(prev, method));
    };

    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Edit States
    const [showEditModal, setShowEditModal] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editNameValue, setEditNameValue] = useState("");
    const [editDateValue, setEditDateValue] = useState("");

    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [modalMessage, setModalMessage] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    // Dil değiştiğinde template'i güncelle (eğer varsayılan template kullanılıyorsa)
    // Dil değiştiğinde template'i güncelle (eğer varsayılan template kullanılıyorsa)
    useEffect(() => {
        const currentTemplate = config.template;
        const availableLangs: (keyof typeof translations)[] = ['tr', 'en', 'de', 'ru', 'bg'];

        // Mevcut şablon herhangi bir dilin varsayılan şablonu mu?
        const isDefaultTemplate = availableLangs.some(lang =>
            translations[lang].defaultBirthdayMessage === currentTemplate
        );

        if (isDefaultTemplate) {
            const newDefault = translations[language].defaultBirthdayMessage;
            if (newDefault && newDefault !== currentTemplate) {
                setConfig(prev => ({ ...prev, template: newDefault }));
            }
        }
    }, [language, config.template]);

    const loadData = async () => {
        try {
            const res = await api.get('/special-days');
            if (res.data.config) {
                setConfig(res.data.config);
                const times = res.data.config.announcement_times || ["09:00", "14:00"];
                setTime1(times[0] || "09:00");
                setTime2(times[1] || "14:00");
            }
            if (res.data.people) {
                // Apply current sort method
                setPeople(sortList(res.data.people, sortMethod));
            }
        } catch (e) {
            console.error("Failed to load special days:", e);
        }
    };

    const saveConfig = async () => {
        try {
            const updatedConfig = {
                ...config,
                announcement_times: [time1, time2]
            };
            await api.post('/special-days/config', updatedConfig);
            setModalMessage("Ayarlar başarıyla kaydedildi!");
            setShowSuccessModal(true);
        } catch (e) {
            setModalMessage("Ayarlar kaydedilirken hata oluştu!");
            setShowErrorModal(true);
        }
    };

    const savePeople = async () => {
        try {
            await api.post('/special-days/people', people);
            setModalMessage("Kişi listesi başarıyla kaydedildi!");
            setShowSuccessModal(true);
        } catch (e) {
            setModalMessage("Liste kaydedilirken hata oluştu!");
            setShowErrorModal(true);
        }
    };

    const addPerson = async () => {
        if (!newName || !newDate) {
            setModalMessage("Lütfen isim ve tarih alanlarını doldurun!");
            setShowErrorModal(true);
            return;
        }

        // Keep YYYY-MM-DD format for full date support
        const newPerson = { name: newName, date: newDate };
        const updatedPeople = sortList([...people, newPerson], sortMethod);

        // Update local state
        setPeople(updatedPeople);
        setNewName("");
        setNewDate("");

        // Auto-save to backend
        try {
            await api.post('/special-days/people', updatedPeople);
            setModalMessage(`${newName} başarıyla eklendi ve kaydedildi!`);
            setShowSuccessModal(true);
        } catch (e) {
            setModalMessage(`${newName} eklendi ancak kaydedilemedi! Lütfen "Kaydet" butonuna basın.`);
            setShowErrorModal(true);
        }
    };

    const openEditModal = (index: number) => {
        const person = people[index];
        setEditIndex(index);
        setEditNameValue(person.name);
        setEditDateValue(person.date);
        setShowEditModal(true);
    };

    const saveEdit = async () => {
        if (editIndex === null) return;

        if (!editNameValue || !editDateValue) {
            // Basic validation
            return;
        }

        // Create new list: Remove old item, add new item (conceptually), or just update value then resort
        const updatedList = [...people];
        updatedList[editIndex] = { name: editNameValue, date: editDateValue };

        // Resort to maintain order
        const sortedList = sortList(updatedList, sortMethod);

        setPeople(sortedList);
        setShowEditModal(false);
        setEditIndex(null);

        // Auto-save
        try {
            await api.post('/special-days/people', sortedList);
            setModalMessage("Kişi başarıyla güncellendi!");
            setShowSuccessModal(true);
        } catch (e) {
            setModalMessage("Güncellendi ancak kaydedilemedi!");
            setShowErrorModal(true);
        }
    };

    const confirmDelete = (index: number) => {
        setDeleteIndex(index);
        setShowDeleteConfirm(true);
    };

    const removePerson = async () => {
        if (deleteIndex !== null) {
            const personName = people[deleteIndex].name;
            const updatedPeople = people.filter((_, i) => i !== deleteIndex);

            // Update local state
            setPeople(updatedPeople);
            setShowDeleteConfirm(false);
            setDeleteIndex(null);

            // Auto-save to backend
            try {
                await api.post('/special-days/people', updatedPeople);
                setModalMessage(`${personName} başarıyla silindi ve kaydedildi!`);
                setShowSuccessModal(true);
            } catch (e) {
                setModalMessage(`${personName} silindi ancak kaydedilemedi! Lütfen "Kaydet" butonuna basın.`);
                setShowErrorModal(true);
            }
        }
    };

    const playAnnouncement = async (name: string, index: number) => {
        setPlayingIndex(index);
        try {
            await api.post('/special-days/announce', { name });

            // Auto reset after 20 seconds (estimated duration limit)
            setTimeout(() => {
                setPlayingIndex((current) => current === index ? null : current);
            }, 20000);

        } catch (e) {
            setModalMessage("Duyuru çalınırken hata oluştu!");
            setShowErrorModal(true);
            setPlayingIndex(null);
        }
    };

    const stopAnnouncement = async () => {
        try {
            await api.post('/special-days/stop');
            setPlayingIndex(null);
        } catch (e) {
            setModalMessage("Duyuru durdurulurken hata oluştu!");
            setShowErrorModal(true);
        }
    };

    const downloadTemplate = () => {
        window.location.href = "http://localhost:7777/special-days/template";
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/special-days/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setModalMessage(`${res.data.count} kişi başarıyla yüklendi!`);
            setShowSuccessModal(true);
            loadData();
        } catch (e) {
            setModalMessage("Dosya yüklenirken hata oluştu!");
            setShowErrorModal(true);
        }
    };

    // Format date for display
    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            // YYYY-MM-DD -> DD.MM.YYYY
            return `${parts[2]}.${parts[1]}.${parts[0]}`;
        } else if (parts.length === 2) {
            // MM-DD -> DD.MM
            return `${parts[1]}.${parts[0]}`;
        }
        return dateStr;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className={`p-4 bg-${themeColor}-600 rounded-2xl shadow-lg`}>
                    <Gift size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">{t('specialDays')}</h1>
                    <p className="text-slate-400">{t('manageBirthdays')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column - All Settings */}
                <div className="space-y-6">

                    {/* 1. Sistem Durumu */}
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar size={20} className={`text-${themeColor}-400`} />
                            {t('systemStatus')}
                        </h3>
                        <div className="flex bg-slate-900 p-1.5 rounded-xl">
                            <button
                                onClick={() => setConfig({ ...config, enabled: true })}
                                className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${config.enabled
                                    ? `bg-${themeColor}-600 text-white shadow-lg`
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {t('active_btn')}
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, enabled: false })}
                                className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${!config.enabled
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {t('passive_btn')}
                            </button>
                        </div>
                    </div>

                    {/* 2. Yeni Kişi Ekle */}
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <UserPlus size={20} className={`text-${themeColor}-400`} />
                            {t('addPerson')}
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder={t('nameSurname')}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                onClick={addPerson}
                                className={`w-full px-6 py-3 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2`}
                            >
                                <Plus size={20} />
                                {t('add')}
                            </button>
                        </div>
                    </div>

                    {/* 3. Duyuru Şablonu */}
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className={`text-${themeColor}-400`} />
                            {t('announcementTemplate')}
                        </h3>
                        <p className="text-slate-400 text-sm mb-3">
                            <code className="bg-slate-900 px-2 py-1 rounded text-emerald-400">{"{name}"}</code> {t('announcementPlaceholder').replace('{name}', '')}
                        </p>
                        <textarea
                            value={config.template}
                            onChange={(e) => setConfig({ ...config, template: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 min-h-[100px]"
                            placeholder="Duyuru metni..."
                        />
                    </div>

                    {/* 4. Duyuru Saatleri */}
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Clock size={20} className={`text-${themeColor}-400`} />
                            {t('announcementTimes')}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">{t('firstAnnouncementTime')}</label>
                                <input
                                    type="time"
                                    value={time1}
                                    onChange={(e) => setTime1(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">{t('secondAnnouncementTime')}</label>
                                <input
                                    type="time"
                                    value={time2}
                                    onChange={(e) => setTime2(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 5. Excel İçe/Dışa Aktarma */}
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Upload size={20} className={`text-${themeColor}-400`} />
                            {t('excelOperations')}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={downloadTemplate}
                                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                            >
                                <Download size={20} />
                                <span className="text-sm">{t('template')}</span>
                            </button>
                            <label className="block h-full">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className={`h-full px-4 py-3 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all`}>
                                    <Upload size={20} />
                                    <span className="text-sm">{t('upload')}</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={saveConfig}
                        className={`w-full px-6 py-3 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2`}
                    >
                        <Save size={20} />
                        {t('saveSettings')}
                    </button>
                </div>

                {/* Right Column - People List */}
                <div className="space-y-6">

                    {/* People List */}
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-full flex flex-col">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users size={24} className={`text-${themeColor}-400`} />
                                {t('savedPeople')}
                                <span className="text-slate-500 text-sm font-normal">({people.length})</span>
                            </h3>

                            <div className="flex items-center gap-2">
                                {/* Sort Controls */}
                                <div className="flex bg-slate-900 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleSortChange('date')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortMethod === 'date' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        title={t('sortByDate')}
                                    >
                                        <Calendar size={14} className="inline mr-1" /> {t('date')}
                                    </button>
                                    <button
                                        onClick={() => handleSortChange('name')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${sortMethod === 'name' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        title={t('sortByName')}
                                    >
                                        <UserPlus size={14} className="inline mr-1" /> {t('name')}
                                    </button>
                                </div>

                                <button
                                    onClick={savePeople}
                                    className={`px-4 py-2 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold rounded-lg transition-all flex items-center gap-2 text-sm`}
                                >
                                    <Save size={16} />
                                    {t('save')}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 flex-grow overflow-y-auto min-h-[500px] custom-scrollbar pr-1">
                            {people.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">Henüz kişi eklenmemiş</p>
                            ) : (
                                people.map((person, index) => {
                                    // Check if today
                                    const today = new Date();
                                    const month = String(today.getMonth() + 1).padStart(2, '0');
                                    const day = String(today.getDate()).padStart(2, '0');
                                    const isToday = person.date.endsWith(`-${month}-${day}`);

                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-center justify-between p-4 rounded-xl transition-all border group ${isToday
                                                ? `bg-lime-900/30 border-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.3)]`
                                                : 'bg-slate-900 border-slate-800 hover:bg-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isToday ? 'bg-lime-500 text-lime-950' : `bg-${themeColor}-900 text-${themeColor}-400`
                                                    }`}>
                                                    {person.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-lg ${isToday ? 'text-lime-400' : 'text-white'}`}>
                                                        {person.name}
                                                        {isToday && <span className="ml-2 text-xs bg-lime-500 text-lime-950 px-2 py-0.5 rounded-full font-bold animate-pulse">BUGÜN!</span>}
                                                    </p>
                                                    <p className={`text-sm font-mono flex items-center gap-2 ${isToday ? 'text-lime-200/70' : 'text-slate-400'}`}>
                                                        <Calendar size={12} />
                                                        {formatDateForDisplay(person.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                {playingIndex === index ? (
                                                    <button
                                                        onClick={stopAnnouncement}
                                                        className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-lg hover:shadow-red-900/50"
                                                        title="Duyuruyu Durdur"
                                                    >
                                                        <Square size={18} className="animate-pulse" fill="currentColor" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => playAnnouncement(person.name, index)}
                                                        className={`p-3 rounded-lg transition-all ${isToday ? 'bg-lime-800 text-lime-200 hover:bg-lime-600 hover:text-white' : 'bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white'
                                                            }`}
                                                        title="Duyuruyu Çal"
                                                    >
                                                        <Play size={18} fill="currentColor" />
                                                    </button>
                                                )}

                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => openEditModal(index)}
                                                    className="p-3 bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-all"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 size={18} />
                                                </button>

                                                <button
                                                    onClick={() => confirmDelete(index)}
                                                    className="p-3 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-all"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                            <h3 className="font-bold flex items-center gap-2 text-slate-200">
                                <Edit2 size={20} className="text-indigo-400" />
                                {t('editPerson')}
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-1 block">{t('nameSurname')}</label>
                                <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-300 mb-1 block">{t('birthDate')}</label>
                                <input
                                    type="date"
                                    value={editDateValue}
                                    onChange={(e) => setEditDateValue(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 bg-slate-950/50 border-t border-slate-800">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={saveEdit}
                                className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95"
                            >
                                {t('save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <ConfirmModal
                isOpen={showSuccessModal}
                title="Başarılı"
                message={modalMessage}
                onConfirm={() => setShowSuccessModal(false)}
                onCancel={() => setShowSuccessModal(false)}
                confirmText="Tamam"
                cancelText=""
                isDanger={false}
            />

            {/* Error Modal */}
            <ConfirmModal
                isOpen={showErrorModal}
                title="Hata"
                message={modalMessage}
                onConfirm={() => setShowErrorModal(false)}
                onCancel={() => setShowErrorModal(false)}
                confirmText="Tamam"
                cancelText=""
                isDanger={true}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Kişiyi Sil"
                message={`${deleteIndex !== null && people[deleteIndex] ? people[deleteIndex].name : ''} adlı kişiyi silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`}
                onConfirm={removePerson}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setDeleteIndex(null);
                }}
                confirmText="Evet, Sil"
                cancelText="İptal"
                isDanger={true}
            />
        </div>
    );
}
