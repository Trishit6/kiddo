import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Comment } from '@reel/shared';
import { useAddComment } from '@reel/queries';
import { fontFamily, radius, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/theme-provider';

export const MAX_COMMENT_LENGTH = 500;

export function CommentComposer({
  videoId,
  replyingTo,
  onCancelReply,
  inSheet = false,
}: {
  videoId: string;
  replyingTo: Comment | null;
  onCancelReply: () => void;
  inSheet?: boolean;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { prompt } = useSignInPrompt();
  const addComment = useAddComment();
  const [text, setText] = useState('');

  if (!user) {
    return (
      <View style={[styles.loggedOut, { borderTopColor: colors.border }]}>
        <AppText tone="muted">Sign in to join the conversation.</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to comment"
          onPress={() => prompt()}
          style={[styles.signIn, { backgroundColor: colors.brand }]}
        >
          <Text style={[styles.signInLabel, { color: colors.brandForeground }]}>
            Sign in to comment
          </Text>
        </Pressable>
      </View>
    );
  }

  const value = text.trim();
  const tooLong = text.length > MAX_COMMENT_LENGTH;
  const canSubmit = value.length > 0 && !tooLong && !addComment.isPending;
  const parentId = replyingTo ? (replyingTo.parentId ?? replyingTo.id) : undefined;

  const submit = () => {
    if (!canSubmit) return;
    addComment.mutate(
      {
        videoId,
        text: value,
        parentId,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      },
      {
        onSuccess: () => {
          setText('');
          onCancelReply();
        },
      },
    );
  };

  const Input = inSheet ? BottomSheetTextInput : TextInput;

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
      {replyingTo ? (
        <View style={[styles.replyBar, { backgroundColor: colors.secondary }]}>
          <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.replyText}>
            Replying to @{replyingTo.author?.username ?? 'user'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            onPress={onCancelReply}
            hitSlop={10}
          >
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        <Input
          accessibilityLabel="Add a comment"
          placeholder={
            replyingTo ? `Reply to @${replyingTo.author?.username ?? 'user'}…` : 'Add a comment…'
          }
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX_COMMENT_LENGTH}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.secondary }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={replyingTo ? 'Post reply' : 'Post comment'}
          accessibilityState={{ disabled: !canSubmit }}
          onPress={submit}
          disabled={!canSubmit}
          style={[
            styles.send,
            {
              backgroundColor: canSubmit ? colors.brand : colors.muted,
              opacity: addComment.isPending ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSubmit ? colors.brandForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <AppText variant="caption" tone={tooLong ? 'danger' : 'muted'}>
          {text.length}/{MAX_COMMENT_LENGTH}
        </AppText>
        {addComment.isError ? (
          <AppText variant="caption" tone="danger">
            Could not post. Try again.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.xs },
  loggedOut: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.sm,
    alignItems: 'center',
  },
  signIn: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    minHeight: 32,
    gap: space.xs,
  },
  replyText: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
    fontFamily: fontFamily.sans,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xs,
  },
});
