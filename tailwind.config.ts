import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFDF9",
          100: "#FBF5EC",
          200: "#F6EDE2",
          300: "#EFE3D7",
          400: "#E5D5C5",
          500: "#D3BFAC",
        },
        bvc: {
          bg: "#FBF5EC",
          surface: "#FFFDF9",
          surface2: "#F6EDE2",
          glass: "rgba(255, 255, 255, 0.82)",
          glassDark: "rgba(246, 237, 226, 0.75)",
          text: "#242126",
          secondary: "#81766C",
          muted: "#A69A90",
          border: "#EFE3D7",
          red: "#D7192D",
          deepRed: "#B90F24",
          redHighlight: "#F34D55",
          redLight: "#FFF0F2",
          peach: "#FFC49B",
          peachLight: "#FFF5ED",
          success: "#2E9B65",
          error: "#D94444",
        },
        category: {
          food: "#E24A4A",
          foodBg: "#FDF2F2",
          stay: "#8A74D4",
          stayBg: "#F3F0FC",
          transport: "#4A94E8",
          transportBg: "#EDF5FD",
          activities: "#E65C8C",
          activitiesBg: "#FDF0F5",
          shopping: "#EFA43A",
          shoppingBg: "#FEF7EE",
          others: "#8E8994",
          othersBg: "#F4F3F5",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        script: ["var(--font-remachine)", "cursive"],
      },
      boxShadow: {
        card: "0 8px 24px -4px rgba(36, 33, 38, 0.05), 0 2px 6px -1px rgba(36, 33, 38, 0.03)",
        cardHover: "0 14px 30px -4px rgba(36, 33, 38, 0.08), 0 4px 10px -2px rgba(36, 33, 38, 0.04)",
        floating: "0 16px 36px -6px rgba(36, 33, 38, 0.12), 0 6px 14px -3px rgba(36, 33, 38, 0.06)",
        redGlow: "0 10px 25px -3px rgba(215, 25, 45, 0.35)",
        sheet: "0 -10px 40px rgba(0, 0, 0, 0.15)",
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

