import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'


export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

  const formData = await req.formData();
  const name = formData.get('name') as string;
  const bio = formData.get('bio') as string;
  const coverImage = formData.get('coverImage') as string;
  const email = formData.get('email') as string;

  let imageUrl = null;
  const imageFile = formData.get('image') as File | null;

  try {
        if (imageFile) {
            imageUrl = await uploadFileToBlobStorage(imageFile);
        }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        image: imageUrl || undefined,
        coverImage,
        profile: {
          upsert: {
            create: { bio },
            update: { bio },
          },
        },
      },
      include: {
        profile: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Combine user and profile data
    const profileData = {
      ...user,
        bio: user.profile?.bio,
      coverImage: user.coverImage,
        image: user.image,
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}