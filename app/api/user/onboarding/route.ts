import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'
import prisma from '@/lib/prisma'
import { onboardingSchema } from '@/lib/validations/username'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        console.log('Session in onboarding:', session);

        if (!session || !session.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 })
        }

        const formData = await req.formData()
        console.log('Form data received:', {
            fields: Array.from(formData.keys()),
            hasImage: formData.has('image')
        });

        // Handle profile image upload first
        let imageUrl: string | null = null
        const imageFile = formData.get('image') as File | null
        
        if (imageFile && imageFile instanceof File && imageFile.size > 0) {
            try {
                console.log('Uploading image:', {
                    size: imageFile.size,
                    type: imageFile.type,
                    name: imageFile.name
                });
                imageUrl = await uploadFileToBlobStorage(imageFile, session.user.id, 'profile')
                console.log('Image uploaded successfully:', imageUrl)
            } catch (error) {
                console.error('Image upload error:', error)
                return NextResponse.json({ 
                    success: false,
                    error: 'Failed to upload image',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }, { status: 500 })
            }
        }

        const username = formData.get('username') as string
        const bio = formData.get('bio') as string
        const location = formData.get('location') as string
        const website = formData.get('website') as string
        const birthDate = formData.get('birthDate') as string

        // Validate the form data
        const validation = onboardingSchema.safeParse({
            username,
            bio: bio || undefined,
            location: location || undefined,
            website: website || undefined,
            birthDate
        })

        if (!validation.success) {
            return NextResponse.json({ 
                success: false,
                error: validation.error.issues[0].message
            }, { status: 400 })
        }

        if (!username) {
            return NextResponse.json({ 
                success: false,
                error: 'Username is required' 
            }, { status: 400 })
        }

        if (!birthDate) {
            return NextResponse.json({ 
                success: false,
                error: 'Birth date is required' 
            }, { status: 400 })
        }

        // Check if username is available
        const existingUser = await prisma.user.findUnique({
            where: { 
                username: username.toLowerCase() 
            },
            select: { id: true }
        })

        if (existingUser) {
            return NextResponse.json({ 
                success: false,
                error: 'Username is already taken' 
            }, { status: 409 })
        }

        try {
            // Update user profile
            const updatedUser = await prisma.user.update({
                where: { 
                    id: session.user.id 
                },
                data: {
                    username: username.toLowerCase(),
                    ...(imageUrl && { image: imageUrl }),
                    profile: {
                        create: {
                            bio: bio || null,
                            location: location || null,
                            website: website || null,
                            birthDate: new Date(birthDate)
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    image: true,
                    profile: true
                }
            })

            console.log('User updated successfully:', {
                id: updatedUser.id,
                hasProfile: !!updatedUser.profile
            });

            return NextResponse.json({
                success: true,
                user: {
                    ...updatedUser,
                    hasProfile: true
                }
            })

        } catch (error) {
            console.error('Database error:', error)
            if (error instanceof Error) {
                return NextResponse.json({ 
                    success: false,
                    error: 'Failed to update profile',
                    details: error.message
                }, { status: 500 })
            }
            throw error
        }
    } catch (error) {
        console.error('Onboarding error:', error)
        return NextResponse.json({ 
            success: false,
            error: 'An unexpected error occurred',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}