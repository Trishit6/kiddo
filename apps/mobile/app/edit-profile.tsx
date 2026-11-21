import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_AVATAR_BYTES, bioSchema, displayNameSchema, usernameSchema } from '@reel/shared';
import { useConfirmAvatarUpload, useCreateAvatarUpload, useUpdateProfile } from '@reel/queries';
import { space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { AppText, Avatar, Button, Field, Message } from '@/components/ui';
import { errorMessage, firstIssueMessage } from '@/lib/errors';
import { useTheme } from '@/theme/theme-provider';

type AvatarContentType = 'image/jpeg' | 'image/png' | 'image/webp';

const AVATAR_TYPES: AvatarContentType[] = ['image/jpeg', 'image/png', 'image/webp'];

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, setCurrentUser } = useAuth();
  const { prompt } = useSignInPrompt();
  const updateProfile = useUpdateProfile();
  const createAvatar = useCreateAvatarUpload();
  const confirmAvatar = useConfirmAvatarUpload();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [errors, setErrors] = useState<{ displayName?: string; username?: string; bio?: string }>(
    {},
  );
  const [message, setMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Edit profile' }} />
        <AppText variant="heading">Sign in to edit your profile</AppText>
        <Button label="Sign in" onPress={() => prompt()} />
      </View>
    );
  }

  const changeAvatar = async () => {
    setMessage('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Allow photo library access to choose an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const contentType = (asset.mimeType ?? 'image/jpeg').toLowerCase() as AvatarContentType;
    if (!AVATAR_TYPES.includes(contentType)) {
      setMessage('Choose a JPEG, PNG or WebP image.');
      return;
    }
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (!info.exists) {
      setMessage('Could not read that image.');
      return;
    }
    if (info.size > MAX_AVATAR_BYTES) {
      setMessage('Avatars must be 5 MB or smaller.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const target = await createAvatar.mutateAsync({ contentType, size: info.size });
      const upload = await FileSystem.uploadAsync(target.uploadUrl, asset.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      });
      if (upload.status < 200 || upload.status >= 300) {
        throw new Error('Avatar upload failed');
      }
      const confirmed = await confirmAvatar.mutateAsync({
        key: target.key,
        contentType,
        size: info.size,
      });
      setAvatarUrl(confirmed.user.avatarUrl);
      setCurrentUser(confirmed.user);
      setMessage('Avatar updated.');
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not update your avatar.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    const nextDisplay = displayNameSchema.safeParse(displayName);
    const nextUsername = usernameSchema.safeParse(username);
    const nextBio = bioSchema.safeParse(bio);
    setErrors({
      displayName: nextDisplay.success
        ? undefined
        : firstIssueMessage(nextDisplay.error.issues, 'displayName'),
      username: nextUsername.success
        ? undefined
        : firstIssueMessage(nextUsername.error.issues, 'username'),
      bio: nextBio.success ? undefined : firstIssueMessage(nextBio.error.issues, 'bio'),
    });
    if (!nextDisplay.success || !nextUsername.success || !nextBio.success) return;
    setMessage('');
    try {
      const response = await updateProfile.mutateAsync({
        displayName: nextDisplay.data,
        username: nextUsername.data,
        bio: nextBio.data,
      });
      setCurrentUser(response.user);
      router.back();
      Alert.alert('Profile updated', 'Your changes are live.');
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not save your profile.'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Edit profile' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
            onPress={() => void changeAvatar()}
            disabled={uploadingAvatar}
            style={styles.avatarPress}
          >
            <Avatar uri={avatarUrl} name={displayName || user.displayName} size={96} />
            <View style={[styles.avatarBadge, { backgroundColor: colors.brand }]}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.brandForeground} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.brandForeground} />
              )}
            </View>
          </Pressable>
          <AppText variant="caption" tone="muted">
            Tap to change. JPEG, PNG or WebP up to 5 MB.
          </AppText>
        </View>

        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          error={errors.displayName}
          editable={!updateProfile.isPending}
        />
        <Field
          label="Username"
          value={username}
          onChangeText={(value) => setUsername(value.toLowerCase())}
          placeholder="your.name"
          autoCapitalize="none"
          error={errors.username}
          editable={!updateProfile.isPending}
        />
        <View>
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="A line about you"
            multiline
            numberOfLines={4}
            error={errors.bio}
            editable={!updateProfile.isPending}
          />
          <AppText variant="caption" tone="muted" style={styles.counter}>
            {bio.length}/500
          </AppText>
        </View>

        <Message value={message} tone="error" />
        <Button
          label="Save changes"
          onPress={() => void save()}
          loading={updateProfile.isPending}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
  },
  avatarRow: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  avatarPress: { width: 96, height: 96 },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  counter: { alignSelf: 'flex-end', marginTop: space.xs },
});
