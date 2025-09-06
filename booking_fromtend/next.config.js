/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Next.js 14 已經默認支持 app 目錄，不需要實驗性配置
  // 移除過時的實驗性配置
};

module.exports = nextConfig; 