/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tsl-',
  mode: 'jit',
  content: ['./projects/tstdl-angular/src/lib/**/*.{html,ts,css,scss}'],
  corePlugins: {
    preflight: false
  },
  darkMode: 'class',
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
