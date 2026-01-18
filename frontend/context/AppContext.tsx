"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '../lib/translations';

interface AppContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    themeColor: string;
    setThemeColor: (color: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('tr');
    const [themeColor, setThemeColorState] = useState<string>('indigo');

    // Load theme and language from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('themeColor');
        if (savedTheme) {
            setThemeColorState(savedTheme);
        }
        const savedLang = localStorage.getItem('language');
        if (savedLang && ['tr', 'en', 'de', 'ru', 'bg'].includes(savedLang)) {
            setLanguageState(savedLang as Language);
        }
    }, []);

    const setThemeColor = (color: string) => {
        setThemeColorState(color);
        localStorage.setItem('themeColor', color);
    };

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string): string => {
        const langTranslations = translations[language] as unknown as Record<string, string>;
        return langTranslations[key] || key;
    };

    return (
        <AppContext.Provider value={{ language, setLanguage, t, themeColor, setThemeColor }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
