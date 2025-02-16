import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } from '@azure/storage-blob';
import prisma from '@/lib/prisma';

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!
);
const containerClient = blobServiceClient.getContainerClient(containerName);

async function checkAccess(path: string[], session: any) {
    // Extract post ID from the URL path (users/[userId]/posts/[postId]/[filename])
    const postId = path[3]; // Index 3 because path is split: ['users', userId, 'posts', postId, filename]
    
    if (!postId) {
        // For temp uploads, only allow access to the user's own files
        const userId = path[1]; // Index 1 is userId in the path
        return session.user.id === userId;
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
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const hasAccess = await checkAccess(params.path, session);
        if (!hasAccess) {
            return new Response('Forbidden', { status: 403 });
        }

        const blobPath = params.path.join('/');
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        
        try {
            // Check if blob exists
            const exists = await blockBlobClient.exists();
            if (!exists) {
                return new Response('Not Found', { status: 404 });
            }

            // Generate SAS token for this specific request
            const startsOn = new Date();
            const expiresOn = new Date(startsOn);
            expiresOn.setMinutes(startsOn.getMinutes() + 15); // 15 minutes expiry

            const permissions = new BlobSASPermissions();
            permissions.read = true;
            
            const sasToken = generateBlobSASQueryParameters({
                containerName,
                blobName: blobPath,
                permissions,
                startsOn,
                expiresOn,
                protocol: SASProtocol.Https
            }, sharedKeyCredential).toString();

            // Get blob properties for content type
            const properties = await blockBlobClient.getProperties();
            
            // Create URL with SAS token
            const blobUrl = `${blockBlobClient.url}?${sasToken}`;

            // Redirect to the signed URL
            return Response.redirect(blobUrl, 302);

        } catch (error) {
            console.error('Error accessing blob:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    } catch (error) {
        console.error('Error serving media:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}