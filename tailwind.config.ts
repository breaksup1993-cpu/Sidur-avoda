import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
      colors: {
        bg: '#0f1117',
        surface: '#1a1d27',
        surface2: '#222638',
        border: '#2e3350',
        accent: '#4f7ef8',
        accent2: '#7c5cbf',
        gold: '#f5c842',
        success: '#2dd4a0',
        danger: '#f05c5c',
        warn: '#f5974f',
        muted: '#7a7f9e',
      },
    },
  },
  plugins: [],
}
export default config
