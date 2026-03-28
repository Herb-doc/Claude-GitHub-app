/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hermes: {
          bg: '#070D1A',
          surface: '#0D1627',
          card: '#111E35',
          border: '#1E3057',
          gold: '#D4A843',
          blue: '#4A8FD4',
          teal: '#3ABFBF',
          critical: '#FF4444',
          high: '#E08030',
          watch: '#D4A843',
          normal: '#52C47A',
          low: '#4A8FD4',
          text: '#E8EDF5',
          muted: '#6B82A0',
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        ui: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
