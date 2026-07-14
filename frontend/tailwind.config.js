/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Bleu marine de l'identité Meninx Holding
        brand: {
          50: "#eef0fa",
          100: "#dce1f4",
          200: "#b4bfe6",
          300: "#8b9dd8",
          400: "#5e6fb8",
          500: "#404f95",
          600: "#2f3c7e",
          700: "#282f66",
          800: "#232a55",
          900: "#1a1f3d",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
