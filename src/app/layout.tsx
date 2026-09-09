// 必須: これが無い/壊れていると真っ白になります
import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import SubscriptionChecker from '@/components/SubscriptionChecker';

export const metadata: Metadata = {
  title: { default: 'Coffee Ledger', template: '%s | Coffee Ledger' },
  description: 'コーヒー豆の在庫管理・消費記録アプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coffee Ledger',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Coffee Ledger',
    description: 'コーヒー豆の在庫管理・消費記録アプリ',
    type: 'website',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Coffee Ledger" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <ServiceWorkerRegistration />
        <SubscriptionChecker />
        <a href="#main-content" className="skip-link">本文へ移動</a>
        {children}
      </body>
    </html>
  );
}
