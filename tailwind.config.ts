import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/client/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          bg: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          muted: 'var(--color-bg-muted)',
          border: 'var(--color-border)',
        },
        ink: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          text: 'var(--color-accent-text)',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        control: '8px',
        card: '12px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(20, 20, 19, 0.04)',
        card: '0 2px 6px -1px rgba(20, 20, 19, 0.06), 0 1px 4px -1px rgba(20, 20, 19, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
