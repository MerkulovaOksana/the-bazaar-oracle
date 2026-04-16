import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bazaar: {
          bg: "#1a1525",
          card: "#241e35",
          surface: "#2e2645",
          accent: "#c9a84c",
          gold: "#dbb954",
          bronze: "#b87333",
          purple: "#7c5cbf",
          deepPurple: "#5a3d8a",
          green: "#4ade80",
          red: "#f87171",
          teal: "#38bdf8",
          muted: "#a09bb5",
          text: "#e8e4f0",
          warm: "#f5e6c8",
        },
      },
      backgroundImage: {
        "bazaar-gradient": "linear-gradient(135deg, #1a1525 0%, #2e1f4a 50%, #1a1525 100%)",
        "gold-gradient": "linear-gradient(135deg, #c9a84c, #dbb954, #f0d078)",
        "card-gradient": "linear-gradient(180deg, #2e2645 0%, #241e35 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
