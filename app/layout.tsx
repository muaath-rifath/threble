import { ReactNode } from 'react'
import { Providers } from './providers'
import './globals.css'
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google'
import { Toaster } from "@/components/ui/toaster"
import ThemeScript from "@/components/theme-script"
import { ThemeProvider } from "@/lib/theme"

const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans-pro',
})

const sourceSerifPro = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif-pro',
})

export const metadata = {
  title: 'Threble',
  description: 'A social network for tech community',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${sourceSansPro.variable} ${sourceSerifPro.variable}`}>
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
