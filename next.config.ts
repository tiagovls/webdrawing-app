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
  // Increase body size limit for API routes (metadata, not file upload which goes directly to R2)
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

export default nextConfig
