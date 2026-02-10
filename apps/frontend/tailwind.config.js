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
      },
      boxShadow: {
        'sidebar': '0 1px 3px rgba(0,0,0,0.05), 0 20px 60px -15px rgba(0,0,0,0.1)',
        'header': '0 1px 3px rgba(0,0,0,0.05), 0 1px 0 rgba(0,0,0,0.03)',
        'popup': '0 4px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        'item-active': '0 1px 3px rgba(0,0,0,0.06)',
        'inset-subtle': 'inset 0 1px 2px rgba(0,0,0,0.04)',
      },
      transitionTimingFunction: {
        'smooth-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    }
  },
  plugins: [],
}
