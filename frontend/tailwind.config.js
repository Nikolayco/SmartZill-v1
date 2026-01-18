/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    safelist: [
        // Theme colors - ensure these are always available
        'bg-indigo-600', 'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
        'bg-red-600', 'bg-orange-600', 'bg-emerald-600', 'bg-cyan-600',
        'hover:bg-indigo-700', 'hover:bg-blue-700', 'hover:bg-purple-700', 'hover:bg-pink-700',
        'hover:bg-red-700', 'hover:bg-orange-700', 'hover:bg-emerald-700', 'hover:bg-cyan-700',
        'text-indigo-400', 'text-blue-400', 'text-purple-400', 'text-pink-400',
        'text-red-400', 'text-orange-400', 'text-emerald-400', 'text-cyan-400',
        'border-indigo-500', 'border-blue-500', 'border-purple-500', 'border-pink-500',
        'border-red-500', 'border-orange-500', 'border-emerald-500', 'border-cyan-500',
        'from-indigo-600', 'from-blue-600', 'from-purple-600', 'from-pink-600',
        'from-red-600', 'from-orange-600', 'from-emerald-600', 'from-cyan-600',
        'to-indigo-800', 'to-blue-800', 'to-purple-800', 'to-pink-800',
        'to-red-800', 'to-orange-800', 'to-emerald-800', 'to-cyan-800',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
