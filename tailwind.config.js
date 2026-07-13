/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /^bg-(brand|status)-(primary|secondary|accent|bright|orange|midnight|hoh|pov|nominee|safe|jury|evicted|winner|have-not)(-light)?$/ },
    { pattern: /^text-(brand|status)-(primary|secondary|accent|bright|orange|midnight|hoh|pov|nominee|safe|jury|evicted|winner|have-not)(-light)?$/ },
    { pattern: /^border-(brand|status)-(primary|secondary|accent|bright|orange|midnight|hoh|pov|nominee|safe|jury|evicted|winner|have-not)(-light)?$/ },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["\"Bebas Neue\"", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          primary: "#1F52FF",   // Royal Blue — shared anchor across both themes
          secondary: "#081B63", // Deep Navy — dark theme bg, solid navy fills
          accent: "#63C9FF",    // Sky Blue — dark theme secondary text/labels
          bright: "#FF8145",    // Amber Orange — dark theme highlights/energy pops
          orange: "#FF5A36",    // Red-Orange — dark theme primary gradient pairing
          midnight: "#040D2F",  // Darkest navy variant — still blue-tinted, never pure black
        },
        "status-hoh": {
          DEFAULT: "#1D4ED8",
          light: "#BFDBFE",
        },
        "status-pov": {
          DEFAULT: "#F59E0B",
          light: "#FDE68A",
        },
        "status-nominee": {
          DEFAULT: "#991B1B",
          light: "#FEE2E2",
        },
        "status-safe": {
          DEFAULT: "#059669",
          light: "#BBF7D0",
        },
        "status-jury": {
          DEFAULT: "#7C3AED",
          light: "#DDD6FE",
        },
        "status-evicted": {
          DEFAULT: "#4B5563",
          light: "#E5E7EB",
        },
        "status-winner": {
          DEFAULT: "#BE185D",
          light: "#FBCFE8",
        },
        "status-have-not": {
          DEFAULT: "#EA580C",
          light: "#FED7AA",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "999px",
        card: "12px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
