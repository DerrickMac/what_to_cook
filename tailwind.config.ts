import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#fdf6ec",
        char: "#2b2420",
        ember: "#e0603a",
      },
    },
  },
  plugins: [],
};

export default config;
