'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'

// Create a new community
export async function createCommunity(formData: FormData) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const visibility = formData.get('visibility') as 'PUBLIC' | 'PRIVATE'
        const imageFile = formData.get('image') as File
        const coverImageFile = formData.get('coverImage') as File

        if (!name) {
            return { success: false, error: 'Community name is required' }
        }

        // Check if community name already exists
        const existingCommunity = await prisma.community.findUnique({
            where: { name }
        })

        if (existingCommunity) {
            return { success: false, error: 'Community name already exists' }
        }

        let imageUrl = null
        let coverImageUrl = null

        // Upload image files if provided
        if (imageFile && imageFile.size > 0) {
            imageUrl = await uploadFileToBlobStorage(imageFile, `communities/${session.user.id}`)
        }

        if (coverImageFile && coverImageFile.size > 0) {
            coverImageUrl = await uploadFileToBlobStorage(coverImageFile, `communities/${session.user.id}`)
        }

        // Create community and automatically add creator as admin member
        const community = await prisma.$transaction(async (tx) => {
            const newCommunity = await tx.community.create({
                data: {
                    name,
                    description: description || null,
                    visibility: visibility || 'PUBLIC',
                    image: imageUrl,
                    coverImage: coverImageUrl,
                    creatorId: session.user.id,
                }
            })

            // Add creator as admin member
            await tx.communityMember.create({
                data: {
                    userId: session.user.id,
                    communityId: newCommunity.id,
                    role: 'ADMIN'
                }
            })

            return newCommunity
        })

        revalidatePath('/communities')
        return { success: true, community }
    } catch (error) {
        console.error('Error creating community:', error)
        return { success: false, error: 'Failed to create community' }
    }
}

// Join a public community
export async function joinCommunity(communityId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get community details
        const community = await prisma.community.findUnique({
            where: { id: communityId },
            include: {
                members: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!community) {
            return { success: false, error: 'Community not found' }
        }

        // Check if user is already a member
        if (community.members.length > 0) {
            return { success: false, error: 'Already a member of this community' }
        }

        if (community.visibility === 'PRIVATE') {
            // For private communities, create a join request
            const existingRequest = await prisma.joinRequest.findUnique({
                where: {
                    communityId_userId: {
                        communityId,
                        userId: session.user.id
                    }
                }
            })

            if (existingRequest) {
                return { success: false, error: 'Join request already submitted' }
            }

            await prisma.joinRequest.create({
                data: {
                    communityId,
                    userId: session.user.id,
                    status: 'PENDING'
                }
            })

            return { success: true, message: 'Join request submitted' }
        } else {
            // For public communities, add directly as member
            await prisma.communityMember.create({
                data: {
                    userId: session.user.id,
                    communityId,
                    role: 'USER'
                }
            })

            revalidatePath(`/communities/${community.name}`)
            return { success: true, message: 'Successfully joined community' }
        }
    } catch (error) {
        console.error('Error joining community:', error)
        return { success: false, error: 'Failed to join community' }
    }
}

// Leave a community
export async function leaveCommunity(communityId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get user's membership
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            },
            include: {
                community: true
            }
        })

        if (!membership) {
            return { success: false, error: 'Not a member of this community' }
        }

        // Check if user is the only admin
        if (membership.role === 'ADMIN') {
            const adminCount = await prisma.communityMember.count({
                where: {
                    communityId,
                    role: 'ADMIN'
                }
            })

            if (adminCount === 1) {
                return { success: false, error: 'Cannot leave: You are the only admin. Please transfer ownership first.' }
            }
        }

        // Remove membership
        await prisma.communityMember.delete({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        revalidatePath(`/communities/${membership.community.name}`)
        return { success: true, message: 'Successfully left community' }
    } catch (error) {
        console.error('Error leaving community:', error)
        return { success: false, error: 'Failed to leave community' }
    }
}

// Update member role (admin/moderator only)
export async function updateMemberRole(communityId: string, memberId: string, newRole: 'USER' | 'MODERATOR' | 'ADMIN') {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check if current user has permission to change roles
        const currentUserMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!currentUserMembership || currentUserMembership.role !== 'ADMIN') {
            return { success: false, error: 'Not authorized to change member roles' }
        }

        // Get target member
        const targetMember = await prisma.communityMember.findUnique({
            where: { id: memberId },
            include: { community: true }
        })

        if (!targetMember || targetMember.communityId !== communityId) {
            return { success: false, error: 'Member not found' }
        }

        // Prevent changing own role if it would leave no admins
        if (targetMember.userId === session.user.id && targetMember.role === 'ADMIN' && newRole !== 'ADMIN') {
            const adminCount = await prisma.communityMember.count({
                where: {
                    communityId,
                    role: 'ADMIN'
                }
            })

            if (adminCount === 1) {
                return { success: false, error: 'Cannot change role: At least one admin is required' }
            }
        }

        // Update role
        await prisma.communityMember.update({
            where: { id: memberId },
            data: { role: newRole }
        })

        revalidatePath(`/communities/${targetMember.community.name}/members`)
        return { success: true, message: 'Member role updated successfully' }
    } catch (error) {
        console.error('Error updating member role:', error)
        return { success: false, error: 'Failed to update member role' }
    }
}

