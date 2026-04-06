/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: ['font-syne', 'font-dm', 'tabular-nums'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      colors: {
        accent: '#FF5733',
        'accent-hover': '#E04520',
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
      },
    },
  },
  plugins: [],
}
