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
        'primary-background-color': 'var(--tsl-primary-background-color)',
        'secondary-background-color': 'var(--tsl-secondary-background-color)',
        'tertiary-background-color': 'var(--tsl-tertiary-background-color)',

        'primary-text-color': 'var(--tsl-primary-text-color)',
        'secondary-text-color': 'var(--tsl-secondary-text-color)',
        'tertiary-text-color': 'var(--tsl-tertiary-text-color)',

        'primary-color': 'var(--tsl-primary-color)'
      }
    }
  }
};
