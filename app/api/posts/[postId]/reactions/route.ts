import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get all reactions for the post with user details
    const reactions = await prisma.reaction.findMany({
      where: { postId: params.postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get reaction counts by type
    const reactionCounts = await prisma.reaction.groupBy({
      by: ['type'],
      where: { postId: params.postId },
      _count: true
    });

    return NextResponse.json({
      reactions,
      counts: reactionCounts.reduce((acc, curr) => ({
        ...acc,
        [curr.type]: curr._count
      }), {})
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;

    if (!type) {
      return NextResponse.json({ error: 'Reaction type is required' }, { status: 400 });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        userId: session.user.id,
        postId: params.postId,
        type
      }
    });

    if (existingReaction) {
      return NextResponse.json({ error: 'You have already reacted to this post' }, { status: 409 });
    }

    // Create the reaction and return with user details
    const reaction = await prisma.reaction.create({
      data: {
        type,
        postId: params.postId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Get updated reaction counts
    const reactionCounts = await prisma.reaction.groupBy({
      by: ['type'],
      where: { postId: params.postId },
      _count: true
    });

    return NextResponse.json({
      reaction,
      counts: reactionCounts.reduce((acc, curr) => ({
        ...acc,
        [curr.type]: curr._count
      }), {})
    });
  } catch (error) {
    console.error('Error creating reaction:', error);
    return NextResponse.json({ error: 'Failed to create reaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'Reaction type is required' }, { status: 400 });
    }

    // Delete the reaction
    await prisma.reaction.deleteMany({
      where: {
        userId: session.user.id,
        postId: params.postId,
        type
      }
    });

    // Get updated reaction counts
    const reactionCounts = await prisma.reaction.groupBy({
      by: ['type'],
      where: { postId: params.postId },
      _count: true
    });

    return NextResponse.json({
      success: true,
      counts: reactionCounts.reduce((acc, curr) => ({
        ...acc,
        [curr.type]: curr._count
      }), {})
    });
  } catch (error) {
    console.error('Error deleting reaction:', error);
    return NextResponse.json({ error: 'Failed to delete reaction' }, { status: 500 });
  }
}
