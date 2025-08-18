import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    
    if (!session) {
        return NextResponse.json({ message: 'No session to clear' }, { status: 200 })
    }

    // Clear the session by redirecting to sign out
    return NextResponse.json({ 
        message: 'Please sign out manually',
        redirectTo: '/api/auth/signout'
    }, { status: 200 })
}
