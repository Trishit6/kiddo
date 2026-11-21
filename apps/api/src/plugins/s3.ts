import * as Minio from 'minio';
import fp from 'fastify-plugin';
import type { Env } from '../env.js';

export function createS3Client(config: Env): Minio.Client {
  const endpoint = new URL(config.S3_ENDPOINT);
  return new Minio.Client({
    endPoint: endpoint.hostname,
    port: Number(endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80)),
    useSSL: endpoint.protocol === 'https:',
    accessKey: config.S3_ACCESS_KEY_ID,
    secretKey: config.S3_SECRET_ACCESS_KEY,
    region: config.S3_REGION,
  });
}

export const s3Plugin = fp(async (app) => {
  app.decorate('s3', createS3Client(app.config));
});
