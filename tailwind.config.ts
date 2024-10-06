import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        'light-1': 'hsl(0,0%,100%)',
        'light-2': 'hsl(0,0%,93.3%)',
        'light-3': 'hsl(240,10.5%,55.9%)',
        'light-4': 'hsl(240,11.9%,42.2%)',
        'dark-1': 'hsl(0,0%,0%)',
        'dark-2': 'hsl(210,7.1%,8.6%)',
        'dark-3': 'hsl(210,3.7%,6.3%)',
        'dark-4': 'hsl(210,3.7%,13.3%)',
        'primary-500': 'hsl(252.3,95.7%,67.8%)',
        'secondary-500': 'hsl(41.7,100%,56.1%)',
        'glassmorphism': 'rgba(255, 255, 255, 0.50)',
        'glassmorphism-dark': 'rgba(28, 28, 30, 0.60)',
      },
      fontSize: {
        'heading1-bold': ['36px', { lineHeight: '140%', fontWeight: '700' }],
        'heading2-bold': ['30px', { lineHeight: '140%', fontWeight: '700' }],
        'heading3-bold': ['24px', { lineHeight: '140%', fontWeight: '700' }],
        'heading4-medium': ['20px', { lineHeight: '140%', fontWeight: '500' }],
        'body-bold': ['18px', { lineHeight: '140%', fontWeight: '700' }],
        'body-semibold': ['18px', { lineHeight: '140%', fontWeight: '600' }],
        'body-medium': ['18px', { lineHeight: '140%', fontWeight: '500' }],
        'body-normal': ['18px', { lineHeight: '140%', fontWeight: '400' }],
        'base-regular': ['16px', { lineHeight: '140%', fontWeight: '400' }],
        'base-medium': ['16px', { lineHeight: '140%', fontWeight: '500' }],
        'base-semibold': ['16px', { lineHeight: '140%', fontWeight: '600' }],
        'small-regular': ['14px', { lineHeight: '140%', fontWeight: '400' }],
        'small-medium': ['14px', { lineHeight: '140%', fontWeight: '500' }],
        'small-semibold': ['14px', { lineHeight: '140%', fontWeight: '600' }],
        'subtle-medium': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'tiny-medium': ['10px', { lineHeight: '140%', fontWeight: '500' }],
      },
      screens: {
        'xs': '400px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