// Handle join request (approve/reject)
export async function handleJoinRequest(requestId: string, action: 'accept' | 'reject') {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get the join request
        const joinRequest = await prisma.joinRequest.findUnique({
            where: { id: requestId },
            include: {
                community: true,
                user: true
            }
        })

        if (!joinRequest) {
            return { success: false, error: 'Join request not found' }
        }

        // Check if current user has permission to handle requests
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId: joinRequest.communityId
                }
            }
        })

        if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')) {
            return { success: false, error: 'Not authorized to handle join requests' }
        }

        if (action === 'accept') {
            // Accept the request and create membership
            await prisma.$transaction(async (tx) => {
                await tx.joinRequest.update({
                    where: { id: requestId },
                    data: { status: 'ACCEPTED' }
                })

                await tx.communityMember.create({
                    data: {
                        userId: joinRequest.userId,
                        communityId: joinRequest.communityId,
                        role: 'USER'
                    }
                })
            })
        } else {
            // Reject the request
            await prisma.joinRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED' }
            })
        }

        revalidatePath(`/communities/${joinRequest.community.name}/requests`)
        return { success: true, message: `Join request ${action}ed successfully` }
    } catch (error) {
        console.error('Error handling join request:', error)
        return { success: false, error: 'Failed to handle join request' }
    }
}

// Invite user to community
export async function inviteUser(communityId: string, username: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check if current user has permission to invite
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')) {
            return { success: false, error: 'Not authorized to invite users' }
        }

        // Find user by username
        const inviteeUser = await prisma.user.findUnique({
            where: { username }
        })

        if (!inviteeUser) {
            return { success: false, error: 'User not found' }
        }

        // Check if user is already a member
        const existingMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: inviteeUser.id,
                    communityId
                }
            }
        })

        if (existingMembership) {
            return { success: false, error: 'User is already a member' }
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.communityInvitation.findUnique({
            where: {
                communityId_inviteeId: {
                    communityId,
                    inviteeId: inviteeUser.id
                }
            }
        })

        if (existingInvitation && existingInvitation.status === 'PENDING') {
            return { success: false, error: 'Invitation already sent' }
        }

        // Create or update invitation
        if (existingInvitation) {
            await prisma.communityInvitation.update({
                where: { id: existingInvitation.id },
                data: {
                    inviterId: session.user.id,
                    status: 'PENDING'
                }
            })
        } else {
            await prisma.communityInvitation.create({
                data: {
                    communityId,
                    inviterId: session.user.id,
                    inviteeId: inviteeUser.id,
                    status: 'PENDING'
                }
            })
        }

        return { success: true, message: 'Invitation sent successfully' }
    } catch (error) {
        console.error('Error inviting user:', error)
        return { success: false, error: 'Failed to invite user' }
    }
}

// Handle invitation (accept/reject)
export async function handleInvitation(invitationId: string, action: 'accept' | 'reject') {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get the invitation
        const invitation = await prisma.communityInvitation.findUnique({
            where: { id: invitationId },
            include: {
                community: true,
                inviter: true
            }
        })

        if (!invitation) {
            return { success: false, error: 'Invitation not found' }
        }

        if (invitation.inviteeId !== session.user.id) {
            return { success: false, error: 'Not authorized to handle this invitation' }
        }

        if (action === 'accept') {
            // Accept the invitation and create membership
            await prisma.$transaction(async (tx) => {
                await tx.communityInvitation.update({
                    where: { id: invitationId },
                    data: { status: 'ACCEPTED' }
                })

                await tx.communityMember.create({
                    data: {
                        userId: session.user.id,
                        communityId: invitation.communityId,
                        role: 'USER'
                    }
                })
            })

            revalidatePath(`/communities/${invitation.community.name}`)
        } else {
            // Reject the invitation
            await prisma.communityInvitation.update({
                where: { id: invitationId },
                data: { status: 'REJECTED' }
            })
        }

        return { success: true, message: `Invitation ${action}ed successfully` }
    } catch (error) {
        console.error('Error handling invitation:', error)
        return { success: false, error: 'Failed to handle invitation' }
    }
}

