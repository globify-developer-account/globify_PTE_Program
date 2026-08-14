/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Recorded audio and uploaded proofs must never be cached by shared proxies.
        source: '/api/files/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ]
  },
}

export default nextConfig
