import type { Config } from "tailwindcss";

/**
 * The ONLY source of colour and type in the project.
 * `colors` is replaced (not extended), so any off-palette class fails to compile.
 * Charts import `tokens` from here rather than repeating hex values.
 */
export const tokens = {
  color: {
    canvas: "#F5F5F7",
    surface: "#FFFFFF",
    ink: { DEFAULT: "#1D1D1F", secondary: "#6E6E73", tertiary: "#A1A1A6" },
    hairline: "rgba(0,0,0,0.08)",
    // Brand green: primary buttons, links and the active nav item ONLY.
    brand: {
      DEFAULT: "#1E7F5C",
      hover: "#17684B",
      tint: "rgba(30,127,92,0.10)",
    },
    // Severity: ONLY for severity.
    sev: { green: "#16A34A", amber: "#F59E0B", red: "#DC2626" },
    // Resource accents: ONLY chart lines and small chips.
    res: { electricity: "#7C3AED", water: "#0EA5E9", waste: "#65A30D" },
  },
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...tokens.color,
    },
    fontFamily: {
      sans: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"SF Pro Display"',
        '"SF Pro Text"',
        '"Inter Variable"',
        "Inter",
        "system-ui",
        "sans-serif",
      ],
    },
    fontSize: {
      display: [
        "60px",
        { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" },
      ],
      title: [
        "32px",
        { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" },
      ],
      section: [
        "20px",
        { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" },
      ],
      body: ["15px", { lineHeight: "24px" }],
      caption: ["12px", { lineHeight: "16px" }],
    },
    extend: {
      spacing: { page: "48px", section: "48px", card: "32px" },
      borderRadius: { card: "24px", control: "12px", pill: "999px" },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)",
        drawer: "-8px 0 40px rgba(0,0,0,.08)",
      },
      borderColor: { DEFAULT: tokens.color.hairline },
      maxWidth: { content: "1280px" },
    },
  },
  plugins: [],
};

export default config;
