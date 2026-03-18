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
    default: 'BFD - BuildForDevs',
    template: '%s | BFD',
  },
  description:
    'BuildForDevs (BFD): The social network for developers to connect, collaborate, and build together.',
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
    'buildfordevs',
    'bfd',
  ],
  authors: [{ name: 'BuildForDevs Team' }],
  creator: 'BuildForDevs',
  publisher: 'BuildForDevs',
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
    title: 'BFD - BuildForDevs',
    description:
      'BuildForDevs (BFD): The social network for developers to connect, collaborate, and build together.',
    siteName: 'BFD',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BFD',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BFD - BuildForDevs',
    description:
      'BuildForDevs (BFD): The social network for developers to connect, collaborate, and build together.',
    images: ['/og-image.png'],
    creator: '@buildfordevs',
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
    icon: '/icons/bfd-cube.svg',
    shortcut: '/icons/bfd-cube.svg',
    apple: '/icons/bfd-cube.svg',
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
