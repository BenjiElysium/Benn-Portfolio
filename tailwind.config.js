module.exports = {
  theme: {
    extend: {
      colors: {
        'dark-bg': '#09090b',
      },
      fontFamily: {
        // Northline's headline serif — used only by NorthlineCard to carry its brand
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
