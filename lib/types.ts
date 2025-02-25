import type { Post as PrismaPost } from '@prisma/client'
import { Post } from '@/components/post/PostCard'
export type { Post }

export type Visibility = 'public' | 'private' | 'followers'

// Base post interface
export interface BasePost extends Omit<PrismaPost, 'createdAt'> {
    mediaAttachments: string[];
    createdAt: string;
}

export interface User {
    id: string;
    name: string | null;
    image: string | null;
}

export interface Reaction {
    id: string;
    type: string;
    userId: string;
    postId: string;
    createdAt: string;
    commentId: string | null;
}

// Extended post interface for feed and detail views
export interface ExtendedPost {
    id: string;
    content: string;
    authorId: string;
    createdAt: string;
    mediaAttachments: string[];
    author: User;
    reactions: Reaction[];
    parentId: string | null;
    parent: {
        id: string;
        authorId: string;
        author: User;
        createdAt: string;
    } | null;
    replies: ExtendedPost[];
    _count: {
        replies: number;
    };
}

export interface MediaFile {
    id: string;
    url: string;
    type: string;
    postId: string;
    userId: string;
    createdAt: Date;
}