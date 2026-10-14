/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#e6fffa',
          100: '#b2f5ea',
          200: '#81e6d9',
          300: '#35ECDE',
          400: '#35ECDE',
          500: '#35ECDE',
          600: '#22c7bc',
          700: '#1da59c',
          800: '#177f78',
          900: '#115853',
        }
      }
    },
  },
  plugins: [],
}
