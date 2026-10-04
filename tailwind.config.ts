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
      screens: { "2xl": "1320px" },
    },
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        // Klasik tipografik ölçek (12 · 13 · 15 · 18 · 21 · 28 · 44 · 64)
        micro: ["12px", "16px"],
        small: ["13px", "18px"],
        base: ["15px", "24px"],
        lead: ["18px", "26px"],
        heading: ["21px", "28px"],
      },
      colors: {
        background: token("background"),
        surface: token("surface"),
        elevated: token("elevated"),
        note: { DEFAULT: token("note"), line: token("note-line") },
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
          foreground: token("on-primary"),
        },
        income: token("income"),
        expense: token("expense"),
        "on-strong": token("on-strong"),
        destructive: {
          DEFAULT: token("expense"),
          foreground: token("on-strong"),
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
        // Hiyerarşiye göre: banknot 20 · panel 14 · kontrol 10 · küçük 6
        note: "20px",
        panel: "14px",
        xl: "10px",
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      boxShadow: {
        // Gölge yalnızca yüzen katmanlarda (popover, sheet, dialog)
        lift: "0 1px 2px rgb(0 0 0 / 0.08), 0 16px 40px -12px rgb(0 0 0 / 0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
