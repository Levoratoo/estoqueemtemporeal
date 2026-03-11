/** @type {import("next").NextConfig} */
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "estoqueemtemporeal";
const isGithubPagesBuild = process.env.GITHUB_ACTIONS === "true";
const basePath = isGithubPagesBuild ? `/${repoName}` : "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath,
  assetPrefix: basePath
};

module.exports = nextConfig;
