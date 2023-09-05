/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  important: true,
  theme: {
    extend: {},
    screens: {
      mb: "480px",

      sm: "576px",

      md: "768px",

      lg: "992px",

      xl: "1200px",

      "2xl": "1536px",
    },
  },
  plugins: [],
};
