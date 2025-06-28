import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TalkWithDB | AI Database Query Converter',
  description: 'TalkWithDB - Convert natural language to database queries using AI. Supports MySQL, PostgreSQL, and MongoDB with live database connections. Created by Nihad.',
  authors: [{ name: 'Nihad ', url: 'https://github.com/nndas' }],
  keywords: ['database', 'query', 'ai', 'openai', 'mysql', 'postgresql', 'mongodb', 'natural-language', 'sql'],
  creator: 'Nihad',
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