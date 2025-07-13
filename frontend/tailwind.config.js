/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'notion': {
          'bg': '#ffffff',
          'surface': '#f7f7f7',
          'text': '#37352f',
          'text-secondary': '#787774',
          'primary': '#2e75cc',
          'border': '#e3e2e0',
          'hover': '#f1f1ef',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'notion': '6px',
      },
      boxShadow: {
        'notion': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'notion-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
} 