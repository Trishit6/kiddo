import type { Queue } from 'bullmq';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
} as const;

export interface VideoJobData {
  videoId: string;
}

export async function enqueueVideoProcessing(queue: Queue, videoId: string): Promise<void> {
  await queue.add('process-video', { videoId } satisfies VideoJobData, {
    ...JOB_OPTIONS,
    jobId: `process:${videoId}`,
  });
}

export async function enqueueVideoCleanup(queue: Queue, videoId: string): Promise<void> {
  await queue.add('delete-video', { videoId } satisfies VideoJobData, {
    ...JOB_OPTIONS,
    jobId: `delete:${videoId}`,
  });
}
