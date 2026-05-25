/** @type {import('tailwindcss').Config} */
export default {
  // Keep custom classes from being purged
  safelist: [
    { pattern: /^badge-/ },
    'glass-card',
    'input-glass',
    'select-glass',
    'btn-primary',
    'btn-secondary',
  ],
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#5C6BC0',
        accent: '#FF8A65',
        glass: 'rgba(255,255,255,0.12)',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        fadeInUp: 'fadeInUp 0.4s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
