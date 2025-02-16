// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getStorageClients } from '@/lib/azure-storage'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const storageClients = getStorageClients()
    if (!storageClients) {
      return NextResponse.json({ error: 'Storage not initialized' }, { status: 503 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const blobName = `${session.user.id}/${type}/${uuidv4()}-${file.name}`
    const blockBlobClient = storageClients.containerClient.getBlockBlobClient(blobName)

    const arrayBuffer = await file.arrayBuffer()
    await blockBlobClient.uploadData(arrayBuffer, {
      blobHTTPHeaders: { blobContentType: file.type }
    })

    return NextResponse.json({ url: blockBlobClient.url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}