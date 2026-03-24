import Providers from '@/components/Providers';
import ConditionalNavbar from '@/components/ConditionalNavbar';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: '預約系統',
  description: '預約平台',
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
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`
          ${inter.className}
          bg-slate-50 text-slate-900
          dark:bg-slate-950 dark:text-slate-100
          font-sans antialiased transition-colors duration-300
        `}
      >
        <div className="fixed inset-0 z-liquid-bg hidden overflow-hidden pointer-events-none dark:block starfield-bg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_18%_80%,_rgba(14,165,233,0.12),_transparent_26%),radial-gradient(circle_at_82%_18%,_rgba(168,85,247,0.14),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_48%,_#020617_100%)]" />
          <div className="absolute inset-0 aurora-layer aurora-layer-one" />
          <div className="absolute inset-0 aurora-layer aurora-layer-two" />
          <div className="absolute inset-0 starfield starfield-dense" />
          <div className="absolute inset-0 starfield starfield-mid" />
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
