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
}

export default nextConfig
