/**
 * Phase 7 adds a blocks table. Keeping this hook here means feed candidate
 * generation already has the filter seam and no route or ranker changes will be
 * required then.
 */
export async function blockedAuthorIds(viewerId: string | null): Promise<string[]> {
  void viewerId;
  return [];
}
