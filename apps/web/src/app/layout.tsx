import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DevCommunity - Where Developers Build Together',
    template: '%s | DevCommunity',
  },
  description:
    'Join the ultimate social network for developers. Connect, collaborate, and build amazing projects with developers worldwide.',
  keywords: [
    'developers',
    'programming',
    'social network',
    'coding',
    'projects',
    'collaboration',
    'open source',
    'startup',
    'hackathon',
    'tech community',
  ],
  authors: [{ name: 'DevCommunity Team' }],
  creator: 'DevCommunity',
  publisher: 'DevCommunity',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'DevCommunity - Where Developers Build Together',
    description:
      'Join the ultimate social network for developers. Connect, collaborate, and build amazing projects.',
    siteName: 'DevCommunity',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DevCommunity',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevCommunity - Where Developers Build Together',
    description:
      'Join the ultimate social network for developers. Connect, collaborate, and build amazing projects.',
    images: ['/og-image.png'],
    creator: '@devcommunity',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icons/icon-192x192.svg',
    shortcut: '/icons/icon-192x192.svg',
    apple: '/icons/icon-192x192.svg',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
