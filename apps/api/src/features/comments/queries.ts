import { and, asc, desc, eq, gt, isNull, lt, or, type SQL } from 'drizzle-orm';
import type { CommentListResponse, CommentSort } from '@reel/shared';
import type { App } from '../../app.js';
import { comments } from '../../db/schema.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { badRequest } from '../../lib/errors.js';
import {
  commentAuthor,
  commentReplyTo,
  commentSelection,
  loadComments,
  type CommentRow,
} from './data.js';

function commentBaseQuery(app: Pick<App, 'db'>) {
  return app.db
    .select(commentSelection)
    .from(comments)
    .leftJoin(commentAuthor, eq(commentAuthor.id, comments.userId))
    .leftJoin(commentReplyTo, eq(commentReplyTo.id, comments.replyToUserId));
}

export async function listTopLevelComments(
  app: Pick<App, 'db' | 'config'>,
  videoId: string,
  sort: CommentSort,
  cursor: string | undefined,
  limit: number,
  viewerId: string | null,
): Promise<CommentListResponse> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  let cursorCondition: SQL | undefined;
  if (decoded) {
    const encodedDate = sort === 'top' ? decoded.keyParts[1] : decoded.keyParts[0];
    const createdAt = new Date(encodedDate ?? '');
    if (Number.isNaN(createdAt.getTime())) {
      throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
    }
    if (sort === 'top') {
      const likes = Number(decoded.keyParts[0]);
      if (!Number.isInteger(likes) || likes < 0) {
        throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
      }
      cursorCondition = or(
        lt(comments.likesCount, likes),
        and(
          eq(comments.likesCount, likes),
          or(
            lt(comments.createdAt, createdAt),
            and(eq(comments.createdAt, createdAt), lt(comments.id, decoded.id)),
          ),
        ),
      );
    } else {
      cursorCondition = or(
        lt(comments.createdAt, createdAt),
        and(eq(comments.createdAt, createdAt), lt(comments.id, decoded.id)),
      );
    }
  }

  const rows = await commentBaseQuery(app)
    .where(and(eq(comments.videoId, videoId), isNull(comments.parentId), cursorCondition))
    .orderBy(
      ...(sort === 'top'
        ? [desc(comments.likesCount), desc(comments.createdAt), desc(comments.id)]
        : [desc(comments.createdAt), desc(comments.id)]),
    )
    .limit(limit + 1);

  const page = rows.slice(0, limit) as CommentRow[];
  const last = page.at(-1);
  return {
    items: await loadComments(app, page, viewerId),
    nextCursor:
      rows.length > limit && last
        ? sort === 'top'
          ? encodeCursor([String(last.likesCount), last.createdAt.toISOString()], last.id)
          : encodeCursor([last.createdAt.toISOString()], last.id)
        : null,
  };
}

export async function listReplies(
  app: Pick<App, 'db' | 'config'>,
  parentId: string,
  cursor: string | undefined,
  limit: number,
  viewerId: string | null,
): Promise<CommentListResponse> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  let cursorCondition: SQL | undefined;
  if (decoded) {
    const createdAt = new Date(decoded.keyParts[0] ?? '');
    if (Number.isNaN(createdAt.getTime())) {
      throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
    }
    cursorCondition = or(
      gt(comments.createdAt, createdAt),
      and(eq(comments.createdAt, createdAt), gt(comments.id, decoded.id)),
    );
  }

  const rows = await commentBaseQuery(app)
    .where(and(eq(comments.parentId, parentId), cursorCondition))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit) as CommentRow[];
  const last = page.at(-1);
  return {
    items: await loadComments(app, page, viewerId),
    nextCursor:
      rows.length > limit && last ? encodeCursor([last.createdAt.toISOString()], last.id) : null,
  };
}
