// Theme color utility functions
export const getThemeColors = (theme: string) => {
    const themes: Record<string, any> = {
        indigo: {
            primary: 'indigo',
            gradient: 'from-indigo-600 to-indigo-800',
            text: 'text-indigo-400',
            bg: 'bg-indigo-600',
            bgHover: 'hover:bg-indigo-700',
            border: 'border-indigo-500',
            shadow: 'shadow-indigo-500/20',
        },
        blue: {
            primary: 'blue',
            gradient: 'from-blue-600 to-blue-800',
            text: 'text-blue-400',
            bg: 'bg-blue-600',
            bgHover: 'hover:bg-blue-700',
            border: 'border-blue-500',
            shadow: 'shadow-blue-500/20',
        },
        purple: {
            primary: 'purple',
            gradient: 'from-purple-600 to-purple-800',
            text: 'text-purple-400',
            bg: 'bg-purple-600',
            bgHover: 'hover:bg-purple-700',
            border: 'border-purple-500',
            shadow: 'shadow-purple-500/20',
        },
        pink: {
            primary: 'pink',
            gradient: 'from-pink-600 to-pink-800',
            text: 'text-pink-400',
            bg: 'bg-pink-600',
            bgHover: 'hover:bg-pink-700',
            border: 'border-pink-500',
            shadow: 'shadow-pink-500/20',
        },
        red: {
            primary: 'red',
            gradient: 'from-red-600 to-red-800',
            text: 'text-red-400',
            bg: 'bg-red-600',
            bgHover: 'hover:bg-red-700',
            border: 'border-red-500',
            shadow: 'shadow-red-500/20',
        },
        orange: {
            primary: 'orange',
            gradient: 'from-orange-600 to-orange-800',
            text: 'text-orange-400',
            bg: 'bg-orange-600',
            bgHover: 'hover:bg-orange-700',
            border: 'border-orange-500',
            shadow: 'shadow-orange-500/20',
        },
        emerald: {
            primary: 'emerald',
            gradient: 'from-emerald-600 to-emerald-800',
            text: 'text-emerald-400',
            bg: 'bg-emerald-600',
            bgHover: 'hover:bg-emerald-700',
            border: 'border-emerald-500',
            shadow: 'shadow-emerald-500/20',
        },
        cyan: {
            primary: 'cyan',
            gradient: 'from-cyan-600 to-cyan-800',
            text: 'text-cyan-400',
            bg: 'bg-cyan-600',
            bgHover: 'hover:bg-cyan-700',
            border: 'border-cyan-500',
            shadow: 'shadow-cyan-500/20',
        },
    };

    return themes[theme] || themes.indigo;
};
