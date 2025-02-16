import { type Post } from '@prisma/client'

// Base Post type with media attachments
export interface BasePost extends Post {
    mediaAttachments: string[];
}

// Extended Post type for feed and detail views
export interface ExtendedPost extends BasePost {
    author: {
        name: string | null;
        image: string | null;
    };
    reactions: Array<{
        userId: string;
        type: string;
    }>;
    _count: {
        replies: number;
    };
    parent?: ExtendedPost | null;
    replies?: ExtendedPost[];
}

export interface MediaFile {
    id: string;
    url: string;
    type: string;
    postId: string;
    userId: string;
    createdAt: Date;
}