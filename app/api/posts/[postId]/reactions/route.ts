import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { type } = await req.json();
    const postId = params.postId;

    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId,
        userId: session.user.id,
        type,
      },
    });

    if (existingReaction) {
      return NextResponse.json({ error: 'Reaction already exists' }, { status: 400 });
    }

    const reaction = await prisma.reaction.create({
      data: {
        type,
        postId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(reaction);
  } catch (error) {
    console.error('Error creating reaction:', error);
    return NextResponse.json({ error: 'Failed to create reaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { type } = await req.json();
    const postId = params.postId;

    await prisma.reaction.deleteMany({
      where: {
        postId,
        userId: session.user.id,
        type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reaction:', error);
    return NextResponse.json({ error: 'Failed to delete reaction' }, { status: 500 });
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
