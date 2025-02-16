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
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        'light-1': 'hsl(0,0%,100%)',
        'light-2': 'hsl(0,0%,93.3%)',
        'light-5': 'rgba(255,255,255)',
        'light-3': 'hsl(240,10.5%,55.9%)',
        'light-4': 'hsl(240,11.9%,42.2%)',
        'dark-1': 'hsl(0,0%,0%)',
        'dark-2': 'hsl(210,7.1%,8.6%)',
        'dark-3': 'hsl(210,3.7%,6.3%)',
        'dark-4': 'hsl(210,3.7%,13.3%)',
        'primary-500': 'hsl(252.3,95.7%,67.8%)',
        'secondary-500': 'hsl(41.7,100%,56.1%)',
        'glassmorphism': 'rgba(255, 255, 255, 0.50)',
        'glassmorphism-dark': 'hsl(220, 13%, 5%,0.7)', //hsl()
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1d4ed8",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
