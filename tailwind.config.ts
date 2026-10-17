import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F4F1EA",
        ink: "#141A18",
        muted: "#5B6661",
        em: { 900: "#0B3D33", 600: "#146B5A", 100: "#E3EFEA" },
        gold: { 500: "#C9A44C", 700: "#8A6B1F", 200: "#E8CF8A", 100: "#F6EBCF" },
        night: { DEFAULT: "#0C1A17", 2: "#132622" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        arabic: ["var(--font-amiri)", "serif"],
      },
      borderRadius: { card: "22px", hero: "28px" },
      boxShadow: {
        card: "0 4px 16px rgba(11,61,51,0.05)",
        hero: "0 18px 40px rgba(11,61,51,0.22)",
        glass: "0 14px 36px rgba(11,61,51,0.16)",
        sheet: "0 -12px 40px rgba(11,61,51,0.14)",
      },
    },
  },
  plugins: [],
};
export default config;
