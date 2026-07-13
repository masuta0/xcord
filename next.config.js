/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // プロキシサイトからの iframe 埋め込みを許可
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // X-Frame-Options を外し、CSP で frame-ancestors を許可
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
module.exports = nextConfig;
