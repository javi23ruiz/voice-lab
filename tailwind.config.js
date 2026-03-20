/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          50:  '#f8f9fc',
          100: '#f0f2f8',
          200: '#e2e6f0',
          800: '#1e2235',
          900: '#13172a',
          950: '#0c0f1e',
        },
        accent: {
          400: '#7c85f5',
          500: '#6366f1',
          600: '#4f52d8',
        },
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-out',
        'slide-up':      'slideUp 0.25s ease-out',
        'pulse-dot':     'pulseDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':           { transform: 'scale(1)',   opacity: '1' },
        },
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body':       'rgb(209 213 219)',
            '--tw-prose-headings':   'rgb(243 244 246)',
            '--tw-prose-code':       'rgb(167 243 208)',
            '--tw-prose-pre-bg':     'rgb(17 24 39)',
            '--tw-prose-pre-code':   'rgb(209 213 219)',
            '--tw-prose-bullets':    'rgb(107 114 128)',
            '--tw-prose-hr':         'rgb(55 65 81)',
            '--tw-prose-links':      'rgb(124 133 245)',
            '--tw-prose-bold':       'rgb(243 244 246)',
            '--tw-prose-counters':   'rgb(107 114 128)',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
