import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8dc53d',
          dark: '#6fa32e',
          light: '#aadd6b',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#0065b3',
          soft: '#3a8fd0',
          foreground: '#ffffff',
        },
        background: '#fefcf7',
        surface: '#ffffff',
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#8dc53d',
        foreground: '#1f2937',
        muted: {
          DEFAULT: '#f3f4f6',
          foreground: '#6b7280',
        },
        destructive: {
          DEFAULT: '#dc2626',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#16a34a',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
        },
        // shadcn/ui compat
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937',
        },
        secondary: {
          DEFAULT: '#f3f4f6',
          foreground: '#1f2937',
        },
        sidebar: {
          DEFAULT: '#1f2937',
          foreground: '#ffffff',
          primary: '#8dc53d',
          'primary-foreground': '#ffffff',
          accent: '#374151',
          'accent-foreground': '#ffffff',
          border: '#374151',
          ring: '#8dc53d',
        },
      },
      fontFamily: {
        bengali: ['var(--font-hind-siliguri)', 'Noto Sans Bengali', ...fontFamily.sans],
        sans: ['var(--font-hind-siliguri)', 'Noto Sans Bengali', ...fontFamily.sans],
      },
      maxWidth: {
        container: '1280px',
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.20)',
        header: '0 2px 8px rgba(0,0,0,0.06)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
