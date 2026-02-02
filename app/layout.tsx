import React from "react"
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _dmSans = DM_Sans({ 
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans'
});

export const metadata: Metadata = {
  title: 'PAWS Veterinary Clinic | Pet Care Services',
  description: 'Professional veterinary clinic providing comprehensive pet care services. Book appointments online for your beloved pets.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/images/image.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/images/image.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/images/image.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
