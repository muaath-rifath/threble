import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ preferences: user.preferences || {} })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { preferences } = body

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 })
    }

    // Get current preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Merge with existing preferences
    const currentPreferences = (user.preferences as Record<string, any>) || {}
    const updatedPreferences = { ...currentPreferences, ...preferences }

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: updatedPreferences },
      select: { preferences: true }
    })

    return NextResponse.json({ preferences: updatedUser.preferences })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { theme } = body

    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 })
    }

    // Get current preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update theme preference
    const currentPreferences = (user.preferences as Record<string, any>) || {}
    const updatedPreferences = { ...currentPreferences, theme }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: updatedPreferences },
      select: { preferences: true }
    })

    return NextResponse.json({ theme, preferences: updatedUser.preferences })
  } catch (error) {
    console.error('Error updating theme preference:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
