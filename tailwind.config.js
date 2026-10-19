/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fog: "#E4E7EC",      // page
        paper: "#F7F8FA",    // panels
        ink: "#1B1F2A",      // text, stage frame
        slate: "#5A6272",    // secondary text
        rule: "#C9CED6",     // borders
        tally: "#E0312B",    // on-air red: primary action + live state
        cap: "#FFD23F",      // caption emphasis yellow
      },
      fontFamily: {
        sans: ['"Archivo"', "system-ui", "sans-serif"],
        urdu: ['"Noto Nastaliq Urdu"', '"Jameel Noori Nastaleeq"', "serif"],
        deva: ['"Noto Sans Devanagari"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
