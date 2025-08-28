import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

async function authorizePostAccess(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { 
            authorId: true,
            communityId: true,
            community: {
                select: {
                    id: true,
                    name: true,
                    visibility: true
                }
            }
        }
    });
    
    if (!post) {
        throw new Error('Post not found');
    }

    // For community posts, check access
    if (post.communityId && post.community) {
        // For private communities, user must be a member
        if (post.community.visibility === 'PRIVATE') {
            const membership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: userId,
                        communityId: post.communityId
                    }
                }
            });

            if (!membership) {
                throw new Error('Access denied to private community post');
            }
        }
    }

    return post;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { postId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const cursor = searchParams.get('cursor');
    const parentId = searchParams.get('parentId') || postId; // For nested replies

    try {
        // Authorize access to the post
        await authorizePostAccess(postId, session.user.id);

        // Build cursor condition for pagination
        let whereClause: any = {
            parentId: parentId,
        };

        if (cursor) {
            whereClause.createdAt = {
                lt: new Date(cursor)
            };
        }

        const replies = await prisma.post.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit + 1, // Fetch one extra to check if there are more
            select: {
                id: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                authorId: true,
                parentId: true,
                communityId: true,
                mediaAttachments: true,
                author: {
                    select: { 
                        id: true,
                        name: true, 
                        image: true,
                        username: true,
                    },
                },
                reactions: true,
                _count: {
                    select: { replies: true },
                },
            },
        });

        // Check if there are more replies
        const hasMore = replies.length > limit;
        const repliesData = hasMore ? replies.slice(0, limit) : replies;

        // Get next cursor from last item
        const nextCursor = hasMore && repliesData.length > 0 
            ? repliesData[repliesData.length - 1].createdAt.toISOString()
            : null;

        return NextResponse.json({ 
            replies: repliesData,
            nextCursor,
            hasMore
        });
    } catch (error: any) {
        console.error('Error fetching replies:', error);
        if (error.message === 'Post not found') {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error.message === 'Access denied to private community post') {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }
}