/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Discord風カラーパレット
        discord: {
          bg: "#313338",
          sidebar: "#2B2D31",
          serverbar: "#1E1F22",
          hover: "#35373C",
          input: "#383A40",
          text: "#DBDEE1",
          muted: "#949BA4",
          accent: "#5865F2",
          green: "#23A559",
          red: "#F23F43",
          yellow: "#F0B232",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