// Update community details
export async function updateCommunity(communityId: string, formData: FormData) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check if user is admin
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            },
            include: { community: true }
        })

        if (!membership || membership.role !== 'ADMIN') {
            return { success: false, error: 'Not authorized to update this community' }
        }

        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const visibility = formData.get('visibility') as 'PUBLIC' | 'PRIVATE'
        const imageFile = formData.get('image') as File
        const coverImageFile = formData.get('coverImage') as File

        let updateData: any = {}

        if (name && name !== membership.community.name) {
            // Check if new name is available
            const existingCommunity = await prisma.community.findUnique({
                where: { name }
            })

            if (existingCommunity) {
                return { success: false, error: 'Community name already exists' }
            }

            updateData.name = name
        }

        if (description !== undefined) {
            updateData.description = description || null
        }

        if (visibility) {
            updateData.visibility = visibility
        }

        // Handle image uploads
        if (imageFile && imageFile.size > 0) {
            updateData.image = await uploadFileToBlobStorage(imageFile, `communities/${session.user.id}`)
        }

        if (coverImageFile && coverImageFile.size > 0) {
            updateData.coverImage = await uploadFileToBlobStorage(coverImageFile, `communities/${session.user.id}`)
        }

        const updatedCommunity = await prisma.community.update({
            where: { id: communityId },
            data: updateData
        })

        revalidatePath(`/communities/${updatedCommunity.name}`)
        return { success: true, community: updatedCommunity }
    } catch (error) {
        console.error('Error updating community:', error)
        return { success: false, error: 'Failed to update community' }
    }
}

// Remove member from community
export async function removeMember(communityId: string, memberId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check if current user has permission
        const currentUserMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!currentUserMembership || (currentUserMembership.role !== 'ADMIN' && currentUserMembership.role !== 'MODERATOR')) {
            return { success: false, error: 'Not authorized to remove members' }
        }

        // Get target member
        const targetMember = await prisma.communityMember.findUnique({
            where: { id: memberId },
            include: { community: true }
        })

        if (!targetMember || targetMember.communityId !== communityId) {
            return { success: false, error: 'Member not found' }
        }

        // Check permissions for removal
        if (currentUserMembership.role === 'MODERATOR' && targetMember.role !== 'USER') {
            return { success: false, error: 'Moderators can only remove regular users' }
        }

        if (targetMember.role === 'ADMIN') {
            const adminCount = await prisma.communityMember.count({
                where: {
                    communityId,
                    role: 'ADMIN'
                }
            })

            if (adminCount === 1) {
                return { success: false, error: 'Cannot remove the only admin' }
            }
        }

        // Remove member
        await prisma.communityMember.delete({
            where: { id: memberId }
        })

        revalidatePath(`/communities/${targetMember.community.name}/members`)
        return { success: true, message: 'Member removed successfully' }
    } catch (error) {
        console.error('Error removing member:', error)
        return { success: false, error: 'Failed to remove member' }
    }
}

// Cancel join request
export async function cancelJoinRequest(communityId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated' }
        }

        // Find the join request
        const joinRequest = await prisma.joinRequest.findFirst({
            where: {
                communityId,
                userId: session.user.id,
                status: 'PENDING'
            }
        })

        if (!joinRequest) {
            return { success: false, error: 'No pending join request found' }
        }

        // Delete the join request
        await prisma.joinRequest.delete({
            where: { id: joinRequest.id }
        })

        revalidatePath(`/communities`)
        return { success: true, message: 'Join request cancelled successfully' }
    } catch (error) {
        console.error('Error cancelling join request:', error)
        return { success: false, error: 'Failed to cancel join request' }
    }
}

