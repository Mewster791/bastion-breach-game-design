import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['600', '800'] })

export const metadata: Metadata = {
  title: 'Bastion Breach: Blue vs Red',
  description:
    'A third-person siege combat game. Lead the blue army, fight through red defenders and crossbows, and raise your banner over the red fort.',
  openGraph: {
    title: 'Bastion Breach: Blue vs Red',
    description:
      'A third-person siege combat game. Lead the blue army, fight through red defenders and crossbows, and raise your banner over the red fort.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d1422',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable} bg-[#0d1422]`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
