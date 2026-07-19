/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pitch-charcoal': '#0a0e0d',
        'turf-surface': '#152214',
        'floodlight': '#f0f4f8',
        'scoreboard-amber': '#ffb000',
        'alert-coral': '#ff5a5f',
        'sage-muted': '#7b8e78',
      },
    },
  },
  plugins: [],
};
