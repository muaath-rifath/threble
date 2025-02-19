import { Providers } from '@/app/providers'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="flex items-center justify-center min-h-screen">
        {children}
      </div>
    </Providers>
  )
}
