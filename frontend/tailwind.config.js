export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0B0F19',
        surface: '#151B2B',
        'surface-raised': '#1D2438',
        'accent-buzz': '#FF4B4B',
        'accent-primary': '#6C5CE7',
        'accent-success': '#2ECC71',
        muted: '#9CA3AF',
      },
      textColor: {
        primary: '#F5F6FA',
        muted: '#9CA3AF',
      },
      borderColor: {
        subtle: '#252C42',
      }
    },
  },
  plugins: [],
}
