/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // 允許 Google 用戶頭像
  },
  // 移除靜態生成問題的設置
  experimental: {
    appDir: true,
  },
  // 強制動態渲染，避免靜態生成問題
  dynamic: 'force-dynamic',
};

module.exports = nextConfig; 