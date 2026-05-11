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
        // ── Design-system tokens (Task 19.1) ─────────────────────────────────
        'app':            '#0f0d1a',
        'card':           '#1a1728',
        'input':          '#221f35',
        'border-default': '#3d3660',
        'accent':         '#7c3aed',
        'highlight':      '#a78bfa',
        'glow':           '#4c3d8f',

        // ── Legacy aliases (kept for backward compat) ─────────────────────────
        'bg-app':           '#0f0d1a',
        'bg-card':          '#1a1728',
        'bg-input':         '#221f35',
        'accent-primary':   '#7c3aed',
        'accent-highlight': '#a78bfa',
        'border-glow':      '#4c3d8f',
        'placeholder':      '#6b6890',

        primary: {
          DEFAULT: '#7c3aed',
          hover:   '#6d28d9',
        },
        background: {
          DEFAULT: '#0f0d1a',
          surface: '#1a1728',
          card:    '#221f35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
