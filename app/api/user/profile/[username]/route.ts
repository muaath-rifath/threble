import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { username } = await params

    if (!username) {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 })
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { 
        username: username.toLowerCase() 
      },
      include: {
        profile: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Check if current user is following this user
    let isFollowing = false
    if (session?.user?.id && session.user.id !== user.id) {
      const followRecord = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id
          }
        }
      })
      isFollowing = !!followRecord
    }

    // Format the response data
    const responseData = {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        coverImage: user.coverImage,
        createdAt: user.createdAt,
        profile: user.profile ? {
          bio: user.profile.bio,
          location: user.profile.location,
          website: user.profile.website,
          birthDate: user.profile.birthDate?.toISOString(),
        } : null,
        _count: user._count
      },
      isFollowing
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch profile' 
    }, { status: 500 })
  }
}
