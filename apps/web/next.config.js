/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // Die herstelbladsy stuur glad nie 'n Referer nie, ook nie na ons eie bediener nie.
      // Die token is reeds in die fragment (wat nooit in 'n Referer kom nie); dit is 'n tweede slot.
      // Die laaste ooreenstemmende reël wen, so dit vervang die algemene Referrer-Policy hierbo.
      { source: '/reset-password', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] },
    ];
  },

  async rewrites() {
    return [
      {
        source:      '/api/v1/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
