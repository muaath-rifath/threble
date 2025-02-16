import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

export async function uploadFileToBlobStorage(file: File): Promise<string> {
    try {
        const fileName = `${Date.now()}-${file.name}`;
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        
        // Set content type based on file type
        const options = {
            blobHTTPHeaders: {
                blobContentType: file.type
            }
        };

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Upload the file
        await blockBlobClient.uploadData(arrayBuffer, options);
        
        // Return the URL of the uploaded file
        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading to blob storage:', error);
        throw new Error('Failed to upload file');
    }
}

export async function deleteFileFromBlobStorage(url: string): Promise<void> {
    try {
        // Extract blob name from URL
        const blobName = url.split('/').pop();
        if (!blobName) throw new Error('Invalid blob URL');
        
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
    } catch (error) {
        console.error('Error deleting from blob storage:', error);
        throw new Error('Failed to delete file');
    }
}