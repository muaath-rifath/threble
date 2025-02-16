import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Set up CORS for the container
async function setupContainerCORS() {
    try {
        const service = blobServiceClient;
        await service.setProperties({
            cors: [{
                allowedOrigins: 'http://localhost:3000',  // Update this to match your domain
                allowedMethods: 'GET,HEAD,PUT,POST,DELETE',
                allowedHeaders: 'content-type,x-ms-*',
                exposedHeaders: 'x-ms-*',
                maxAgeInSeconds: 3600,
            }]
        });
        console.log('CORS rules have been set successfully');
    } catch (error) {
        console.error('Error setting CORS rules:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
    }
}

// Initialize CORS settings
setupContainerCORS().catch(console.error);

// Generate SAS token for container-level access
function generateContainerSasToken() {
    const startsOn = new Date();
    const expiresOn = new Date(startsOn);
    expiresOn.setHours(startsOn.getHours() + 1);

    const sasOptions = {
        containerName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https
    };

    return generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
    ).toString();
}

// Generate SAS token for specific blob
function generateBlobSasToken(blobPath: string) {
    const blobClient = containerClient.getBlobClient(blobPath);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn);
    expiresOn.setMinutes(startsOn.getMinutes() + 30); // 30 minutes expiry

    const permissions = new BlobSASPermissions();
    permissions.read = true;

    const sasOptions = {
        containerName,
        blobName: blobPath,
        permissions,
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https
    };

    const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
    ).toString();

    return sasToken;
}

export async function uploadFileToBlobStorage(file: File, userId: string): Promise<string> {
    try {
        const extension = file.name.split('.').pop() || '';
        const fileName = `${randomUUID()}.${extension}`;
        const blobPath = `users/${userId}/temp/${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        
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
    try {
        const blobPath = url.replace('/api/media/', '');
        if (!blobPath) throw new Error('Invalid blob URL');
        
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        await blockBlobClient.delete();
    } catch (error) {
        console.error('Error deleting from blob storage:', error);
        throw new Error('Failed to delete file');
    }
}

export async function moveFile(sourceUrl: string, userId: string, postId: string): Promise<string> {
    try {
        const sourcePath = sourceUrl.replace('/api/media/', '');
        const fileName = sourcePath.split('/').pop() || '';
        const newPath = `users/${userId}/posts/${postId}/${fileName}`;
        
        const sourceBlob = containerClient.getBlockBlobClient(sourcePath);
        const destinationBlob = containerClient.getBlockBlobClient(newPath);

        // Generate SAS token for source blob
        const sasToken = generateContainerSasToken();
        const sourceBlobUrlWithSas = `${sourceBlob.url}?${sasToken}`;

        // Copy the blob to new location
        const response = await destinationBlob.beginCopyFromURL(sourceBlobUrlWithSas);
        await response.pollUntilDone();

        // Delete the original blob
        await sourceBlob.delete();

        // Return the new URL through our app domain
        return `/api/media/${newPath}`;
    } catch (error) {
        console.error('Error moving file:', error);
        throw new Error('Failed to move file');
    }
}