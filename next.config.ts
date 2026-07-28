import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow loading 3D model files from R2 (needed for CORS headers)
  async headers() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://webdrawing.fr'
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: appUrl },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
  // Clerk proxy — bypasses clerk.webdrawing.fr DNS, routes through our own domain
  async rewrites() {
    return [
      {
        source: '/clerk-proxy/:path*',
        destination: 'https://frontend-api.clerk.services/:path*',
      },
      {
        source: '/clerk-proxy-accounts/:path*',
        destination: 'https://api.clerk.services/:path*',
      },
    ]
  },
}

export default nextConfig
