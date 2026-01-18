import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Calendar, ToggleLeft, ToggleRight, PartyPopper } from 'lucide-react';

interface Holiday {
    date: string;
    name: string;
    is_past: boolean;
    is_today: boolean;
}

export default function HolidaysView() {
    const { t, language } = useApp();
    const [skippedIds, setSkippedIds] = useState<string[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [country, setCountry] = useState("TR");

    const countries = [
        { code: "DE", name: "[DE] Almanya" },
        { code: "US", name: "[US] Amerika" },
        { code: "AR", name: "[AR] Arjantin" },
        { code: "AU", name: "[AU] Avustralya" },
        { code: "AT", name: "[AT] Avusturya" },
        { code: "AE", name: "[AE] BAE" },
        { code: "BE", name: "[BE] Belçika" },
        { code: "BR", name: "[BR] Brezilya" },
        { code: "BG", name: "[BG] Bulgaristan" },
        { code: "CZ", name: "[CZ] Çekya" },
        { code: "CN", name: "[CN] Çin" },
        { code: "DK", name: "[DK] Danimarka" },
        { code: "FI", name: "[FI] Finlandiya" },
        { code: "FR", name: "[FR] Fransa" },
        { code: "ZA", name: "[ZA] Güney Afrika" },
        { code: "KR", name: "[KR] Güney Kore" },
        { code: "IN", name: "[IN] Hindistan" },
        { code: "NL", name: "[NL] Hollanda" },
        { code: "GB", name: "[GB] İngiltere" },
        { code: "ES", name: "[ES] İspanya" },
        { code: "CH", name: "[CH] İsviçre" },
        { code: "SE", name: "[SE] İsveç" },
        { code: "IT", name: "[IT] İtalya" },
        { code: "JP", name: "[JP] Japonya" },
        { code: "CA", name: "[CA] Kanada" },
        { code: "MX", name: "[MX] Meksika" },
        { code: "EG", name: "[EG] Mısır" },
        { code: "NO", name: "[NO] Norveç" },
        { code: "PL", name: "[PL] Polonya" },
        { code: "RU", name: "[RU] Rusya" },
        { code: "SA", name: "[SA] Suudi Arabistan" },
        { code: "TR", name: "[TR] Türkiye" },
        { code: "GR", name: "[GR] Yunanistan" },
    ];

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const res = await api.get('/settings/holidays');
            setSkippedIds(res.data.skipped_holidays || []);
            setHolidays(res.data.upcoming_holidays || []);
            setCountry(res.data.holiday_country || "TR");
        } catch (e) {
            console.error("Failed to load holidays", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const toggleHoliday = async (dateStr: string) => {
        const isSkipped = skippedIds.includes(dateStr);
        let newIds = [];
        if (isSkipped) {
            newIds = skippedIds.filter(id => id !== dateStr);
        } else {
            newIds = [...skippedIds, dateStr];
        }

        // Optimistic Update
        setSkippedIds(newIds);

        try {
            // Update Backend
            await api.post('/settings/holidays', { skipped_holidays: newIds });
        } catch (e) {
            console.error(e);
            setSkippedIds(skippedIds); // Revert
            alert("Ayarlar kaydedilemedi.");
        }
    };

    const changeCountry = async (newCountry: string) => {
        setCountry(newCountry);
        setLoading(true);
        try {
            await api.post('/settings/holidays', {
                skipped_holidays: skippedIds,
                country: newCountry
            });
            // Reload holidays for new country
            await fetchHolidays();
        } catch (e) {
            console.error(e);
            alert("Ülke değiştirilemedi.");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-4 bg-pink-600 rounded-2xl shadow-lg">
                    <PartyPopper size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">{t('publicHolidays')}</h1>
                    <p className="text-slate-400">{t('publicHolidaysDesc')}</p>
                </div>
            </div>

            {/* Country Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">{t('selectCountry')}</label>
                <select
                    value={country}
                    onChange={(e) => changeCountry(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white font-semibold min-w-[200px] focus:outline-none focus:border-indigo-500 transition-colors"
                >
                    {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Holidays List */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-indigo-200 mb-6 flex items-center gap-2">
                    <Calendar size={20} />
                    {new Date().getFullYear()} {t('yearHolidays')}
                </h3>

                {loading ? (
                    <div className="text-center py-10 text-slate-500 animate-pulse">{t('loadingHolidays')}</div>
                ) : holidays.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">{t('noHolidaysFound')}</div>
                ) : (
                    <div className="flex flex-col space-y-2">
                        {holidays.map((h, i) => {
                            const isSkipped = skippedIds.includes(h.date);
                            return (
                                <div
                                    key={i}
                                    className={`
                                        flex items-center gap-4 p-4 rounded-xl border transition-all
                                        ${h.is_past
                                            ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                                            : isSkipped
                                                ? 'bg-slate-900 border-slate-700'
                                                : 'bg-slate-800 border-indigo-500/30'
                                        }
                                        ${h.is_today ? 'ring-2 ring-emerald-500/50 bg-emerald-900/10' : ''}
                                    `}
                                >
                                    {/* Date Column */}
                                    <div className={`w-32 md:w-36 text-sm font-mono shrink-0
                                        ${h.is_past ? 'text-slate-600' : 'text-indigo-300'}
                                        ${h.is_today ? 'text-emerald-400 font-bold' : ''}
                                    `}>
                                        {new Date(h.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', weekday: 'short' })}
                                    </div>

                                    {/* Name Column */}
                                    <div className={`flex-grow font-medium text-lg leading-tight ${h.is_past ? 'text-slate-600 line-through decoration-slate-800' : 'text-slate-200'}`}>
                                        {h.name}
                                        {h.is_today && <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded animate-pulse">{t('today')}</span>}
                                    </div>

                                    {/* Toggle Column */}
                                    <div className="shrink-0 text-right">
                                        <button
                                            onClick={() => toggleHoliday(h.date)}
                                            className={`
                                                flex items-center gap-2 px-4 py-2 rounded-lg transition-all border-2 font-bold
                                                ${isSkipped
                                                    ? 'bg-red-900/40 border-red-500/70 text-red-300 hover:bg-red-900/60'
                                                    : 'bg-emerald-900/40 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900/60'
                                                }
                                            `}
                                        >
                                            <span className="text-xs font-bold min-w-[100px] text-center">
                                                {isSkipped ? `🔕 ${t('muteBell')}` : `🔔 ${t('unmuteBell')}`}
                                            </span>
                                            {isSkipped
                                                ? <ToggleRight size={24} className="text-red-400" />
                                                : <ToggleLeft size={24} className="text-emerald-400" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="text-center text-xs text-slate-600">
                {t('autoUpdateNote')}
            </div>
        </div >
    );
}
