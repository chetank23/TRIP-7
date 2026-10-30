import type { Metadata, Viewport } from 'next';
import { plusJakartaSans, remachineScript } from '@/lib/fonts';
import { TripProvider } from '@/lib/trip-context';
import { Navigation } from '@/components/Navigation';
import { AddExpenseSheet } from '@/components/AddExpenseSheet';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { BudgetModal } from '@/components/BudgetModal';
import { PdfViewerModal } from '@/components/PdfViewerModal';
import { Toast } from '@/components/Toast';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { PageSwitchTransition } from '@/components/PageSwitchTransition';
import './globals.css';

export const metadata: Metadata = {
  title: 'BVC Trip — Shared Trip Budget Management',
  description: 'Premium banking-style shared trip budget management for seven friends.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BVC Trip',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#D7192D',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${remachineScript.variable}`}>
      <head>
        {/* iPhone 14+ Apple PWA & WebKit Security Specifics */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BVC Trip" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-bvc-bg text-bvc-text font-sans antialiased selection:bg-bvc-red/20 selection:text-bvc-red min-h-screen">
        <TripProvider>
          <ServiceWorkerRegister />
          <Toast />
          <PageSwitchTransition>
            {children}
          </PageSwitchTransition>
          <Navigation />
          <AddExpenseSheet />
          <DeleteConfirmModal />
          <BudgetModal />
          <PdfViewerModal />
        </TripProvider>
      </body>
    </html>
  );
}

