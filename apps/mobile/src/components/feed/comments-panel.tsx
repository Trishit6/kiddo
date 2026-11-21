import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { Comment, CommentSort } from '@reel/shared';
import { useComments, useDeleteComment, useLikeComment, useReplies } from '@reel/queries';
import { radius, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AppText, EmptyState, ErrorState, IconButton, Skeleton } from '@/components/ui';
import { CommentComposer } from '@/components/feed/comment-composer';
import { relativeTime } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';

function CommentRowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={styles.skeletonRow}>
      <Skeleton width={34} height={34} rounded={17} />
      <View style={styles.skeletonText}>
        <Skeleton width="35%" height={10} />
        <Skeleton width="85%" height={12} />
      </View>
      <View style={[styles.skeletonHeart, { backgroundColor: colors.muted }]} />
    </View>
  );
}

function Replies({
  comment,
  videoId,
  replyingTo,
  onReply,
}: {
  comment: Comment;
  videoId: string;
  replyingTo: Comment | null;
  onReply: (comment: Comment | null) => void;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const replies = useReplies(expanded ? comment.id : '');
  const items = replies.data?.pages.flatMap((page) => page.items) ?? [];

  if (comment.replyCount === 0) return null;

  return (
    <View style={styles.replies}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? `Hide replies to ${comment.author?.username ?? 'comment'}`
            : `View ${comment.replyCount} replies`
        }
        onPress={() => setExpanded((value) => !value)}
        style={styles.viewReplies}
        hitSlop={6}
      >
        <View style={[styles.threadLine, { backgroundColor: colors.border }]} />
        <AppText variant="caption" tone="muted" weight="semibold">
          {expanded
            ? 'Hide replies'
            : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
        </AppText>
      </Pressable>
      {expanded ? (
        <View style={styles.replyList}>
          {replies.isPending ? <Skeleton width="80%" height={12} /> : null}
          {items.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              videoId={videoId}
              replyingTo={replyingTo}
              onReply={onReply}
              isReply
            />
          ))}
          {replies.hasNextPage ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void replies.fetchNextPage()}
              style={styles.loadMore}
            >
              <AppText variant="caption" tone="brand" weight="semibold">
                Load more replies
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CommentRow({
  comment,
  videoId,
  replyingTo,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  videoId: string;
  replyingTo: Comment | null;
  onReply: (comment: Comment | null) => void;
  isReply?: boolean;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const haptics = useHaptics();
  const like = useLikeComment();
  const remove = useDeleteComment();

  if (comment.isRemoved || !comment.author) {
    return (
      <View style={styles.row}>
        <AppText variant="caption" tone="muted">
          This comment was removed.
        </AppText>
      </View>
    );
  }

  const canDelete = comment.author.id === user?.id || user?.role === 'admin';
  const isReplying = replyingTo?.id === comment.id;

  const confirmDelete = () => {
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate({ commentId: comment.id, videoId }),
      },
    ]);
  };

  const toggleLike = () => {
    haptics.light();
    like.mutate({ commentId: comment.id, liked: !comment.viewerState.liked });
  };

  return (
    <View style={[styles.row, isReply ? styles.replyRow : null]}>
      <Avatar
        uri={comment.author.avatarUrl}
        name={comment.author.displayName}
        size={34}
        accessibilityLabel={`${comment.author.displayName} avatar`}
      />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <AppText variant="caption" weight="semibold" numberOfLines={1} style={styles.authorName}>
            @{comment.author.username}
          </AppText>
          <AppText variant="caption" tone="muted">
            {relativeTime(comment.createdAt)}
          </AppText>
        </View>
        <Pressable
          onLongPress={canDelete ? confirmDelete : undefined}
          delayLongPress={420}
          accessibilityRole={canDelete ? 'button' : undefined}
          accessibilityLabel={canDelete ? 'Comment. Long press to delete.' : undefined}
        >
          <AppText variant="body">
            {comment.replyToUser ? (
              <AppText variant="body" tone="brand">
                @{comment.replyToUser.username}{' '}
              </AppText>
            ) : null}
            {comment.text}
          </AppText>
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isReplying ? 'Cancel reply' : `Reply to ${comment.author.username}`}
            onPress={() => onReply(isReplying ? null : comment)}
            hitSlop={6}
          >
            <AppText variant="caption" tone="muted" weight="semibold">
              Reply
            </AppText>
          </Pressable>
          {canDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete comment"
              onPress={confirmDelete}
              hitSlop={6}
            >
              <AppText variant="caption" tone="muted" weight="semibold">
                Delete
              </AppText>
            </Pressable>
          ) : null}
        </View>
        {!isReply ? (
          <Replies comment={comment} videoId={videoId} replyingTo={replyingTo} onReply={onReply} />
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${comment.viewerState.liked ? 'Unlike' : 'Like'} comment, ${comment.likesCount} likes`}
        accessibilityState={{ selected: comment.viewerState.liked }}
        onPress={toggleLike}
        hitSlop={8}
        style={styles.likeButton}
      >
        <Ionicons
          name={comment.viewerState.liked ? 'heart' : 'heart-outline'}
          size={17}
          color={comment.viewerState.liked ? colors.brand : colors.mutedForeground}
        />
        <AppText variant="caption" tone={comment.viewerState.liked ? 'brand' : 'muted'}>
          {comment.likesCount}
        </AppText>
      </Pressable>
    </View>
  );
}

export function CommentsPanel({
  videoId,
  variant = 'inline',
  onClose,
}: {
  videoId: string;
  variant?: 'inline' | 'sheet';
  onClose?: () => void;
}) {
  const { colors } = useTheme();
  const [sort, setSort] = useState<CommentSort>('newest');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const comments = useComments(videoId, sort);
  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  const header = (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        <AppText variant="heading" weight="bold">
          Comments
        </AppText>
        {items.length > 0 ? (
          <AppText variant="caption" tone="muted">
            {items.length}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.sortTabs, { backgroundColor: colors.secondary }]}>
        {(['newest', 'top'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: sort === value }}
            accessibilityLabel={value === 'newest' ? 'Newest comments' : 'Top comments'}
            onPress={() => setSort(value)}
            style={[styles.sortTab, sort === value ? { backgroundColor: colors.card } : null]}
          >
            <AppText
              variant="caption"
              weight={sort === value ? 'semibold' : 'regular'}
              tone={sort === value ? 'default' : 'muted'}
            >
              {value === 'newest' ? 'Newest' : 'Top'}
            </AppText>
          </Pressable>
        ))}
      </View>
      {variant === 'sheet' && onClose ? (
        <IconButton
          icon="close"
          label="Close comments"
          color={colors.mutedForeground}
          onPress={onClose}
          size={20}
        />
      ) : null}
    </View>
  );

  const empty = !comments.isPending && !comments.isError && items.length === 0;

  const listProps = {
    data: items,
    keyExtractor: (item: Comment) => item.id,
    renderItem: ({ item }: { item: Comment }) => (
      <CommentRow
        comment={item}
        videoId={videoId}
        replyingTo={replyingTo}
        onReply={setReplyingTo}
      />
    ),
    contentContainerStyle: styles.listContent,
    onEndReached: () => {
      if (comments.hasNextPage && !comments.isFetchingNextPage) void comments.fetchNextPage();
    },
    onEndReachedThreshold: 0.4,
    keyboardShouldPersistTaps: 'handled' as const,
    showsVerticalScrollIndicator: false,
    ListHeaderComponent: comments.isPending ? (
      <View style={styles.listPadding}>
        {[0, 1, 2, 3, 4].map((key) => (
          <CommentRowSkeleton key={key} />
        ))}
      </View>
    ) : comments.isError ? (
      <ErrorState message="Comments could not load." onRetry={() => void comments.refetch()} />
    ) : empty ? (
      <EmptyState
        icon="chatbubble-ellipses-outline"
        title="No comments yet"
        body="Be the first to say something nice."
      />
    ) : undefined,
    ListFooterComponent: comments.isFetchingNextPage ? (
      <Skeleton width="60%" height={12} style={styles.loadingMore} />
    ) : undefined,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {header}
      {variant === 'sheet' ? <BottomSheetFlatList {...listProps} /> : <FlatList {...listProps} />}
      <CommentComposer
        videoId={videoId}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        inSheet={variant === 'sheet'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 52,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, flex: 1 },
  sortTabs: { flexDirection: 'row', borderRadius: radius.pill, padding: 2 },
  sortTab: {
    paddingHorizontal: space.md,
    minHeight: 30,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  listContent: { paddingBottom: space.lg },
  listPadding: { paddingHorizontal: space.lg },
  row: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  replyRow: { paddingHorizontal: 0, paddingVertical: space.xs },
  body: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  authorName: { maxWidth: '65%' },
  actions: { flexDirection: 'row', gap: space.lg, marginTop: 2 },
  likeButton: { alignItems: 'center', gap: 1, minWidth: 32, paddingTop: space.xs },
  replies: { marginTop: space.xs },
  replyList: { paddingLeft: space.lg, gap: space.xs },
  viewReplies: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
  threadLine: { width: 20, height: StyleSheet.hairlineWidth },
  loadMore: { minHeight: 44, justifyContent: 'center' },
  skeletonRow: { flexDirection: 'row', gap: space.sm, paddingVertical: space.md },
  skeletonText: { flex: 1, gap: 6 },
  skeletonHeart: { width: 24, height: 24, borderRadius: 12 },
  loadingMore: { alignSelf: 'center', marginVertical: space.lg },
});
