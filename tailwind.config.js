/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink:    '#0C0C0D',
        'ink-2':'#141416',
        'ink-3':'#1E1E21',
        bone:   '#F2F0EB',
        'bone-dim': 'rgba(242,240,235,0.55)',
        'bone-muted': 'rgba(242,240,235,0.28)',
        gold:   '#801B2C',
        'gold-warm': '#962436',
        'gold-dim': 'rgba(128,27,44,0.12)',
        'gold-line': 'rgba(128,27,44,0.20)',
        burgundy: {
          DEFAULT: '#801B2C',
          dark: '#5E1422',
          light: '#962436',
          vibrant: '#A82E40',
        },
        emerald: {
          DEFAULT: '#22C55E',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#052E16',
        },
        'red-soft': '#F87171',
        // Customer Theme (Dark Luxury)
        customer: {
          bg: {
            base: 'var(--customer-bg-base)',
            elevated: 'var(--customer-bg-elevated)',
            overlay: 'var(--customer-bg-overlay)',
          },
          border: {
            DEFAULT: 'var(--customer-border)',
            strong: 'var(--customer-border-strong)',
          },
          accent: {
            DEFAULT: 'var(--customer-accent)',
            glow: 'var(--customer-accent-glow)',
            subtle: 'var(--customer-accent-subtle)',
          },
          text: {
            primary: 'var(--customer-text-primary)',
            secondary: 'var(--customer-text-secondary)',
            muted: 'var(--customer-text-muted)',
          },
          success: '#4ADE80',
          pending: '#D4A853',
        },
        // Staff Theme (Dark Focused)
        staff: {
          bg: {
            base: 'var(--staff-bg-base)',
            elevated: 'var(--staff-bg-elevated)',
            panel: 'var(--staff-bg-panel)',
          },
          border: {
            DEFAULT: 'var(--staff-border)',
            accent: 'var(--staff-border-accent)',
          },
          accent: {
            DEFAULT: 'var(--staff-accent)',
            glow: 'var(--staff-accent-glow)',
            soft: 'var(--staff-accent-soft)',
          },
          text: {
            primary: 'var(--staff-text-primary)',
            secondary: 'var(--staff-text-secondary)',
            muted: 'var(--staff-text-muted)',
          },
          pending: '#F59E0B',
          preparing: '#6366F1',
          ready: '#10B981',
        },
        // Admin Theme (Light Premium)
        admin: {
          bg: {
            base: 'var(--admin-bg-base)',
            elevated: 'var(--admin-bg-elevated)',
            subtle: 'var(--admin-bg-subtle)',
          },
          border: {
            DEFAULT: 'var(--admin-border)',
            strong: 'var(--admin-border-strong)',
          },
          accent: {
            DEFAULT: 'var(--admin-accent)',
            light: 'var(--admin-accent-light)',
            medium: 'var(--admin-accent-medium)',
          },
          text: {
            primary: 'var(--admin-text-primary)',
            secondary: 'var(--admin-text-secondary)',
            muted: 'var(--admin-text-muted)',
          },
        },
      },
      fontFamily: {
        display: ['"Tajawal"', '"Playfair Display"', 'Georgia', 'sans-serif'],
        tajawal: ['"Tajawal"', 'sans-serif'],
        sans:    ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '20px',
      },
      boxShadow: {
        'customer-card': '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'customer-elevated': '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        'customer-accent': '0 0 20px rgba(212,168,83,0.2)',
        'staff-card': '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'staff-accent': '0 0 20px rgba(99,102,241,0.25)',
        'admin-card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        'admin-elevated': '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'admin-accent': '0 4px 16px rgba(79,70,229,0.2)',
      },
      animation: {
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'ping-slow': {
          '75%, 100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
