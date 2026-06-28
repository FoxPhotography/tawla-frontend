/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4faf7',
          100: '#e8f5ee',
          200: '#d1e7dd',
          300: '#a3cfbb',
          400: '#75b798',
          500: '#198754',
          600: '#157347',
          700: '#146c43',
          800: '#0f5132',
          900: '#0a3622',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#080d1a',
        },
        light: {
          50: '#fcfcfb',
          100: '#faf9f6',
          200: '#f3f1eb',
          300: '#e7e4db',
          400: '#d5d1c5',
          500: '#b8b3a4',
          600: '#989282',
          700: '#797365',
          800: '#5c574c',
          900: '#3f3c34',
          950: '#22201b',
        },
        accent: {
          terracotta: '#c2410c',
          rose: '#e11d48',
          gold: '#d97706',
          emerald: '#10b981',
          sand: '#dfdcd4',
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'organic-sm': '0 2px 8px rgba(121, 115, 101, 0.04)',
        'organic': '0 8px 30px rgba(121, 115, 101, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02)',
        'organic-lg': '0 16px 40px rgba(121, 115, 101, 0.12), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'organic-hover': '0 20px 50px rgba(121, 115, 101, 0.16), 0 6px 20px rgba(121, 115, 101, 0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(25, 135, 84, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(25, 135, 84, 0.4), 0 0 40px rgba(25, 135, 84, 0.1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ping-slow': {
          '75%, 100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
