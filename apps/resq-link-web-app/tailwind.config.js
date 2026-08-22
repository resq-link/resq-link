/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    '../../packages/firebase/src/incidentStatusVisual.ts',
  ],
  theme: {
    extend: {
      colors: {
        // RESQ-LINK logo teal (#1f9d7a) as primary brand accent
        primary: {
          50: '#eefbf6',
          100: '#d5f5ea',
          200: '#aee9d5',
          300: '#79d6b8',
          400: '#45bf9a',
          500: '#1f9d7a',
          600: '#18866a',
          700: '#146b55',
          800: '#145646',
          900: '#11473b',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#0b1220',
        },
      },
      boxShadow: {
        'admin-card': '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'admin-card-hover': '0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
        'admin-panel': '0 8px 24px rgba(15, 23, 42, 0.1)',
      },
      transitionDuration: {
        admin: '200ms',
      },
      keyframes: {
        'admin-fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'admin-drawer-in': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'admin-panel-in': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'admin-dialog-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'admin-menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'admin-fade-in': 'admin-fade-in 200ms ease-out both',
        'admin-drawer-in': 'admin-drawer-in 200ms ease-out both',
        'admin-panel-in': 'admin-panel-in 200ms ease-out both',
        'admin-dialog-in': 'admin-dialog-in 200ms ease-out both',
        'admin-menu-in': 'admin-menu-in 150ms ease-out both',
      },
    },
  },
  plugins: [],
  safelist: [
    'incident-status-dot-pulse',
    'bg-orange-400',
    'bg-red-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-slate-400',
    'text-orange-400',
    'text-red-400',
    'text-blue-400',
    'text-green-400',
    'text-slate-400',
  ],
}
