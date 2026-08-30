import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.FILIKA_E2E === "1" ? ".next-e2e" : ".next",
  reactStrictMode: false,
};

export default config;
