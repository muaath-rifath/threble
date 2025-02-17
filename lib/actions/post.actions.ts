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