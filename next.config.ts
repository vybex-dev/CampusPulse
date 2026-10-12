import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  // Files read at runtime via process.cwd() are not imported, so Next would drop them
  // from the serverless bundle. Trace them explicitly.
  outputFileTracingIncludes: {
    "/**/*": [
      "./data/campuspulse.db",
      "./config/**/*",
      "./node_modules/better-sqlite3/**/*",
    ],
  },
};

export default config;
