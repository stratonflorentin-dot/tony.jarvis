/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          primary: 'var(--hud-primary)',
          secondary: 'var(--hud-secondary)',
          accent: 'var(--hud-accent)',
          success: 'var(--hud-success)',
          danger: 'var(--hud-danger)',
          gold: 'var(--hud-gold)',
        },
        bg: {
          deep: 'var(--bg-deep)',
          panel: 'var(--bg-panel)',
          glass: 'var(--bg-glass)',
        }
      },
      fontFamily: {
        hud: ['var(--font-hud)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': 'var(--glow-sm)',
        'glow-md': 'var(--glow-md)',
        'glow-lg': 'var(--glow-lg)',
      }
    },
  },
  plugins: [],
}
