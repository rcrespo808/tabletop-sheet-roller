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
        charcoal: "#111317",
        panel: "#181b21",
        "panel-soft": "#20242c",
        "dnd-red": "#a63d35",
        "dnd-gold": "#d9a441",
        "nwod-teal": "#2fb8ac"
      }
    }
  },
  plugins: []
};

export default config;
