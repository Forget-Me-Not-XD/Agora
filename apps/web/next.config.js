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

  // Lint loop in sy eie CI-job, en daardie job mag faal sonder om die pipeline te stop. Sonder
  // hierdie instelling sou next build self ook lint, en dan sou 'n lint-fout die Docker-beeld keer.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Next 14 hou 'n dinamiese bladsy tot 30 sekondes in die blaaier se kas. Dan wys die resensie-modal
  // of die dashboard se Hangende Resensies nog iets wat intussen op 'n ander toestel beoordeel is.
  // Met 0 vra elke navigasie die bladsy vars van die bediener af; Next 15 doen dit reeds by verstek.
  // Die terug-knoppie gebruik steeds die kas. Die modal kan nogtans soms verouderd wees, daarom kyk
  // ReviewForm self ook wanneer dit oopmaak.
  experimental: {
    staleTimes: { dynamic: 0 },
  },

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
