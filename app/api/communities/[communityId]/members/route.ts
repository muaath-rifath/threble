import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;
    const { searchParams } = new URL(request.url);
    
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    
    // Build where clause
    const whereClause: any = { 
      communityId,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } }
          ]
        }
      })
    };

    // Add cursor condition if provided
    if (cursor) {
      whereClause.id = { lt: cursor };
    }
    
    const members = await prisma.communityMember.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: limit + 1
    });

    // Check if there are more results
    const hasMore = members.length > limit;
    const data = hasMore ? members.slice(0, -1) : members;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return NextResponse.json({
      data,
      nextCursor,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching community members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community members' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId } = await params;
    
    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId }
    });

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Create membership or join request based on community visibility
    if (community.visibility === 'PUBLIC') {
      const member = await prisma.communityMember.create({
        data: {
          userId: session.user.id,
          communityId,
          role: 'USER'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          }
        }
      });

      return NextResponse.json(member, { status: 201 });
    } else {
      // Create join request for private communities
      const existingRequest = await prisma.joinRequest.findUnique({
        where: {
          communityId_userId: {
            userId: session.user.id,
            communityId
          }
        }
      });

      if (existingRequest) {
        return NextResponse.json({ error: 'Join request already pending' }, { status: 400 });
      }

      const joinRequest = await prisma.joinRequest.create({
        data: {
          userId: session.user.id,
          communityId
        }
      });

      return NextResponse.json({ joinRequest }, { status: 201 });
    }
  } catch (error) {
    console.error('Error joining community:', error);
    return NextResponse.json(
      { error: 'Failed to join community' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId } = await params;
    
    // Find the membership
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 404 });
    }

    // Don't allow creator to leave (they should transfer ownership first)
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true }
    });

    if (community?.creatorId === session.user.id) {
      return NextResponse.json(
        { error: 'Creator cannot leave. Transfer ownership first.' },
        { status: 400 }
      );
    }

    // Remove membership
    await prisma.communityMember.delete({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving community:', error);
    return NextResponse.json(
      { error: 'Failed to leave community' },
      { status: 500 }
    );
  }
}
