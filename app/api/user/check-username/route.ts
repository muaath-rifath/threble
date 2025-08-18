import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { usernameSchema } from '@/lib/validations/username'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ 
        success: false,
        error: 'Username is required' 
      }, { status: 400 })
    }

    // Validate username format
    const validation = usernameSchema.safeParse(username)
    if (!validation.success) {
      return NextResponse.json({ 
        success: false,
        error: validation.error.issues[0].message 
      }, { status: 400 })
    }

    // Check if username exists in database
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

    return NextResponse.json({ 
      success: true,
      message: 'Username is available' 
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'An error occurred while checking username availability' 
    }, { status: 500 })
  }
}
