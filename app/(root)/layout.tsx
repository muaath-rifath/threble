import Topbar from '@/components/shared/Topbar'
import LeftSidebar from '@/components/shared/LeftSidebar'
import RightSidebar from '@/components/shared/RightSidebar'
import Bottombar from '@/components/shared/Bottombar'
import { Providers } from '@/app/providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <Topbar />
      <main className="flex flex-row">
        <div className="leftsidebar-wrapper">
          <LeftSidebar />
        </div>
        <section className="main-container">
          <div className="w-full max-w-4xl">{children}</div>
        </section>
        <RightSidebar />
      </main>
      <Bottombar />
    </Providers>
  )
}
