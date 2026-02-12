import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PRODUCT_NAME } from '@/lib/constants';
import { LanguageProvider, type Language } from '@/lib/i18n';
import { cookies } from 'next/headers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: 'Healthcare for every village',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('app.language')?.value;
  const initialLanguage = (cookieLang === 'en' || cookieLang === 'hi' || cookieLang === 'pa')
    ? (cookieLang as Language)
    : undefined;
  return (
    <html lang={initialLanguage ?? 'en'} style={{ scrollBehavior: 'smooth' }}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <LanguageProvider initialLanguage={initialLanguage}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
