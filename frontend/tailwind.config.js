/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neo:    '4px 4px 0px 0px #000000',
        'neo-lg': '8px 8px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
      },
      colors: {
        neo: {
          yellow: '#F5E642',
          green:  '#6BCB77',
          red:    '#FF6B6B',
          orange: '#FF9F1C',
          blue:   '#4ECDC4',
        },
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.8)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
