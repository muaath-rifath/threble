import { type Post } from '@prisma/client'

// Base Post type with media attachments
export interface BasePost extends Omit<Post, 'createdAt'> {
    mediaAttachments: string[];
    createdAt: string;
}

interface PostParent {
    id: string;
    authorId: string;
    createdAt: string;
    author: {
        name: string | null;
        image: string | null;
    };
}

interface PostReaction {
    id: string;
    type: string;
    userId: string;
    postId: string;
    createdAt: string;
    commentId: string | null;
}

// Extended Post type for feed and detail views
export interface ExtendedPost extends BasePost {
    author: {
        name: string | null;
        image: string | null;
    };
    reactions: PostReaction[];
    _count: {
        replies: number;
    };
    parentId: string | null;
    parent: PostParent | null;
    replies: ExtendedPost[];
}

export interface MediaFile {
    id: string;
    url: string;
    type: string;
    postId: string;
    userId: string;
    createdAt: Date;
}