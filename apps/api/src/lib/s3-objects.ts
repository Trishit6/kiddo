import type { Client as MinioClient } from 'minio';

export function listObjectKeys(s3: MinioClient, bucket: string, prefix: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const keys: string[] = [];
    const stream = s3.listObjectsV2(bucket, prefix, true);
    stream.on('data', (item: { name?: string }) => {
      if (item.name) keys.push(item.name);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(keys));
  });
}

export async function removePrefix(s3: MinioClient, bucket: string, prefix: string): Promise<void> {
  const keys = await listObjectKeys(s3, bucket, prefix);
  if (keys.length > 0) await s3.removeObjects(bucket, keys);
}

export async function removePrefixes(
  s3: MinioClient,
  bucket: string,
  prefixes: string[],
): Promise<void> {
  for (const prefix of prefixes) {
    await removePrefix(s3, bucket, prefix);
  }
}
