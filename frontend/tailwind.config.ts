// tailwind.config.ts

import type { Config } from "tailwindcss";

const config = {
  darkMode: "class",

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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
      /* =====================================================
         CUSTOM COLORS
      ===================================================== */

      colors: {
        // Custom Neon Colors
        "neon-violet": "#8B5CF6",
        "neon-blue": "#3B82F6",

        // Main dark background
        "dark-background": "#050816",

        /* ===================================================
           SHADCN COLORS
        =================================================== */

        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        background: "var(--background)",
        foreground: "var(--foreground)",

        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },

        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },

        destructive: {
          DEFAULT: "var(--destructive)",
        },

        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },

        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },

        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },

        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },

        /* ===================================================
           CHART COLORS
        =================================================== */

        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },

        /* ===================================================
           SIDEBAR COLORS
        =================================================== */

        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },

      /* =====================================================
         BORDER RADIUS
      ===================================================== */

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },

      /* =====================================================
         KEYFRAMES
      ===================================================== */

      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },

          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },

        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },

          to: {
            height: "0",
          },
        },

        "neon-pulse": {
          "0%, 100%": {
            opacity: "1",
          },

          "50%": {
            opacity: "0.6",
          },
        },

        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },

          "50%": {
            transform: "translateY(-10px)",
          },
        },
      },

      /* =====================================================
         ANIMATIONS
      ===================================================== */

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        "neon-pulse": "neon-pulse 2s ease-in-out infinite",

        "float": "float 4s ease-in-out infinite",
      },

      /* =====================================================
         BOX SHADOW
      ===================================================== */

      boxShadow: {
        "neon-blue":
          "0 0 20px rgba(59, 130, 246, 0.45)",

        "neon-violet":
          "0 0 20px rgba(139, 92, 246, 0.45)",

        "neon-blue-lg":
          "0 0 40px rgba(59, 130, 246, 0.5)",

        "neon-violet-lg":
          "0 0 40px rgba(139, 92, 246, 0.5)",
      },
    },
  },

  /*
   * Tailwind CSS v4 + tw-animate-css
   *
   * Do NOT add:
   *
   * require("tailwindcss-animate")
   *
   * tw-animate-css is imported from globals.css.
   */
  plugins: [],
} satisfies Config;

export default config;