import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, ContainerClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

interface StorageClients {
    blobServiceClient: BlobServiceClient;
    containerClient: ContainerClient;
    sharedKeyCredential: StorageSharedKeyCredential;
    containerName: string;
}

let storageClients: StorageClients | null = null;

// Get Azure Storage clients
export function getStorageClients(): StorageClients | null {
    // Return cached instance if available
    if (storageClients) {
        return storageClients;
    }

    // Skip during build or if not in a Node.js environment
    if (typeof window !== 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
        return null;
    }

    try {
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!accountName || !accountKey || !containerName || !connectionString) {
            throw new Error('Missing required Azure Storage configuration');
        }

        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Cache the instance
        storageClients = { blobServiceClient, containerClient, sharedKeyCredential, containerName };
        return storageClients;
    } catch (error) {
        console.error('Failed to initialize Azure Storage:', error);
        return null;
    }
}

// Only initialize CORS when explicitly called
export async function setupContainerCORS(): Promise<void> {
    const clients = getStorageClients();
    if (!clients) return;

    try {
        await clients.blobServiceClient.setProperties({
            cors: [{
                allowedOrigins: '*',
                allowedMethods: 'GET,HEAD,PUT,POST,DELETE',
                allowedHeaders: '*',
                exposedHeaders: '*',
                maxAgeInSeconds: 3600,
            }]
        });
        console.log('CORS rules set successfully');
    } catch (error) {
        console.error('Error setting CORS rules:', error);
    }
}

export async function uploadFileToBlobStorage(file: File, userId: string): Promise<string> {
    const clients = getStorageClients();
    if (!clients) throw new Error('Storage not initialized');

    try {
        console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, userId });

        // Generate a unique filename
        const extension = file.name.split('.').pop() || '';
        const uniqueId = Math.random().toString(36).substring(2);
        
        // Determine if this is a profile picture upload based on the file metadata or context
        const isProfilePicture = file.name.toLowerCase().includes('profile');
        const blobName = isProfilePicture 
            ? `users/${userId}/profile/${uniqueId}.${extension}`
            : `users/${userId}/${uniqueId}.${extension}`;

        const blockBlobClient = clients.containerClient.getBlockBlobClient(blobName);

        // Set blob options including content type and caching
        const options = {
            blobHTTPHeaders: {
                blobContentType: file.type,
                blobCacheControl: isProfilePicture 
                    ? 'public, max-age=3600'   // Cache profile pictures for 1 hour
                    : 'private, no-cache',     // No cache for other media
                blobContentDisposition: 'inline'
            }
        };

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        console.log('Uploading to blob storage:', { blobName, contentType: file.type });
        
        // Upload the file
        await blockBlobClient.uploadData(arrayBuffer, options);

        // Set blob metadata
        await blockBlobClient.setMetadata({
            userId,
            originalName: file.name,
            contentType: file.type,
            isProfilePicture: isProfilePicture.toString()
        });

        console.log('Upload successful:', { url: blockBlobClient.url });

        return `/api/media/${blobName}`;
    } catch (error) {
        console.error('Error uploading to blob storage:', error);
        throw new Error('Failed to upload file');
    }
}

export async function deleteFileFromBlobStorage(url: string): Promise<void> {
    const clients = getStorageClients();
    if (!clients) throw new Error('Storage not initialized');

    try {
        // Extract the blob name from the full URL
        const blobName = url.split('/').pop();
        if (!blobName) {
            throw new Error('Invalid blob URL');
        }

        // Get blob client for the specific blob
        const blobClient = clients.containerClient.getBlobClient(blobName);

        // Delete the blob
        await blobClient.delete();
    } catch (error: any) {
        // If the blob doesn't exist, we can consider this a success
        if (error.statusCode === 404) {
            console.log('Blob already deleted or does not exist:', url);
            return;
        }
        throw error;
    }
}

export async function moveFile(sourceUrl: string, userId: string, postId: string): Promise<string> {
    const clients = getStorageClients();
    if (!clients) throw new Error('Storage not initialized');

    try {
        const sourcePath = sourceUrl.replace('/api/media/', '');
        const fileName = sourcePath.split('/').pop() || '';
        const destinationPath = `users/${userId}/posts/${postId}/${fileName}`;
        
        const sourceBlob = clients.containerClient.getBlockBlobClient(sourcePath);
        const destinationBlob = clients.containerClient.getBlockBlobClient(destinationPath);

        // Generate SAS token for source blob to allow copy operation
        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setMinutes(startsOn.getMinutes() + 5); // 5 minutes is enough for copy

        const sasToken = generateBlobSASQueryParameters({
            containerName: clients.containerName,
            blobName: sourcePath,
            permissions: BlobSASPermissions.parse("r"),
            startsOn,
            expiresOn,
            protocol: SASProtocol.Https
        }, clients.sharedKeyCredential).toString();

        // Create source URL with SAS token
        const sourceBlobUrlWithSas = `${sourceBlob.url}?${sasToken}`;

        // Copy the blob to new location
        const copyResponse = await destinationBlob.beginCopyFromURL(sourceBlobUrlWithSas);
        await copyResponse.pollUntilDone();

        // Delete the original blob
        await sourceBlob.delete();

        return `/api/media/${destinationPath}`;
    } catch (error) {
        console.error('Error moving file:', error);
        throw new Error('Failed to move file');
    }
}