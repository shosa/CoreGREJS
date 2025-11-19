/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      fontSize: {
        'title-sm': ['1.125rem', '1.75rem'],
        'title-md': ['1.25rem', '1.75rem'],
        'title-md2': ['1.5rem', '2rem'],
        'title-lg': ['1.75rem', '2.25rem'],
        'title-xl': ['2.25rem', '2.5rem'],
        'title-xl2': ['3rem', '3.5rem']
      },
      zIndex: {
        '99999': '99999',
        '9999': '9999'
      }
    }
  },
  plugins: [],
}
