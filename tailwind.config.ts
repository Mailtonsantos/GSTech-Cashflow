import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/frontend/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cash: {
          ink: "#16211f",
          muted: "#66736f",
          line: "#dce7e3",
          canvas: "#f6f8f7",
          brand: "#0f766e",
          brandDark: "#0b5f59",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(22, 33, 31, 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
