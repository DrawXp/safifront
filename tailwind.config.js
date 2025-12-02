/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: "#0cf2f4", tint: "#3df5f6", shade: "#08a9ab" },
        secondary: { DEFAULT: "#00f797", tint: "#33f9ac", shade: "#00c679" },
        white: "#ffffff",
        black: "#000000",
      },
    },
  },
  plugins: [],
}
