/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundColor: {
        'dark-bg': '#0F172A',
        'dark-card': '#1E293B',
      },
      textColor: {
        'light-primary': '#F3F4F6',
        'light-secondary': '#D1D5DB',
      },
      boxShadow: {
        'glass-sm': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'glass-md': '0 8px 16px rgba(0, 0, 0, 0.15)',
        'glass-lg': '0 20px 25px rgba(0, 0, 0, 0.2)',
        'liquid-sm': '0 8px 32px rgba(59, 130, 246, 0.15)',
        'liquid-md': '0 12px 48px rgba(6, 182, 212, 0.2)',
        'liquid-lg': '0 16px 64px rgba(167, 139, 250, 0.25)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
        'glow-purple': '0 0 20px rgba(167, 139, 250, 0.5)',
        'glow-liquid': '0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(6, 182, 212, 0.2)',
      },
      colors: {
        'clean-tech': {
          'primary': '#1F2937',
          'secondary': '#0F172A',
          'accent-blue': '#3B82F6',
          'accent-cyan': '#06B6D4',
          'accent-purple': '#A78BFA',
          'success': '#10B981',
          'error': '#EF4444',
          'warning': '#F59E0B',
          'text-light': '#F3F4F6',
          'text-muted': '#D1D5DB',
          'border': '#334155',
        },
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
        'glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        'gradient-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'scanlines': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(10px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'liquid-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%', transform: 'translateY(0px)' },
          '50%': { backgroundPosition: '100% 50%', transform: 'translateY(-2px)' },
        },
        'liquid-blob': {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '70% 30% 40% 60% / 40% 60% 60% 30%' },
          '75%': { borderRadius: '40% 70% 60% 30% / 70% 40% 60% 50%' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'gradient-flow': 'gradient-flow 6s ease infinite',
        'scanlines': 'scanlines 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'liquid-flow': 'liquid-flow 8s ease-in-out infinite',
        'liquid-blob': 'liquid-blob 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      backdropBlur: {
        'xs': '2px',
        'xl': '20px',
        'glass': '16px',
      },
    },
  },
  plugins: [],
}
