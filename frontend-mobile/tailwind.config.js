/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0b0a0f",
        surface: "#16131f",
        border: "#2a2340",
        primary: {
          DEFAULT: "#7c3aed",
          hover: "#6d28d9",
        },
        fg: "#ece9f5",
        muted: "#9c93b8",
        danger: "#dc2626",
      },
    },
  },
  plugins: [],
};