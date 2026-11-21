# Feed and list performance

Phase 4 targets a p95 under 150 ms locally for a 10-item feed page and no
sequential scans on large tables. This document records the dataset, the query
plans and the load test results, plus how to reproduce them.

## Environment

- Windows host, Docker Desktop, Postgres 17 (`postgres:17-alpine`), Redis 7.
- API run with `tsx watch` (`pnpm dev`), Node 26 locally (`.nvmrc` targets 24),
  10 autocannon connections.
- Postgres and Redis use the compose defaults on localhost.

## Dataset

`pnpm db:seed:load` generates the large fixture with bulk inserts (2,000 rows per
statement) and runs `ANALYZE` at the end:

| Table          | Rows    |
| -------------- | ------- |
| users          | 5,010   |
| videos         | 50,040  |
| likes          | 200,150 |
| comments       | 100,080 |
| follows        | 100,109 |
| saves          | 100,000 |
| video_views    | 200,000 |
| video_hashtags | 50,000  |

The fixture deliberately mixes hidden videos: every 100th video is private,
every 100th+1 is unlisted, every 100th+2 is still processing, every 100th+3 is
failed and every 100th+4 is soft-deleted. Leaving them in the dataset proves the
visibility filters do not rely on all rows being public.

## Reproduce

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed:load
# The benchmark needs more than the default 300 req/min/IP/route.
RATE_LIMIT_MAX=1000000 pnpm --filter @reel/api dev
pnpm bench:feed
```

`pnpm bench:feed` logs in as `load-user-1@example.com` (`Password123!`), then runs
autocannon for 10 seconds per endpoint and reports exact p50/p95 percentiles from
the 2xx response samples. It exits non-zero if any request is non-2xx (for example
because the rate limit was left at its default) or if p95 is at least 150 ms.

## Query plans

Captured with `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)` on the dataset above.
No query touching `videos`, `likes`, `saves`, `comments`, `follows` or
`video_views` performs a sequential scan.

| Query                                                          | Access path                                                                                          | Execution |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| For You candidates (`/feed/for-you` session build)             | `videos_hot_created_idx` backward + anti-join `video_views_user_created_idx` + `users_pkey` memoized | 5.6 ms    |
| Following feed (`/feed/following`)                             | `follows_pair_unique` + `videos_owner_created_idx` + `users_pkey`                                    | 0.4 ms    |
| Top-level comments, top sort (`/videos/:id/comments?sort=top`) | `comments_video_top_likes_idx`                                                                       | 0.2 ms    |
| Replies (`/comments/:id/replies`)                              | `comments_parent_created_idx`                                                                        | 1.1 ms    |
| Followers / following lists                                    | `follows_following_created_idx` (read backward) / `follows_follower_created_idx` + `users_pkey`      | 0.2 ms    |
| Saved / liked lists                                            | `likes_user_video_unique` (index-only) + `videos_pkey`                                               | 0.5 ms    |
| Hashtag videos                                                 | `videos_public_feed_idx` backward + `video_hashtags` primary key + `hashtags_pkey`                   | 1.1 ms    |
| Trending hashtags                                              | `videos_public_feed_idx` bitmap scan + hash joins                                                    | 12.5 ms   |

### Notes on the plans

- The For You candidate query is bounded by `hot_score`/`created_at` and stops
  after 400 rows, so it never sorts the whole `videos` table.
- The trending hashtag aggregate intentionally scans `video_hashtags` (50k rows,
  417 heap pages, ~3 ms). The planner picks a hash join over 1,373 index lookups
  because the table is small in I/O terms. All tables above 100k rows are reached
  through indexes.
- The `users` table (5k rows) is also scanned in the trending aggregate; it is a
  small dimension table and the scan is ~1 ms.
- The 2-minute trending cache stores only hashtags and video ids. `viewerState`
  is hydrated per request, so one viewer's likes/saves never leak to another.

## Load test results

`pnpm bench:feed`, 10 connections, 10 s per endpoint, `limit=10`, 0 non-2xx
responses and 0 socket errors:

| Endpoint              | Successful req/s | p50     | p95      |
| --------------------- | ---------------- | ------- | -------- |
| `GET /feed/for-you`   | 103              | 94.3 ms | 124.7 ms |
| `GET /feed/following` | 296              | 32.4 ms | 44.3 ms  |

Both endpoints meet the 150 ms p95 target. For You is the more expensive path
because a cache miss builds a new 200-candidate session (candidate query, follow
lookup, ranking and a Redis write) before returning page 1.

## Indexes added or verified for this phase

The Phase 4 migration (`apps/api/drizzle/0003_dear_vermin.sql` and the follow-up
index migration) provides:

- `video_views_video_created_idx`, `video_views_user_created_idx`,
  `video_views_anon_created_idx` — view dedupe and feed exclusion.
- `videos_hot_created_idx` — For You candidate ordering and trending top videos.
- `videos_public_feed_idx` — public/ready visibility with chronological order.
- `comments_video_parent_created_idx`, `comments_parent_created_idx`,
  `comments_video_top_likes_idx` — newest/top comments and replies.
- `comment_likes_user_comment_unique`, `comment_likes_comment_idx` — idempotent
  comment likes.
- `follows_pair_unique`, `follows_follower_created_idx`,
  `follows_following_created_idx` — idempotent follows and both list directions.
- `likes_user_created_idx`, `saves_user_created_idx` — profile saved/liked lists.

All list endpoints use keyset pagination on `(sort key, id)`; there is no `OFFSET`.