// Search communities with advanced filtering
export async function searchCommunities(params: {
    query?: string
    sort?: 'relevant' | 'popular' | 'recent' | 'name'
    visibility?: 'PUBLIC' | 'PRIVATE'
    limit?: number
    offset?: number
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated', communities: [], totalCount: 0 }
        }

        const { query = '', sort = 'relevant', visibility, limit = 20, offset = 0 } = params

        let whereClause: any = {
            visibility: 'PUBLIC' // Default to public communities for search
        }

        // Add visibility filter if specified
        if (visibility) {
            whereClause.visibility = visibility
        }

        // Add search query filter
        if (query.trim()) {
            whereClause.OR = [
                { name: { contains: query.trim(), mode: 'insensitive' } },
                { description: { contains: query.trim(), mode: 'insensitive' } }
            ]
        }

        // Define sorting options
        let orderBy: any = { createdAt: 'desc' } // default

        switch (sort) {
            case 'popular':
                orderBy = [
                    { members: { _count: 'desc' } },
                    { posts: { _count: 'desc' } },
                    { createdAt: 'desc' }
                ]
                break
            case 'recent':
                orderBy = { createdAt: 'desc' }
                break
            case 'name':
                orderBy = { name: 'asc' }
                break
            case 'relevant':
            default:
                // For relevant search, prioritize by name match first
                if (query.trim()) {
                    orderBy = [
                        { name: 'asc' },
                        { createdAt: 'desc' }
                    ]
                } else {
                    orderBy = { createdAt: 'desc' }
                }
                break
        }

        const [communities, totalCount] = await Promise.all([
            prisma.community.findMany({
                where: whereClause,
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    _count: {
                        select: {
                            members: true,
                            posts: true
                        }
                    }
                },
                orderBy,
                take: limit,
                skip: offset
            }),
            prisma.community.count({ where: whereClause })
        ])

        // Add current user's membership status to each community
        const communitiesWithMembership = await Promise.all(
            communities.map(async (community) => {
                const currentUserMembership = await prisma.communityMember.findUnique({
                    where: {
                        userId_communityId: {
                            userId: session.user.id,
                            communityId: community.id
                        }
                    },
                    select: {
                        id: true,
                        role: true,
                        joinedAt: true
                    }
                })

                return {
                    ...community,
                    currentUserMembership: currentUserMembership || null
                }
            })
        )

        return {
            success: true,
            communities: communitiesWithMembership,
            totalCount,
            hasMore: offset + limit < totalCount
        }
    } catch (error) {
        console.error('Error searching communities:', error)
        return { success: false, error: 'Failed to search communities', communities: [], totalCount: 0 }
    }
}

// Discover communities (trending, suggested, new, popular)
export async function discoverCommunities(type: 'trending' | 'suggested' | 'new' | 'popular', limit: number = 10) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return { success: false, error: 'Not authenticated', communities: [] }
        }

        const userId = session.user.id
        const baseWhere = {
            visibility: 'PUBLIC' as const,
            // Exclude communities the user is already a member of
            members: {
                none: {
                    userId: userId
                }
            }
        }

        let communities: any[] = []

        switch (type) {
            case 'trending':
                // Communities with recent activity (posts in the last 7 days)
                const sevenDaysAgo = new Date()
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

                communities = await prisma.community.findMany({
                    where: {
                        ...baseWhere,
                        posts: {
                            some: {
                                createdAt: {
                                    gte: sevenDaysAgo
                                }
                            }
                        }
                    },
                    include: {
                        creator: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        },
                        _count: {
                            select: {
                                members: true,
                                posts: {
                                    where: {
                                        createdAt: {
                                            gte: sevenDaysAgo
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { posts: { _count: 'desc' } },
                        { members: { _count: 'desc' } }
                    ],
                    take: limit
                })
                break

            case 'suggested':
                // Suggest based on user's follows and interests
                communities = await prisma.community.findMany({
                    where: {
                        ...baseWhere,
                        OR: [
                            // Communities created by users the current user follows
                            {
                                creator: {
                                    followers: {
                                        some: {
                                            followerId: userId
                                        }
                                    }
                                }
                            },
                            // Communities with members the user follows
                            {
                                members: {
                                    some: {
                                        user: {
                                            followers: {
                                                some: {
                                                    followerId: userId
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    include: {
                        creator: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        },
                        _count: {
                            select: {
                                members: true,
                                posts: true
                            }
                        }
                    },
                    orderBy: [
                        { members: { _count: 'desc' } },
                        { createdAt: 'desc' }
                    ],
                    take: limit
                })

                // If no suggested communities, fall back to popular
                if (communities.length < limit) {
                    const additionalCommunities = await prisma.community.findMany({
                        where: {
                            ...baseWhere,
                            id: {
                                notIn: communities.map(c => c.id)
                            }
                        },
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true
                                }
                            },
                            _count: {
                                select: {
                                    members: true,
                                    posts: true
                                }
                            }
                        },
                        orderBy: [
                            { members: { _count: 'desc' } },
                            { posts: { _count: 'desc' } }
                        ],
                        take: limit - communities.length
                    })
                    communities.push(...additionalCommunities)
                }
                break

            case 'new':
                // Recently created communities
                communities = await prisma.community.findMany({
                    where: baseWhere,
                    include: {
                        creator: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        },
                        _count: {
                            select: {
                                members: true,
                                posts: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                break

            case 'popular':
                // Most popular communities by member count
                communities = await prisma.community.findMany({
                    where: baseWhere,
                    include: {
                        creator: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        },
                        _count: {
                            select: {
                                members: true,
                                posts: true
                            }
                        }
                    },
                    orderBy: [
                        { members: { _count: 'desc' } },
                        { posts: { _count: 'desc' } }
                    ],
                    take: limit
                })
                break
        }

        return {
            success: true,
            communities,
            type
        }
    } catch (error) {
        console.error('Error discovering communities:', error)
        return { success: false, error: 'Failed to discover communities', communities: [] }
    }
}
