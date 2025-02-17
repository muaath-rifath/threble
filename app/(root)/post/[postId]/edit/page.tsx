import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PostEditForm from '@/components/post/PostEditForm';

export default async function EditPostPage({ params }: { params: { postId: string } }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/');
    }

    const post = await prisma.post.findUnique({
        where: { id: params.postId },
        select: {
            id: true,
            content: true,
            mediaAttachments: true,
            author: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    });

    if (!post) {
        redirect('/');
    }

    // Check if the user is the author
    if (post.author.name !== session.user.name) {
        redirect(`/post/${params.postId}`);
    }

    return <PostEditForm post={post} session={session} />;
}