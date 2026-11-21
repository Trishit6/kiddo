import { ApiClientError } from '@reel/shared';

export function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  return fallback;
}

export function firstIssueMessage(
  issues: readonly { message: string; path?: readonly PropertyKey[] }[],
  field: string,
): string {
  return issues.find((issue) => issue.path?.includes(field))?.message ?? '';
}
