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
    username?: string | null;
    image: string | null;
}

export interface Reaction {
    id: string;
    type: string;
    userId: string;
    postId: string;
    createdAt: string;
}

// Extended post interface for feed and detail views
export interface ExtendedPost {
    id: string;
    content: string;
    authorId: string;
    communityId?: string | null;
    createdAt: string;
    updatedAt: string;
    mediaAttachments: string[];
    author: User;
    community?: {
        id: string;
        name: string;
        image?: string | null;
        visibility: 'PUBLIC' | 'PRIVATE';
    } | null;
    reactions: Reaction[];
    parentId: string | null;
    parent?: ExtendedPost;
    replies: ExtendedPost[];
    _count: {
        replies: number;
        reactions?: number;
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

// Community-related types
export interface Community {
    id: string;
    name: string;
    description?: string | null;
    image?: string | null;
    coverImage?: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
    creatorId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CommunityMember {
    id: string;
    userId: string;
    communityId: string;
    role: 'USER' | 'MODERATOR' | 'ADMIN';
    joinedAt: Date;
    user?: User;
    community?: Community;
}

export interface CommunityWithDetails extends Community {
    creator: User;
    members: CommunityMember[];
    _count: {
        members: number;
        posts: number;
    };
}

export interface JoinRequest {
    id: string;
    communityId: string;
    userId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: Date;
    updatedAt: Date;
    user: User;
    community: Community;
}

export interface CommunityInvitation {
    id: string;
    communityId: string;
    inviterId: string;
    inviteeId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: Date;
    updatedAt: Date;
    community: Community;
    inviter: User;
    invitee: User;
}