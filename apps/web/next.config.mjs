/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5150',
  },
}

export default nextConfig
