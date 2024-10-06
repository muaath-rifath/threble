import Topbar from '@/components/shared/Topbar'
import LeftSidebar from '@/components/shared/LeftSidebar'
import RightSidebar from '@/components/shared/RightSidebar'
import Bottombar from '@/components/shared/Bottombar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Topbar />
      <main className="flex flex-row">
        <LeftSidebar />
        <section className="main-container">
          <div className="w-full max-w-4xl">{children}</div>
        </section>
        <RightSidebar />
      </main>
      <Bottombar />
    </>
  )
}
