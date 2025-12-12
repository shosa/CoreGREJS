/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    // Disabilita ESLint durante il build in produzione
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disabilita il type checking durante il build in produzione
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3011/api/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://localhost:3011/storage/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3011',
        pathname: '/storage/**',
      },
    ],
  },
}

module.exports = nextConfig
