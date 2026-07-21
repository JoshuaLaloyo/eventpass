import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#131A24", 800: "#1C2836", 700: "#2A3B50" },
        accent: { DEFAULT: "#E8A13A", dark: "#C9862A" },
      },
    },
  },
  plugins: [],
};
export default config;
