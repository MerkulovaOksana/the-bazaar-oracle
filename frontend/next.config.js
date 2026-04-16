/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thebazaar.wiki.gg",
      },
      {
        protocol: "https",
        hostname: "playthebazaar.com",
      },
    ],
  },
  async rewrites() {
    // Only proxy in dev (when NEXT_PUBLIC_API_URL is not set)
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
