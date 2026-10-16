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
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        volt: "#facc15",
        bolt: "#38bdf8",
        storm: "#8b5cf6",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        flash: { "0%,100%": { opacity: "0" }, "10%,30%": { opacity: "0.9" }, "20%": { opacity: "0.2" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "70%": { transform: "scale(1.08)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        confetti: { "0%": { transform: "translateY(-10vh) rotate(0)", opacity: "1" }, "100%": { transform: "translateY(105vh) rotate(720deg)", opacity: "0.8" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "slide-in": { from: { transform: "translateX(120%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        flicker: { "0%,100%": { opacity: "1" }, "45%": { opacity: ".75" }, "50%": { opacity: "1" }, "55%": { opacity: ".6" } },
      },
      animation: {
        flash: "flash 1.1s ease-out",
        float: "float 4s ease-in-out infinite",
        pop: "pop .5s cubic-bezier(.2,1.4,.4,1) both",
        confetti: "confetti linear forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "slide-in": "slide-in .35s cubic-bezier(.2,.9,.3,1) both",
        flicker: "flicker 3s infinite",
      },
    },
  },
  plugins: [animate],
};
export default config;
