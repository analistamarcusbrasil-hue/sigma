import type { NextConfig } from "next";

const emGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: emGitHubPages ? "/sigma" : "",
};

export default nextConfig;
