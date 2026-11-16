import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "mongodb"],
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./test-results/**/*"] },
  outputFileTracingIncludes: { "/*": ["./database/*.sql"] },
  devIndicators: false,
};
export default config;
