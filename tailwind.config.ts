import animate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1360px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: token("background"),
        surface: token("surface"),
        elevated: token("elevated"),
        border: token("border"),
        input: token("border"),
        ring: token("primary"),
        foreground: token("text"),
        muted: {
          DEFAULT: token("accent"),
          foreground: token("muted"),
        },
        accent: {
          DEFAULT: token("accent"),
          foreground: token("text"),
        },
        primary: {
          DEFAULT: token("primary"),
          foreground: "rgb(255 255 255 / <alpha-value>)",
        },
        income: token("income"),
        expense: token("expense"),
        destructive: {
          DEFAULT: token("expense"),
          foreground: "rgb(255 255 255 / <alpha-value>)",
        },
        card: {
          DEFAULT: token("surface"),
          foreground: token("text"),
        },
        popover: {
          DEFAULT: token("elevated"),
          foreground: token("text"),
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)",
        lift: "0 2px 4px rgb(0 0 0 / 0.06), 0 18px 40px -16px rgb(0 0 0 / 0.32)",
        glow: "0 8px 30px -8px rgb(var(--primary) / 0.55)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
