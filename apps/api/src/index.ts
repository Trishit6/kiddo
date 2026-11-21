import { buildApp } from './app.js';
import { env } from './env.js';

const app = buildApp();
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'shutdown failed');
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error({ err: error }, 'failed to start API');
  process.exit(1);
}
