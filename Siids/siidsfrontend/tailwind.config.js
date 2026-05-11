/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // Prevent Tailwind from breaking MUI/Bootstrap
  },
  theme: {
    extend: {
      colors: {
        'rra-blue': 'var(--rra-blue)',
        'rra-blue-dark': 'var(--rra-blue-dark)',
        'rra-blue-hover': 'var(--rra-blue-hover)',
        'rra-blue-tint': 'var(--rra-blue-tint)',
        'rra-blue-tint-2': 'var(--rra-blue-tint-2)',
        'rra-green': 'var(--rra-green)',
        'rra-green-dark': 'var(--rra-green-dark)',
        'rra-green-tint': 'var(--rra-green-tint)',
        'rra-yellow': 'var(--rra-yellow)',
        'rra-yellow-dark': 'var(--rra-yellow-dark)',
        'rra-yellow-tint': 'var(--rra-yellow-tint)',
        'rra-orange': 'var(--rra-orange)',
        'rra-orange-dark': 'var(--rra-orange-dark)',
        'rra-orange-tint': 'var(--rra-orange-tint)',
        'rra-red': 'var(--rra-red)',
        'rra-red-tint': 'var(--rra-red-tint)',
        'surface-page': 'var(--surface-page)',
        'surface-card': 'var(--surface-card)',
        'surface-input': 'var(--surface-input)',
        'surface-overlay': 'var(--surface-overlay)',
        'sidebar-bg': 'var(--sidebar-bg)',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'raised': 'var(--shadow-raised)',
        'modal': 'var(--shadow-modal)',
        'drawer': 'var(--shadow-drawer)',
      }
    },
  },
  plugins: [],
}
