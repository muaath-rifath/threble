import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getStorageClients } from '@/lib/azure-storage';
import { BlobSASPermissions, SASProtocol, generateBlobSASQueryParameters } from '@azure/storage-blob';
import prisma from '@/lib/prisma';

// Check access permission for the requested blob
async function checkAccess(path: string[], session: any) {
    // Always allow access to profile pictures
    if (path[2] === 'profile') {
        return true;
    }

    // Extract post ID from the URL path (users/[userId]/posts/[postId]/[filename])
    const postId = path[3]; // Index 3 because path is split: ['users', userId, 'posts', postId, filename]
    
    if (!postId) {
        // For temp uploads, only allow access to the user's own files
        const userId = path[1]; // Index 1 is userId in the path
        return session?.user?.id === userId;
    }

    // If no session, only allow access to public posts
    if (!session?.user?.id) {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { visibility: true },
        });
        return post?.visibility === 'public';
    }

    // Check if the user has access to this post
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
            visibility: true,
            authorId: true,
            communityId: true,
        }
    });

    if (!post) return false;

    // Allow if:
    // 1. Post is public
    // 2. User is the author
    // 3. User is a member of the community (if post is in a community)
    return (
        post.visibility === 'public' ||
        post.authorId === session.user.id ||
        (post.communityId && await prisma.communityMember.findFirst({
            where: {
                communityId: post.communityId,
                userId: session.user.id
            }
        }))
    );
}

export async function GET(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const session = await getServerSession(authOptions);
        const storageClients = getStorageClients();
        
        if (!storageClients) {
            return new Response('Storage configuration not available', { status: 503 });
        }

        const { containerClient, sharedKeyCredential, containerName } = storageClients;
        const blobPath = params.path.join('/');
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

        try {
            // Check if blob exists
            const exists = await blockBlobClient.exists();
            if (!exists) {
                return new Response('Not Found', { status: 404 });
            }

            // Check access permissions
            const hasAccess = await checkAccess(params.path, session);
            if (!hasAccess) {
                return new Response('Forbidden', { status: 403 });
            }

            // Get blob properties for content type
            const properties = await blockBlobClient.getProperties();
            
            // Generate SAS token with short expiry
            const startsOn = new Date();
            const expiresOn = new Date(startsOn);
            expiresOn.setMinutes(startsOn.getMinutes() + 5); // 5 minutes expiry

            const sasToken = generateBlobSASQueryParameters({
                containerName,
                blobName: blobPath,
                permissions: BlobSASPermissions.parse("r"), // Read-only permission
                startsOn,
                expiresOn,
                protocol: SASProtocol.Https
            }, sharedKeyCredential).toString();

            // Create URL with SAS token
            const blobUrl = `${blockBlobClient.url}?${sasToken}`;

            // Set cache control based on content type
            const cacheControl = params.path[2] === 'profile' 
                ? 'public, max-age=3600' // Cache profile pictures for 1 hour
                : 'private, no-cache';    // No cache for other media

            // Return redirect response with proper headers
            return new Response(null, {
                status: 302,
                headers: new Headers({
                    'Location': blobUrl,
                    'Content-Type': properties.contentType || 'application/octet-stream',
                    'Cache-Control': cacheControl,
                    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Expose-Headers': '*'
                })
            });
        } catch (error) {
            console.error('Error accessing blob:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    } catch (error) {
        console.error('Error serving media:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}