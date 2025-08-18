import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function transformPost(post: any): any {
    return {
        ...post,
        createdAt: post.createdAt.toISOString(),
        mediaAttachments: post.mediaAttachments || [],
        reactions: post.reactions?.map((r: any) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        })) || [],
        parent: post.parent ? {
            ...post.parent,
            createdAt: post.parent.createdAt.toISOString(),
            author: post.parent.author,
            reactions: post.parent.reactions?.map((r: any) => ({
                ...r,
                createdAt: r.createdAt.toISOString()
            })) || [],
            mediaAttachments: post.parent.mediaAttachments || [],
            _count: post.parent._count || { replies: 0 }
        } : null,
        replies: post.replies?.map((reply: any) => transformPost(reply)) || [],
        _count: post._count || { replies: 0 }
    };
}
