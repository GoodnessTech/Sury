/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sury: {
          primary: '#0F73ED',
          'primary-hover': '#0D64D0',
          'primary-active': '#0A52AD',
          'primary-light': '#EBF3FE',
          slate: '#262B31',
          'slate-hover': '#1C2025',
          'slate-light': '#F1F4F8',
          border: '#E2E8F0',
          surface: '#FFFFFF',
          background: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};
