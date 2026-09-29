import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Node 24 currently drops captured stdout from detached TypeScript CLI
    // processes. The compiler API performs the same strict build validation.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
