import { ReactNode } from 'react'
import { Providers } from './providers'
import './globals.css'
import { Inter } from 'next/font/google'
import { DatabaseThemeProvider } from "@/components/database-theme-provider"
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google'
import { Toaster } from "@/components/ui/toaster"

const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans-pro',
})

const sourceSerifPro = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif-pro',
})

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Threble',
  description: 'A social network for tech community',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sourceSansPro.variable} ${sourceSerifPro.variable}`}>
        <Providers>
          <DatabaseThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </DatabaseThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
