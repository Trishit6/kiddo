import { and, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Comment } from '@reel/shared';
import type { App } from '../../app.js';
import { commentLikes, comments, users } from '../../db/schema.js';
import { avatarUrl } from '../../lib/users.js';

export const commentAuthor = alias(users, 'comment_author');
export const commentReplyTo = alias(users, 'comment_reply_to');

export const commentSelection = {
  id: comments.id,
  videoId: comments.videoId,
  parentId: comments.parentId,
  body: comments.body,
  likesCount: comments.likesCount,
  replyCount: comments.replyCount,
  replyToUserId: comments.replyToUserId,
  deletedAt: comments.deletedAt,
  createdAt: comments.createdAt,
  authorId: commentAuthor.id,
  authorUsername: commentAuthor.username,
  authorDisplayName: commentAuthor.displayName,
  authorAvatarKey: commentAuthor.avatarKey,
  replyToId: commentReplyTo.id,
  replyToUsername: commentReplyTo.username,
  replyToDisplayName: commentReplyTo.displayName,
  replyToAvatarKey: commentReplyTo.avatarKey,
};

export type CommentRow = {
  id: string;
  videoId: string;
  parentId: string | null;
  body: string;
  likesCount: number;
  replyCount: number;
  replyToUserId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  authorId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarKey: string | null;
  replyToId: string | null;
  replyToUsername: string | null;
  replyToDisplayName: string | null;
  replyToAvatarKey: string | null;
};

export async function loadComments(
  app: Pick<App, 'db' | 'config'>,
  rows: CommentRow[],
  viewerId: string | null,
): Promise<Comment[]> {
  if (rows.length === 0) return [];
  const liked = new Set<string>();
  if (viewerId) {
    const likedRows = await app.db
      .select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(
        and(
          eq(commentLikes.userId, viewerId),
          inArray(
            commentLikes.commentId,
            rows.map((row) => row.id),
          ),
        ),
      );
    for (const row of likedRows) liked.add(row.commentId);
  }

  return rows.map((row) => {
    const removed = row.deletedAt !== null;
    return {
      id: row.id,
      videoId: row.videoId,
      parentId: row.parentId,
      text: removed ? '' : row.body,
      isRemoved: removed,
      author:
        removed || !row.authorId || !row.authorUsername || !row.authorDisplayName
          ? null
          : {
              id: row.authorId,
              username: row.authorUsername,
              displayName: row.authorDisplayName,
              avatarUrl: avatarUrl(app, row.authorAvatarKey),
            },
      replyToUser:
        !row.replyToId || !row.replyToUsername || !row.replyToDisplayName
          ? null
          : {
              id: row.replyToId,
              username: row.replyToUsername,
              displayName: row.replyToDisplayName,
              avatarUrl: avatarUrl(app, row.replyToAvatarKey),
            },
      likesCount: row.likesCount,
      replyCount: row.replyCount,
      createdAt: row.createdAt.toISOString(),
      viewerState: { liked: liked.has(row.id) },
    };
  });
}

export async function loadCommentById(
  app: Pick<App, 'db' | 'config'>,
  commentId: string,
  viewerId: string | null,
): Promise<Comment | null> {
  const [row] = await app.db
    .select(commentSelection)
    .from(comments)
    .leftJoin(commentAuthor, eq(commentAuthor.id, comments.userId))
    .leftJoin(commentReplyTo, eq(commentReplyTo.id, comments.replyToUserId))
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!row) return null;
  const [comment] = await loadComments(app, [row as CommentRow], viewerId);
  return comment ?? null;
}
