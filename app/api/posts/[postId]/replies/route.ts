import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { postId } = await params;

    try {
        const replies = await prisma.post.findMany({
            where: { parentId: postId },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { name: true, image: true },
                },
                reactions: true,
                 _count: {
                     select: { replies: true },
                 },
            },
        });


        return NextResponse.json({ replies })
    } catch (error) {
        console.error('Error fetching replies:', error)
        return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 })
    }
}