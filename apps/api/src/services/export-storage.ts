import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    const config: any = {
      region: process.env.EXPORT_STORAGE_REGION || 'us-east-1',
    };

    // Custom endpoint for MinIO/local dev
    if (process.env.EXPORT_STORAGE_ENDPOINT) {
      config.endpoint = process.env.EXPORT_STORAGE_ENDPOINT;
      config.forcePathStyle = true;
    }

    if (process.env.EXPORT_STORAGE_ACCESS_KEY && process.env.EXPORT_STORAGE_SECRET_KEY) {
      config.credentials = {
        accessKeyId: process.env.EXPORT_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.EXPORT_STORAGE_SECRET_KEY,
      };
    }

    _s3 = new S3Client(config);
  }
  return _s3;
}

function getBucket(): string {
  return process.env.EXPORT_STORAGE_BUCKET || 'auditkit-exports';
}

export async function uploadExport(key: string, content: string, contentType: string): Promise<string> {
  const s3 = getS3Client();
  const bucket = getBucket();

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: contentType,
  }));

  return `s3://${bucket}/${key}`;
}

export async function getExportDownloadUrl(key: string): Promise<string> {
  const s3 = getS3Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  // Pre-signed URL valid for 1 hour
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export function isS3Configured(): boolean {
  return !!process.env.EXPORT_STORAGE_BUCKET;
}
