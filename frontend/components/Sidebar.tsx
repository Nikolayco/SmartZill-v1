import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, CalendarClock, FolderOpen, Settings, Megaphone, Music, CalendarDays, Gift } from 'lucide-react';
import api from '../lib/api';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const { t } = useApp();
    const [companyName, setCompanyName] = useState("NikolayCo SmartZill");

    useEffect(() => {
        // Poll for status/company name update occasionally or just rely on page load
        api.get('/status').then(res => {
            if (res.data.company_name) setCompanyName(res.data.company_name);
        }).catch(console.error);
    }, [activeTab]); // Refresh when tab changes just in case settings updated it

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { id: 'schedule', icon: CalendarClock, label: t('schedule') },
        { id: 'announcements', icon: Megaphone, label: t('announcements') },
        { id: 'files', icon: Music, label: t('files') },
        { id: 'holidays', icon: CalendarDays, label: t('holidays') },
        { id: 'special-days', icon: Gift, label: t('specialDays') },
        { id: 'settings', icon: Settings, label: t('settings') },
    ];

    return (
        <nav className="bg-slate-800 p-4 rounded-lg flex flex-col gap-2 h-full">
            <div className="mb-6 px-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        <span className="text-emerald-400">NikolayCo</span> SmartZill
                    </h1>
                    {companyName && (
                        <p className="text-xs text-slate-400 font-medium mt-1 pl-0.5 border-l-2 border-emerald-500/50 pl-2 ml-0.5">
                            {companyName}
                        </p>
                    )}
                </div>
            </div>
            {menuItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-all text-left ${activeTab === item.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                >
                    <item.icon size={20} />
                    {item.label}
                </button>
            ))}

            <div className="mt-auto px-4 pb-2 text-xs text-slate-600 font-mono select-none flex justify-between items-end">
                <div>
                    <p className="font-bold text-slate-500">NikolayCo SmartZill</p>
                    <p className="text-[10px]">v1.0</p>
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] text-slate-500 font-bold">Niyazi Sönmez</p>
                        <p className="text-[9px] text-slate-600">niyazi.sonmez@gmail.com</p>
                    </div>
                </div>
            </div>
        </nav >
    );
}
