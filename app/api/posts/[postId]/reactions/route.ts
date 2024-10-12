import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { type } = await req.json();
  const { postId } = params;

  try {
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
      update: { type },
      create: {
        type,
        userId: session.user.id,
        postId: postId,
      },
    });

    return NextResponse.json(reaction);
  } catch (error) {
    console.error('Error creating/updating reaction:', error);
    return NextResponse.json({ error: 'Failed to create/update reaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { postId } = params;

  try {
    await prisma.reaction.delete({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
    });

    return NextResponse.json({ message: 'Reaction deleted successfully' });
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
