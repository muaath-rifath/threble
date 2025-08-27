import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { uploadFileToBlobStorage, moveFile } from '@/lib/azure-storage'

type Visibility = 'public' | 'private' | 'followers'

// GET - Community-specific post feed with visibility checks
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if community exists and user has access
        const community = await prisma.community.findUnique({
            where: { id: communityId },
            include: {
                members: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 })
        }

        const currentUserMembership = community.members[0]

        // For private communities, only members can view posts
        if (community.visibility === 'PRIVATE' && !currentUserMembership) {
            return NextResponse.json({ error: 'Access denied to private community' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '20')
        const cursor = searchParams.get('cursor')
        const includeReplies = searchParams.get('includeReplies') === 'true'

        // Build where clause for posts
        let whereClause: any = {
            communityId: communityId
        }

        // If not including replies, only show top-level posts
        if (!includeReplies) {
            whereClause.parentId = null
        }

        // Apply post visibility rules
        if (!currentUserMembership) {
            // Non-members can only see public posts in public communities
            whereClause.visibility = 'public'
        } else {
            // Members can see posts based on visibility and following relationships
            whereClause.OR = [
                { authorId: session.user.id }, // User's own posts
                { visibility: 'public' },      // Public posts
                {
                    AND: [
                        { visibility: 'followers' },
                        {
                            author: {
                                followers: {
                                    some: { followerId: session.user.id }
                                }
                            }
                        }
                    ]
                }
            ]
        }

        let cursorClause = {}
        if (cursor) {
            cursorClause = {
                cursor: { id: cursor },
                skip: 1
            }
        }

        const posts = await prisma.post.findMany({
            where: whereClause,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        username: true
                    }
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        visibility: true
                    }
                },
                reactions: {
                    where: {
                        userId: session.user.id
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                parent: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        },
                        community: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        replies: true,
                        reactions: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...cursorClause
        })

        const hasNextPage = posts.length > limit
        const nextCursor = hasNextPage ? posts[limit - 1].id : null

        if (hasNextPage) {
            posts.pop()
        }

        return NextResponse.json({
            posts,
            nextCursor,
            hasNextPage,
            community: {
                id: community.id,
                name: community.name,
                visibility: community.visibility,
                currentUserMembership
            }
        })

    } catch (error) {
        console.error('Error fetching community posts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch community posts' },
            { status: 500 }
        )
    }
}

// POST - Create a post in the community
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user is a member of the community
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId: communityId
                }
            },
            include: {
                community: {
                    select: {
                        id: true,
                        name: true,
                        visibility: true
                    }
                }
            }
        })

        if (!membership) {
            return NextResponse.json({ 
                error: 'You must be a member of the community to post in it' 
            }, { status: 403 })
        }

        const formData = await req.formData()
        const content = formData.get('content') as string
        const visibility = (formData.get('visibility') as Visibility) || 'public'
        const parentId = formData.get('parentId') as string | null
        const mediaFiles = formData.getAll('mediaAttachments') as File[]
        let mediaAttachments: string[] = []

        // Validate content
        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
        }

        // Validate visibility
        if (!['public', 'private', 'followers'].includes(visibility)) {
            return NextResponse.json({ 
                error: 'Invalid visibility value. Must be public, private, or followers.' 
            }, { status: 400 })
        }

        // If replying to a post, ensure the parent post is in the same community
        if (parentId) {
            const parentPost = await prisma.post.findUnique({
                where: { id: parentId },
                select: { communityId: true, authorId: true }
            })

            if (!parentPost) {
                return NextResponse.json({ error: 'Parent post not found' }, { status: 404 })
            }

            if (parentPost.communityId !== communityId) {
                return NextResponse.json({ 
                    error: 'Cannot reply to a post from a different community' 
                }, { status: 400 })
            }
        }

        // Upload media files if provided
        if (mediaFiles.length > 0) {
            mediaAttachments = await Promise.all(
                mediaFiles.map(file => uploadFileToBlobStorage(file, session.user.id))
            )
        }

        // Create the post
        const newPost = await prisma.post.create({
            data: {
                content: content.trim(),
                authorId: session.user.id,
                visibility: visibility as Visibility,
                parentId,
                communityId,
                mediaAttachments
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        username: true
                    }
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        visibility: true
                    }
                },
                reactions: true,
                _count: {
                    select: { replies: true }
                },
                parent: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        }
                    }
                }
            }
        })

        // Move files from temp location to final location under the post ID
        if (mediaAttachments.length > 0) {
            try {
                const updatedAttachments = await Promise.all(
                    mediaAttachments.map(url => 
                        moveFile(url, session.user.id, newPost.id)
                    )
                )

                // Update the post with new media URLs
                await prisma.post.update({
                    where: { id: newPost.id },
                    data: { mediaAttachments: updatedAttachments }
                })

                // Update the returned post object
                newPost.mediaAttachments = updatedAttachments
            } catch (error) {
                console.error('Error moving media files:', error)
                // Continue with the original URLs if move fails
            }
        }

        return NextResponse.json({ 
            post: newPost,
            message: 'Post created successfully'
        }, { status: 201 })

    } catch (error) {
        console.error('Error creating community post:', error)
        return NextResponse.json(
            { error: 'Failed to create post' },
            { status: 500 }
        )
    }
}
