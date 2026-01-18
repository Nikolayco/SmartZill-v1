"use client";
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Views/Dashboard';
import Schedule from '../components/Views/Schedule';
import Library from '../components/Views/Library';
import SettingsView from '../components/Views/Settings';
import Announcements from '../components/Views/Announcements';
import HolidaysView from '../components/Views/Holidays';
import SpecialDaysView from '../components/Views/SpecialDaysView';
import api from '../lib/api';
import { DaySchedule } from '../types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);

  // Fetch schedule at root level to pass down if needed
  const fetchSchedule = async () => {
    try {
      const res = await api.get('/schedule');
      setSchedule(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSchedule();
    // Initialize AdSense
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { }
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-200">
      <div className="max-w-[1920px] mx-auto grid md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-3rem)] md:ml-[176px]">

        {/* LEFT AD COLUMN - Fixed to top-left, full height */}
        <aside className="fixed top-4 left-4 md:top-6 md:left-6 w-[160px] h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-xl overflow-y-auto flex flex-col z-10">
          {/* Header */}
          <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Reklam</span>
          </div>

          {/* Ad Content Area */}
          <div className="flex-1 flex items-start justify-center p-2 overflow-hidden">
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0943242990068977" crossOrigin="anonymous"></script>
            <ins className="adsbygoogle"
              style={{ display: "block", width: "140px", minHeight: "600px" }}
              data-ad-client="ca-pub-0943242990068977"
              data-ad-slot="6375377980"
              data-ad-format="vertical"
              data-full-width-responsive="false"></ins>
          </div>
        </aside>

        {/* SIDEBAR */}
        <aside className="h-full">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="bg-slate-900/50 rounded-2xl p-6 md:p-8 border border-slate-800/50 shadow-2xl overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'schedule' && <Schedule schedule={schedule} onUpdate={fetchSchedule} />}
          {activeTab === 'files' && <Library />}
          {activeTab === 'announcements' && <Announcements />}
          {activeTab === 'holidays' && <HolidaysView />}
          {activeTab === 'special-days' && <SpecialDaysView />}
          {activeTab === 'settings' && <SettingsView />}
        </section>

      </div>
    </main>
  );
}
