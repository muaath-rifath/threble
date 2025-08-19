import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'
import { profileUpdateSchema } from '@/lib/validations/username'


export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

  const formData = await req.formData();
  const name = formData.get('name') as string;
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const bio = formData.get('bio') as string;
  const location = formData.get('location') as string;
  const website = formData.get('website') as string;
  const birthDate = formData.get('birthDate') as string;

  // Check if this is an image-only update
  const isImageOnlyUpdate = !name && !username && !email && !bio && !location && !website && !birthDate;

  // Only validate if it's not an image-only update
  if (!isImageOnlyUpdate) {
    // Validate the form data
    const validation = profileUpdateSchema.safeParse({
      name,
      username,
      email,
      bio: bio || undefined,
      location: location || undefined,
      website: website || undefined,
      birthDate: birthDate || undefined,
    })

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error.issues[0].message
      }, { status: 400 })
    }

    // If username is being changed, check if it's available
    if (username) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true }
      })

      if (currentUser?.username !== username.toLowerCase()) {
        const existingUser = await prisma.user.findUnique({
          where: { username: username.toLowerCase() },
          select: { id: true }
        })

        if (existingUser) {
          return NextResponse.json({ 
            error: 'Username is already taken' 
          }, { status: 409 })
        }
      }
    }
  }

  let imageUrl = null;
  let coverImageUrl = null;
  const imageFile = formData.get('image') as File | null;
  const coverImageFile = formData.get('coverImage') as File | null;

  console.log('Profile update request:', {
    hasImageFile: !!imageFile,
    hasCoverImageFile: !!coverImageFile,
    imageFileName: imageFile?.name,
    coverImageFileName: coverImageFile?.name,
    userId: session.user.id
  });

  try {
        if (imageFile) {
            console.log('Uploading profile image...');
            imageUrl = await uploadFileToBlobStorage(imageFile, session.user.id, 'profile');
            console.log('Profile image uploaded to:', imageUrl);
        }

        if (coverImageFile) {
            console.log('Uploading cover image...');
            coverImageUrl = await uploadFileToBlobStorage(coverImageFile, session.user.id, 'cover');
            console.log('Cover image uploaded to:', coverImageUrl);
        }

    console.log('Updating user in database with:', {
      imageUrl,
      coverImageUrl,
      name,
      username,
      isImageOnlyUpdate
    });

    // Handle image-only updates vs full profile updates
    if (isImageOnlyUpdate) {
      // Only update images
      const updateData: any = {};
      if (imageUrl) updateData.image = imageUrl;
      if (coverImageUrl) updateData.coverImage = coverImageUrl;

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        include: {
          profile: true,
        },
      });

      // Also update the UserProfile coverImage if we have a cover image
      if (coverImageUrl) {
        await prisma.userProfile.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            coverImage: coverImageUrl
          },
          update: {
            coverImage: coverImageUrl
          }
        });

        // Fetch the updated user with profile
        const finalUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          include: { profile: true }
        });

        console.log('Image-only update completed:', {
          userId: finalUser?.id,
          userImage: finalUser?.image,
          userCoverImage: finalUser?.coverImage,
          profileCoverImage: finalUser?.profile?.coverImage
        });

        return NextResponse.json(finalUser);
      }

      console.log('Image-only update completed:', {
        userId: updatedUser.id,
        userImage: updatedUser.image,
        userCoverImage: updatedUser.coverImage,
        profileCoverImage: updatedUser.profile?.coverImage
      });

      return NextResponse.json(updatedUser);
    } else {
      // Full profile update
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name,
          username: username ? username.toLowerCase() : undefined,
          image: imageUrl || undefined,
          coverImage: coverImageUrl || undefined,
          profile: {
            upsert: {
              create: { 
                bio: bio || null,
                location: location || null,
                website: website || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                coverImage: coverImageUrl || null
              },
              update: { 
                bio: bio || null,
                location: location || null,
                website: website || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                ...(coverImageUrl && { coverImage: coverImageUrl })
              },
            },
          },
        },
        include: {
          profile: true,
        },
      });

      console.log('Full profile update completed:', {
        userId: updatedUser.id,
        userImage: updatedUser.image,
        userCoverImage: updatedUser.coverImage,
        profileCoverImage: updatedUser.profile?.coverImage
      });

      return NextResponse.json(updatedUser);
    }
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
      profile: {
        ...user.profile,
        birthDate: user.profile?.birthDate?.toISOString(),
      }
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}