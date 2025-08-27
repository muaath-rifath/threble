'use client'

import { SessionProvider } from "next-auth/react"
import { ReactNode } from 'react'
import { ReduxProvider } from '@/lib/redux/ReduxProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider>
      <SessionProvider>{children}</SessionProvider>
    </ReduxProvider>
  )
}
