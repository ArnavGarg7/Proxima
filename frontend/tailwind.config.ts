import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        void: '#0A0A0A', surface: '#111111', elevated: '#1A1A1A',
        border: { DEFAULT: '#2A2A2A', strong: '#3A3A3A' },
        text: { primary: '#F0EFE9', secondary: '#888880', muted: '#555550' },
        gold: { primary: '#C9A84C', bright: '#E5C76B', dim: '#8A6F32' },
        light: { bg: '#FAFAF8', surface: '#FFFFFF', border: '#E8E8E4', text: '#0A0A0A' },
        domain: { code: '#4ADE80', medical: '#60A5FA', legal: '#C9A84C' },
        conf: {
          high:     '#22c55e',
          amber:    '#f59e0b',
          low:      '#f97316',
          critical: '#ef4444',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
    }
  },
  plugins: [],
} satisfies Config
