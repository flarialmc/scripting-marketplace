/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)', // Apply to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; connect-src 'self' https://1klcjc8um5aq.flarial.xyz https://cloudflareinsights.com https://discord.com;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
