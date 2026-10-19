/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand palette (aligned with Smewise. logo) ──────────────────────
        // Primary = brand lavender/violet (the logo dot colour)
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd', // logo dot colour
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Brand blacks / neutrals
        neutral: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Brand ink – near-black text/borders
        ink: '#0f0f0f',
        // Semantic — real status hues (not lavender)
        success: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        info: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Accent pops for SME-themed visuals (used in 3D objects and feature tiles)
        accent: {
          coral: '#fb7185',
          peach: '#fdba74',
          gold:  '#fbbf24',
          mint:  '#34d399',
          teal:  '#2dd4bf',
          sky:   '#38bdf8',
          rose:  '#f472b6',
        },
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'hard':   '4px 4px 0 0 #0f0f0f',
        'hard-sm':'2px 2px 0 0 #0f0f0f',
        'hard-lg':'6px 6px 0 0 #0f0f0f',
        'brand':  '4px 4px 0 0 #c4b5fd',
        'subtle': '0 1px 4px 0 rgb(0 0 0 / 0.06)',
        // Premium SaaS depth (Metrica / Adaline / Aetheris-style)
        'panel':
          '0 0 0 1px rgba(255,255,255,0.05), 0 12px 40px -12px rgba(0,0,0,0.55)',
        'panel-hover':
          '0 0 0 1px rgba(255,255,255,0.09), 0 16px 48px -12px rgba(0,0,0,0.6)',
        'float':
          '0 8px 32px -8px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-on-dark':
          '0 4px 28px -6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-up':     'fadeUp 0.5s ease both',
        'fade-in':     'fadeIn 0.4s ease both',
        'slide-right': 'slideRight 0.4s ease both',
        'hero-float':  'heroFloat 6s ease-in-out infinite',
        'marquee':     'marquee 32s linear infinite',
        'glow-pulse':  'glowPulse 5s ease-in-out infinite',
        'count-up':    'fadeUp 0.8s ease 0.1s both',
        'splash-spin': 'splashSpin 1.6s linear infinite',
        'splash-pulse':'splashPulse 1.6s ease-in-out infinite',
        'gradient-shift':'gradientShift 16s ease infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        heroFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(-0.4deg)' },
          '50%':      { transform: 'translateY(-12px) rotate(0.4deg)' },
        },
        marquee: {
          '0%':   { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-50%,0,0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%':      { opacity: '0.85', transform: 'scale(1.08)' },
        },
        splashSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        splashPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%':      { transform: 'scale(1.08)', opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
