import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function transformPost(post: any) {
    return {
        ...post,
        createdAt: post.createdAt.toISOString(),
        mediaAttachments: post.mediaAttachments || [],
        reactions: post.reactions.map((r: any) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        })),
        parent: post.parent ? {
            ...post.parent,
            createdAt: post.parent.createdAt.toISOString(),
            author: post.parent.author
        } : null,
        replies: post.replies?.map((reply: any) => ({
            ...reply,
            createdAt: reply.createdAt.toISOString(),
            reactions: reply.reactions.map((r: any) => ({
                ...r,
                createdAt: r.createdAt.toISOString()
            }))
        })) || [],
        _count: post._count || { replies: 0 }
    };
}
