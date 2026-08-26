import type { Config } from 'tailwindcss';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/screens/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'glow-fade': {
          '0%':   { boxShadow: '0 0 0 3px rgba(0, 80, 239, 0.6), 0 0 24px 4px rgba(0, 80, 239, 0.45)' },
          '100%': { boxShadow: '0 0 0 0px rgba(0, 80, 239, 0)' },
        },
      },
      animation: {
        'glow-fade': 'glow-fade 7s ease-out forwards',
      },
    },
  },
  plugins: [],
};

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0050EF',
          text: '#FFFFFF',
        },
        surface: {
          light: '#F5F5F5',
          dark: '#1C1C1E',
        },
        border: {
          light: '#E0E0E0',
          dark: '#2C2C2E',
        },
        akademia: {
          blue: '#0050EF',
          red: '#FF3B30',
          green: '#34C759',
          subtle: '#8E8E93',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        xs: '1rem',
        sm: '1rem',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        input: '10px',
      },
    },
  },
  plugins: [],
};

export default config;