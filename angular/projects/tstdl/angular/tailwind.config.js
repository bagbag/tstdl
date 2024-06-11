/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./projects/tstdl/angular/**/*.{html,ts,tsx}'],
  important: '.tsl-tw',
  corePlugins: {
    preflight: false,
    container: false
  },
  darkMode: ['class', '.tsl-dark'],
  theme: {
    extend: {
      colors: {
        neutral: {
          50: 'rgb(var(--tsl-color-neutral-50) / <alpha-value>)',
          100: 'rgb(var(--tsl-color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--tsl-color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--tsl-color-neutral-300) / <alpha-value>)',
          400: 'rgb(var(--tsl-color-neutral-400) / <alpha-value>)',
          500: 'rgb(var(--tsl-color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--tsl-color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--tsl-color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--tsl-color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--tsl-color-neutral-900) / <alpha-value>)',
          950: 'rgb(var(--tsl-color-neutral-950) / <alpha-value>)'
        },
        accent: {
          50: 'rgb(var(--tsl-color-accent-50) / <alpha-value>)',
          100: 'rgb(var(--tsl-color-accent-100) / <alpha-value>)',
          200: 'rgb(var(--tsl-color-accent-200) / <alpha-value>)',
          300: 'rgb(var(--tsl-color-accent-300) / <alpha-value>)',
          400: 'rgb(var(--tsl-color-accent-400) / <alpha-value>)',
          500: 'rgb(var(--tsl-color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--tsl-color-accent-600) / <alpha-value>)',
          700: 'rgb(var(--tsl-color-accent-700) / <alpha-value>)',
          800: 'rgb(var(--tsl-color-accent-800) / <alpha-value>)',
          900: 'rgb(var(--tsl-color-accent-900) / <alpha-value>)',
          950: 'rgb(var(--tsl-color-accent-950) / <alpha-value>)'
        }
      }
    }
  }
};
