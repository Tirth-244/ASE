import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep dark background palette
        dark: {
          50: '#e8e8ef',
          100: '#c4c5d2',
          200: '#9d9eb4',
          300: '#767896',
          400: '#585b80',
          500: '#3b3e6b',
          600: '#2d3063',
          700: '#1e2156',
          800: '#13131a',
          900: '#0a0a0f',
          950: '#050508',
        },
        // Electric accent gradients
        accent: {
          cyan: '#06d6a0',
          blue: '#118ab2',
          purple: '#7b2ff7',
          pink: '#ff006e',
          orange: '#fb5607',
        },
        // Neon glow colors for UI elements
        neon: {
          green: '#39ff14',
          blue: '#00f0ff',
          purple: '#bf00ff',
          pink: '#ff10f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        'accent-gradient': 'linear-gradient(135deg, #06d6a0, #7b2ff7, #ff006e)',
        'hero-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1e2156 50%, #0a0a0f 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 16px 64px 0 rgba(0, 0, 0, 0.5)',
        'neon-cyan': '0 0 20px rgba(6, 214, 160, 0.3)',
        'neon-purple': '0 0 20px rgba(123, 47, 247, 0.3)',
        'neon-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
