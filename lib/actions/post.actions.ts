'use server'

import { revalidatePath } from 'next/cache'

export async function deletePost(postId: string) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
        })

        if (!response.ok) {
            throw new Error('Failed to delete post')
        }

        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to delete post' }
    }
}

export async function updatePost(postId: string, formData: FormData) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'PATCH',
            body: formData,
        })

        if (!response.ok) {
            throw new Error('Failed to update post')
        }

        const updatedPost = await response.json()
        return { success: true, post: updatedPost }
    } catch (error) {
        return { success: false, error: 'Failed to update post' }
    }
}

export async function createPost(formData: FormData) {
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error('Failed to create post')
        }

        const newPost = await response.json()
        return { success: true, post: newPost }
    } catch (error) {
        return { success: false, error: 'Failed to create post' }
    }
}

// Create post in a specific community
export async function createCommunityPost(communityId: string, formData: FormData) {
    try {
        // Add communityId to the form data
        formData.set('communityId', communityId)

        const response = await fetch(`/api/communities/${communityId}/posts`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to create community post')
        }

        const result = await response.json()
        
        // Revalidate community page
        revalidatePath(`/communities/${communityId}`)
        
        return { success: true, post: result.post }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create community post' }
    }
}

// Get community posts
export async function getCommunityPosts(communityId: string, cursor?: string, includeReplies = false) {
    try {
        const params = new URLSearchParams()
        if (cursor) params.set('cursor', cursor)
        if (includeReplies) params.set('includeReplies', 'true')
        
        const response = await fetch(`/api/communities/${communityId}/posts?${params.toString()}`, {
            method: 'GET',
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch community posts')
        }

        const result = await response.json()
        return { 
            success: true, 
            posts: result.posts, 
            nextCursor: result.nextCursor,
            hasNextPage: result.hasNextPage,
            community: result.community
        }
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch community posts',
            posts: [],
            nextCursor: null,
            hasNextPage: false
        }
    }
}

// Get posts with community filtering for main feed
export async function getPosts(cursor?: string, communityId?: string) {
    try {
        const params = new URLSearchParams()
        if (cursor) params.set('cursor', cursor)
        if (communityId) params.set('communityId', communityId)
        
        const response = await fetch(`/api/posts?${params.toString()}`, {
            method: 'GET',
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch posts')
        }

        const result = await response.json()
        return { 
            success: true, 
            posts: result.posts, 
            nextCursor: result.nextCursor,
            hasNextPage: result.hasNextPage
        }
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch posts',
            posts: [],
            nextCursor: null,
            hasNextPage: false
        }
    }
}

// Delete post with community moderation support
export async function deletePostWithModeration(postId: string) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to delete post')
        }

        return { success: true }
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to delete post' 
        }
    }
}

// Check if user can moderate posts in a community
export async function checkModerationPermission(communityId: string) {
    try {
        const response = await fetch(`/api/communities/${communityId}/members`, {
            method: 'GET',
        })

        if (!response.ok) {
            return { canModerate: false }
        }

        const result = await response.json()
        const currentUserMembership = result.currentUserMembership

        if (!currentUserMembership) {
            return { canModerate: false }
        }

        return { 
            canModerate: currentUserMembership.role === 'ADMIN' || currentUserMembership.role === 'MODERATOR'
        }
    } catch (error) {
        return { canModerate: false }
    }
}