import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17243a",
        paper: "#f5f7fb",
        brand: "#315efb",
      },
      boxShadow: {
        card: "0 12px 35px rgba(27, 45, 80, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
