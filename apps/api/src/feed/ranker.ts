export interface FeedCandidate {
  id: string;
  authorId: string;
  hotScore: number;
  createdAt: Date;
  viewsCount: number;
  followed: boolean;
}

export interface FeedRankingContext {
  now: Date;
}

export interface FeedRanker {
  rank(candidates: FeedCandidate[], limit: number, context: FeedRankingContext): FeedCandidate[];
}

export const feedRankingConfig = {
  followedAuthorBoost: 1.2,
  freshVideoBoost: 1.1,
  freshReserveRatio: 0.2,
  freshMaxViews: 100,
  freshMaxAgeHours: 72,
  authorSpacing: 5,
} as const;

function rankingScore(candidate: FeedCandidate): number {
  return candidate.hotScore * (candidate.followed ? feedRankingConfig.followedAuthorBoost : 1);
}

function isFresh(candidate: FeedCandidate, now: Date): boolean {
  const ageHours = (now.getTime() - candidate.createdAt.getTime()) / 3_600_000;
  return (
    candidate.viewsCount < feedRankingConfig.freshMaxViews &&
    ageHours <= feedRankingConfig.freshMaxAgeHours
  );
}

/**
 * Deterministic local ranker. Keeping this behind an interface lets a learned
 * model replace it without touching feed sessions or routes.
 */
export class LocalFeedRanker implements FeedRanker {
  rank(candidates: FeedCandidate[], limit: number, context: FeedRankingContext): FeedCandidate[] {
    const now = context.now;
    const sorted = [...candidates].sort((left, right) => {
      const scoreDifference =
        rankingScore(right) * (isFresh(right, now) ? feedRankingConfig.freshVideoBoost : 1) -
        rankingScore(left) * (isFresh(left, now) ? feedRankingConfig.freshVideoBoost : 1);
      if (scoreDifference !== 0) return scoreDifference;
      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    const fresh = sorted.filter((candidate) => isFresh(candidate, now));
    const freshReserve = Math.min(
      fresh.length,
      Math.max(1, Math.round(limit * feedRankingConfig.freshReserveRatio)),
    );
    const selected: FeedCandidate[] = [];
    const selectedIds = new Set<string>();
    const recentAuthors: string[] = [];
    let freshUsed = 0;

    for (let position = 0; position < limit; position += 1) {
      const wantsFresh =
        freshUsed < freshReserve &&
        (position % Math.round(1 / feedRankingConfig.freshReserveRatio) ===
          Math.round(1 / feedRankingConfig.freshReserveRatio) - 1 ||
          position === 0);
      const preferred = wantsFresh ? fresh : sorted;
      const fallback = wantsFresh ? sorted : fresh;
      let chosen = preferred.find(
        (candidate) =>
          !selectedIds.has(candidate.id) &&
          !recentAuthors.slice(-(feedRankingConfig.authorSpacing - 1)).includes(candidate.authorId),
      );
      if (!chosen) {
        chosen = fallback.find(
          (candidate) =>
            !selectedIds.has(candidate.id) &&
            !recentAuthors
              .slice(-(feedRankingConfig.authorSpacing - 1))
              .includes(candidate.authorId),
        );
      }
      if (!chosen) break;

      selected.push(chosen);
      selectedIds.add(chosen.id);
      if (fresh.some((candidate) => candidate.id === chosen.id)) freshUsed += 1;
      recentAuthors.push(chosen.authorId);
    }

    return selected;
  }
}
