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
          surface: '#0E1726',
          card: '#121E33',
          border: '#1E3057',
          gold: '#D4A843',
          'gold-light': '#E8C66A',
          blue: '#4A8FD4',
          'blue-light': '#6DB3F8',
          teal: '#3ABFBF',
          purple: '#9B7BFF',
          pink: '#E06B9F',
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
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
