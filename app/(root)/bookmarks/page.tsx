import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import BookmarksList from '@/components/bookmarks/BookmarksList'

export const metadata: Metadata = {
  title: 'Bookmarks | Threble',
  description: 'Your saved posts and discussions',
}

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/signin')
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      <BookmarksList session={session} />
    </div>
  )
}
