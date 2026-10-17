import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        success: "hsl(var(--success))",
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: "hsl(var(--popover))",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 8px)" },
      boxShadow: { card: "var(--shadow-card)", float: "var(--shadow-float)" },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', "var(--font-inter)", '"Segoe UI"', "system-ui", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', "var(--font-inter)", '"Segoe UI"', "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        // a single, soft flash of lightning for milestones
        flash: { "0%": { opacity: "0" }, "6%": { opacity: ".5" }, "11%": { opacity: ".08" }, "17%": { opacity: ".3" }, "100%": { opacity: "0" } },
        drift: { from: { transform: "translateX(-2.5%)" }, to: { transform: "translateX(2.5%)" } },
        breathe: { "0%,100%": { opacity: ".55" }, "50%": { opacity: "1" } },
        "toast-in": { from: { opacity: "0", transform: "translateY(10px) scale(.98)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.2,.8,.2,1) both",
        flash: "flash 1.6s ease-out both",
        drift: "drift 38s ease-in-out infinite alternate",
        breathe: "breathe 2.4s ease-in-out infinite",
        "toast-in": "toast-in .32s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [animate],
};
export default config;
