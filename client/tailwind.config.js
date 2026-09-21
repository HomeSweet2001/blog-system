/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        accent: 'var(--c-accent)',
        ink: 'var(--c-text)',
        canvas: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        line: 'var(--c-border)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
};
