/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003087',
          50: '#e8eef8',
          100: '#c5d4ec',
          200: '#9bb5dc',
          500: '#003087',
          600: '#002a75',
          700: '#00225f',
          800: '#001a4a',
          900: '#001235',
        },
        secondary: {
          DEFAULT: '#00AEEF',
          50: '#e6f7fd',
          100: '#b3e7fa',
          500: '#00AEEF',
          600: '#0099d4',
        },
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        surface: '#F4F7FB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,48,135,0.06), 0 4px 16px rgba(0,48,135,0.06)',
      },
    },
  },
  plugins: [],
};
