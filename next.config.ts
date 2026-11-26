import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector", "@huggingface/transformers", "onnxruntime-node", "mongodb"],
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./test-results/**/*"] },
  outputFileTracingIncludes: { "/*": ["./database/*.sql"] },
  devIndicators: false,
};
export default config;
