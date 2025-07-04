/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; connect-src 'self' https://1klcjc8um5aq.flarial.xyz https://cloudflareinsights.com https://github.com https://api.github.com https://raw.githubusercontent.com;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;