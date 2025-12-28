/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f172a', // Main BG
          800: '#1e293b', // Secondary BG
          700: '#334155', // Borders/Accents
        },
        brand: {
          500: '#6366f1', // Primary
          600: '#4f46e5', // Hover
        }
      }
    },
  },
  plugins: [],
}