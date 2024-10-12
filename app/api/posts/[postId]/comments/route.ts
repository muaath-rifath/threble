import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { postId } = req.query
  const session = await getSession({ req })

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (req.method === 'POST') {
    const { content, parentId } = req.body

    try {
      const newComment = await prisma.comment.create({
        data: {
          content,
          authorId: session.user.id,
          postId: String(postId),
          parentId: parentId || null,
        },
        include: {
          author: { select: { name: true, image: true } },
          reactions: true,
          replies: true,
        },
      })

      return res.status(201).json({ comment: newComment })
    } catch (error) {
      console.error('Error creating comment:', error)
      return res.status(500).json({ error: 'Failed to create comment' })
    }
  } else if (req.method === 'GET') {
    try {
      const comments = await prisma.comment.findMany({
        where: { postId: String(postId), parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { name: true, image: true } },
          reactions: true,
          replies: {
            include: {
              author: { select: { name: true, image: true } },
              reactions: true,
              replies: {
                include: {
                  author: { select: { name: true, image: true } },
                  reactions: true,
                },
              },
            },
          },
        },
      })

      return res.status(200).json({ comments })
    } catch (error) {
      console.error('Error fetching comments:', error)
      return res.status(500).json({ error: 'Failed to fetch comments' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
