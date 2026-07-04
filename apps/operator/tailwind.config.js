/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#15803D',
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22C55E',
          600: '#16a34a',
          700: '#15803D',
          800: '#166534',
          900: '#14532d',
        },
        secondary: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#0EA5E9',
        surface: '#F0FDF4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(21,128,61,0.06), 0 4px 16px rgba(21,128,61,0.08)',
      },
    },
  },
  plugins: [],
};
