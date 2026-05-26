import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0e27",
        foreground: "#f5f1e8",
        muted: "#2a3050",
        "muted-foreground": "#a0a8c8",
        charcoal: "#0a0e27",
        panel: "#0f1429",
        "panel-soft": "#1a1f3a",
        "dnd-red": "#b85d2d",
        "dnd-gold": "#f59e0b",
        "nwod-teal": "#06b6d4",
        "magic-purple": "#8b5cf6"
      }
    }
  },
  plugins: []
};

export default config;
