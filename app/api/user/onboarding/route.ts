import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const formData = await req.formData()
        const userId = session.user.id
        const name = formData.get('name') as string
        const bio = formData.get('bio') as string
        let imageUrl: string | null = null

        const imageFile = formData.get('image') as File
        if (imageFile) {
            imageUrl = await uploadFileToBlobStorage(imageFile, userId)
        }

        if (!userId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                image: imageUrl,
                profile: {
                    create: {
                        bio
                    }
                }
            },
            include: {
                profile: true
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error('Error in onboarding:', error)
        return NextResponse.json(
            { error: 'Failed to complete onboarding' },
            { status: 500 }
        )
    }
}