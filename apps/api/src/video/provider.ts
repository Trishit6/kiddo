import type { VideoContentType, VideoPlayback } from '@reel/shared';
import type { Client as MinioClient } from 'minio';
import type { Env } from '../env.js';
import { removePrefixes } from '../lib/s3-objects.js';
import { mediaUrl, originalKey, videoStoragePrefixes } from '../lib/storage-keys.js';

export interface CreateUploadInput {
  videoId: string;
  contentType: VideoContentType;
  maxBytes: number;
}

export interface ProviderUpload {
  url: string;
  fields: Record<string, string>;
  expiresIn: number;
}

export interface FinalizedUpload {
  key: string;
  size: number;
  contentType: string;
}

export interface PlaybackSource {
  storageKey: string | null;
  thumbnailKey: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Business code depends only on this interface. A managed provider (Mux or
 * Cloudflare Stream) can be added without touching the routes or worker.
 */
export interface VideoProvider {
  createUpload(input: CreateUploadInput): Promise<ProviderUpload>;
  finalizeUpload(videoId: string): Promise<FinalizedUpload | null>;
  getPlayback(source: PlaybackSource): VideoPlayback | null;
  delete(videoId: string): Promise<void>;
}

interface ProviderDeps {
  s3: MinioClient;
  config: Env;
}

export class LocalFfmpegProvider implements VideoProvider {
  constructor(private readonly deps: ProviderDeps) {}

  async createUpload(input: CreateUploadInput): Promise<ProviderUpload> {
    const { s3, config } = this.deps;
    const expiresIn = 15 * 60;
    const policy = s3.newPostPolicy();
    policy.setBucket(config.S3_BUCKET);
    policy.setKey(originalKey(input.videoId));
    policy.setExpires(new Date(Date.now() + expiresIn * 1000));
    policy.setContentLengthRange(1, input.maxBytes);
    policy.setContentType(input.contentType);
    const result = await s3.presignedPostPolicy(policy);

    // Signing is host-independent for S3 POST policies, so rewrite the URL to
    // the address browsers and phones can actually reach.
    const signed = new URL(result.postURL);
    const publicEndpoint = new URL(config.S3_PUBLIC_ENDPOINT);
    signed.protocol = publicEndpoint.protocol;
    signed.host = publicEndpoint.host;

    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.formData)) {
      fields[key] = String(value);
    }
    return { url: signed.toString(), fields, expiresIn };
  }

  async finalizeUpload(videoId: string): Promise<FinalizedUpload | null> {
    const { s3, config } = this.deps;
    const key = originalKey(videoId);
    try {
      const stat = await s3.statObject(config.S3_BUCKET, key);
      const contentType = String(
        stat.metaData['content-type'] ?? stat.metaData['Content-Type'] ?? '',
      );
      return { key, size: stat.size, contentType };
    } catch {
      return null;
    }
  }

  getPlayback(source: PlaybackSource): VideoPlayback | null {
    if (
      !source.storageKey ||
      !source.thumbnailKey ||
      !source.durationSeconds ||
      !source.width ||
      !source.height
    ) {
      return null;
    }
    return {
      hlsUrl: mediaUrl(this.deps, source.storageKey),
      thumbnailUrl: mediaUrl(this.deps, source.thumbnailKey),
      durationSeconds: source.durationSeconds,
      width: source.width,
      height: source.height,
    };
  }

  async delete(videoId: string): Promise<void> {
    await removePrefixes(this.deps.s3, this.deps.config.S3_BUCKET, videoStoragePrefixes(videoId));
  }
}

/**
 * Placeholder for a future Mux/Cloudflare Stream integration. It is selected by
 * VIDEO_PROVIDER=managed and intentionally fails until implemented, rather than
 * silently falling back to local processing.
 */
export class ManagedProvider implements VideoProvider {
  private unavailable(): never {
    throw new Error('Managed video provider is not implemented');
  }

  createUpload(): Promise<ProviderUpload> {
    return this.unavailable();
  }

  finalizeUpload(): Promise<FinalizedUpload | null> {
    return this.unavailable();
  }

  getPlayback(): VideoPlayback | null {
    return this.unavailable();
  }

  delete(): Promise<void> {
    return this.unavailable();
  }
}
