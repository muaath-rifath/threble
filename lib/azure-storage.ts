import { BlobServiceClient, StorageSharedKeyCredential, BlockBlobClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!connectionString) {
  throw new Error('Azure Storage connection string is not defined in the environment variables.');
}

if (!containerName) {
     throw new Error('Azure Storage container name is not defined in the environment variables.');
}

const getBlobServiceClient = () => {
     return BlobServiceClient.fromConnectionString(connectionString);
}

export const uploadFileToBlobStorage = async (file: File): Promise<string> => {
  const blobServiceClient = getBlobServiceClient();

  const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobName = `${Date.now()}-${file.name}`

    const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName)

    try {
         const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await blockBlobClient.upload(buffer, buffer.length, {
                blobHTTPHeaders: { blobContentType: file.type },
            });
        
         return  blockBlobClient.url;

    } catch (error) {
         console.error('Error uploading file to Azure Blob Storage:', error)
        throw new Error('Failed to upload file to Azure Blob Storage');
    }
};