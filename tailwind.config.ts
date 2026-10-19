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
        /** warm amber: achievements only */
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        /** lightning violet */
        arc: "hsl(var(--arc))",
        /** cool cyan */
        ion: "hsl(var(--ion))",
        success: "hsl(var(--success))",
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: "hsl(var(--popover))",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 8px)" },
      boxShadow: { card: "var(--shadow-card)", float: "var(--shadow-float)" },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "-apple-system", '"Segoe UI"', "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        flash: { "0%": { opacity: "0" }, "6%": { opacity: ".55" }, "11%": { opacity: ".08" }, "17%": { opacity: ".32" }, "100%": { opacity: "0" } },
        // a faint, irregular flicker behind the clouds
        flicker: { "0%": { opacity: "0" }, "4%": { opacity: ".9" }, "8%": { opacity: ".15" }, "12%": { opacity: ".6" }, "30%": { opacity: ".05" }, "100%": { opacity: "0" } },
        drift: { from: { transform: "translate3d(-3%,0,0)" }, to: { transform: "translate3d(3%,0,0)" } },
        breathe: { "0%,100%": { opacity: ".55" }, "50%": { opacity: "1" } },
        "toast-in": { from: { opacity: "0", transform: "translateY(10px) scale(.98)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        // the Aura counter's charge: a quick bright pulse that settles
        charge: {
          "0%": { textShadow: "0 0 0 hsl(var(--primary) / 0)", transform: "scale(1)" },
          "18%": { textShadow: "0 0 22px hsl(var(--primary) / .95), 0 0 2px hsl(var(--ion))", transform: "scale(1.08)" },
          "100%": { textShadow: "0 0 0 hsl(var(--primary) / 0)", transform: "scale(1)" },
        },
        "bolt-draw": { "0%": { strokeDashoffset: "1", opacity: "1" }, "55%": { strokeDashoffset: "0", opacity: "1" }, "100%": { strokeDashoffset: "0", opacity: "0" } },
        rise: { "0%": { opacity: "0", transform: "translateY(4px)" }, "20%": { opacity: "1" }, "100%": { opacity: "0", transform: "translateY(-18px)" } },
        ring: { "0%": { transform: "scale(.6)", opacity: ".9" }, "100%": { transform: "scale(1.7)", opacity: "0" } },
        sweep: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.2,.8,.2,1) both",
        flash: "flash 1.6s ease-out both",
        flicker: "flicker 1.1s ease-out both",
        drift: "drift 60s ease-in-out infinite alternate",
        breathe: "breathe 2.4s ease-in-out infinite",
        "toast-in": "toast-in .32s cubic-bezier(.2,.8,.2,1) both",
        charge: "charge .9s cubic-bezier(.2,.8,.2,1) both",
        "bolt-draw": "bolt-draw .9s cubic-bezier(.3,.7,.2,1) both",
        rise: "rise 1.1s ease-out both",
        ring: "ring .7s ease-out both",
        sweep: "sweep 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};
export default config;
