import Providers from '@/components/Providers';
import ConditionalNavbar from '@/components/ConditionalNavbar';
import './globals.css';
import { Inter } from 'next/font/google';

// 導入蘋果風格字體
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: '機器預約系統',
  description: 'AI GPU 資源預約平台',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '16x16 32x32',
        type: 'image/x-icon',
      },
    ],
    shortcut: '/favicon.ico',
    apple: [
      {
        url: '/favicon.ico',
        sizes: '180x180',
      },
    ],
    other: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        url: '/favicon.ico',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* 預載蘋果字體 */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`
        ${inter.className} 
        font-sans antialiased
        bg-gradient-to-br from-white via-purple-50/30 to-blue-50/50
        dark:bg-gradient-to-br dark:from-black dark:via-gray-900 dark:to-gray-800
        text-purple-900 dark:text-white
        transition-colors duration-300
      `}>
        {/* 液態背景效果 */}
        <div className="fixed inset-0 z-liquid-bg overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl animate-liquid-flow" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-accent/5 to-primary/5 rounded-full blur-2xl animate-liquid-wave" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-secondary/3 to-accent/3 rounded-full blur-xl animate-float" />
        </div>

        <Providers>
          <div className="relative min-h-screen z-liquid-content">
            <ConditionalNavbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
} 