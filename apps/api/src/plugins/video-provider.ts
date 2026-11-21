import fp from 'fastify-plugin';
import { LocalFfmpegProvider, ManagedProvider } from '../video/provider.js';
import type { VideoProvider } from '../video/provider.js';

export const videoProviderPlugin = fp(async (app) => {
  const provider: VideoProvider =
    app.config.VIDEO_PROVIDER === 'managed'
      ? new ManagedProvider()
      : new LocalFfmpegProvider({ s3: app.s3, config: app.config });
  app.decorate('videoProvider', provider);
});
