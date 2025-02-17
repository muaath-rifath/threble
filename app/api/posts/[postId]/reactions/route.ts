import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { type } = await req.json();

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId: params.postId,
        userId: session.user.id,
        type,
      },
    });

    if (existingReaction) {
      // If reaction exists, remove it
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id,
        },
      });
      return NextResponse.json({ message: 'Reaction removed' });
    }

    // If reaction doesn't exist, create it
    const reaction = await prisma.reaction.create({
      data: {
        type,
        postId: params.postId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(reaction);
  } catch (error) {
    console.error('Error handling reaction:', error);
    return NextResponse.json({ error: 'Failed to handle reaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { type } = await req.json();

    await prisma.reaction.deleteMany({
      where: {
        postId: params.postId,
        userId: session.user.id,
        type,
      },
    });

    return NextResponse.json({ message: 'Reaction removed' });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { postId } = params;

  try {
    const reactions = await prisma.reaction.findMany({
      where: { postId: postId },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(reactions);
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}
