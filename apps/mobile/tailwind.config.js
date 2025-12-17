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
        'mobile-xs': ['0.75rem', '1rem'],
        'mobile-sm': ['0.875rem', '1.25rem'],
        'mobile-base': ['1rem', '1.5rem'],
        'mobile-lg': ['1.125rem', '1.75rem'],
        'mobile-xl': ['1.25rem', '1.75rem'],
        'mobile-2xl': ['1.5rem', '2rem']
      }
    }
  },
  plugins: [],
}
