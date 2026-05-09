const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/v1/* calls to the NestJS backend.
        // This way the browser never calls the backend directly —
        // the cookie is sent same-origin and CORS is not an issue.
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;