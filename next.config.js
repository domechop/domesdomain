/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['maps.googleapis.com'],
  },
}

module.exports = nextConfig 