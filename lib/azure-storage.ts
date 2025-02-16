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
        const extension = file.name.split('.').pop() || '';
        const fileName = `${randomUUID()}.${extension}`;
        const blobPath = `users/${userId}/temp/${fileName}`;
        const blockBlobClient = clients.containerClient.getBlockBlobClient(blobPath);
        
        const options = {
            blobHTTPHeaders: {
                blobContentType: file.type,
                blobCacheControl: 'private, no-cache'
            }
        };

        const arrayBuffer = await file.arrayBuffer();
        await blockBlobClient.uploadData(arrayBuffer, options);
        
        return `/api/media/${blobPath}`;
    } catch (error) {
        console.error('Error uploading to blob storage:', error);
        throw new Error('Failed to upload file');
    }
}

export async function deleteFileFromBlobStorage(url: string): Promise<void> {
    const clients = getStorageClients();
    if (!clients) throw new Error('Storage not initialized');

    try {
        const blobPath = url.replace('/api/media/', '');
        if (!blobPath) throw new Error('Invalid blob path');
        
        const blockBlobClient = clients.containerClient.getBlockBlobClient(blobPath);
        await blockBlobClient.delete();
    } catch (error) {
        console.error('Error deleting from blob storage:', error);
        throw new Error('Failed to delete file');
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