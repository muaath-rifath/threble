export interface Post {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    parentId: string | null;
    visibility: string;
    mediaAttachments: string[];
    author: {
        name: string;
        image: string | null;
    };
    reactions: {
        id: string;
        type: string;
        userId: string;
        postId: string;
    }[];
    _count: {
        replies: number;
    };
    parent: {
        id: string;
        author: {
            name: string;
            image: string | null;
        };
    } | null;
    replies: Post[];
}