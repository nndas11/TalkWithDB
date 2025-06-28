import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TalkWithDB | AI Database Query Converter',
  description: 'TalkWithDB - Convert natural language to database queries using AI. Supports MySQL, PostgreSQL, and MongoDB with live database connections. Created by Aravind S.',
  authors: [{ name: 'Aravind S', url: 'https://github.com/ars-it' }],
  keywords: ['database', 'query', 'ai', 'openai', 'mysql', 'postgresql', 'mongodb', 'natural-language', 'sql'],
  creator: 'Aravind S',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
} 