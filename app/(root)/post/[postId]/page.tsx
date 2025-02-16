import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import PostDetailView from '@/components/post/PostDetailView'

export default async function PostPage({ params }: { params: { postId: string } }) {
    const session = await getServerSession(authOptions)
    
    if (!session) {
        redirect('/signin')
    }

    return <PostDetailView postId={params.postId} session={session} />
}
