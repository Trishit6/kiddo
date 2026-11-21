import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, LogOut, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  avatarContentTypeSchema,
  MAX_AVATAR_BYTES,
  updateProfileRequestSchema,
} from '@reel/shared';
import type { UpdateProfileRequest } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { MyVideos } from '@/components/my-videos';
import { ThemeSegmentedControl } from '@/components/theme-settings';
import { GlassPanel } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export function Settings() {
  const { user, setCurrentUser, signOut, signOutAll } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const form = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: { username: '', displayName: '', bio: '' },
  });

  useEffect(() => {
    if (!user) return;
    form.reset({ username: user.username, displayName: user.displayName, bio: user.bio });
  }, [form, user]);

  if (!user) return null;

  const submit = form.handleSubmit(async (input) => {
    setError(null);
    setMessage(null);
    try {
      const response = await api.updateProfile(input);
      setCurrentUser(response.user);
      setMessage('Profile updated');
    } catch (cause) {
      setError(errorMessage(cause, 'Could not update your profile'));
    }
  });

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setMessage(null);
    const contentType = avatarContentTypeSchema.safeParse(file.type);
    if (!contentType.success) {
      setError('Use a JPEG, PNG or WebP image');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Avatar must be 5 MB or smaller');
      return;
    }
    setUploading(true);
    try {
      const upload = await api.createAvatarUpload({
        contentType: contentType.data,
        size: file.size,
      });
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType.data },
        body: file,
      });
      if (!response.ok) throw new Error('Avatar upload failed');
      const confirmed = await api.confirmAvatarUpload({
        key: upload.key,
        contentType: contentType.data,
        size: file.size,
      });
      setCurrentUser(confirmed.user);
      setMessage('Avatar updated');
    } catch (cause) {
      setError(errorMessage(cause, 'Could not upload your avatar'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ResponsiveContainer width="md" className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold sm:text-display">Settings</h1>
        <p className="text-muted-foreground">Tune your profile, theme and sessions.</p>
      </header>

      <GlassPanel aria-labelledby="profile-settings" className="space-y-5 p-5">
        <h2 id="profile-settings" className="font-display text-title font-semibold">
          Profile
        </h2>

        <div className="flex items-center gap-4">
          <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
          <div className="space-y-1">
            <label
              htmlFor="avatar"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-accent"
            >
              {uploading ? 'Uploading…' : 'Change avatar'}
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void uploadAvatar(event.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 5 MB.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Form>

        {message ? <p className="text-sm text-mint">{message}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </GlassPanel>

      <GlassPanel aria-labelledby="appearance" className="space-y-3 p-5">
        <h2 id="appearance" className="font-display text-title font-semibold">
          Appearance
        </h2>
        <ThemeSegmentedControl />
      </GlassPanel>

      <GlassPanel aria-labelledby="sessions" className="space-y-3 p-5">
        <h2 id="sessions" className="font-display text-title font-semibold">
          Sessions
        </h2>
        <p className="text-sm text-muted-foreground">
          Logging out of all devices revokes every refresh token for your account.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void signOut().then(() => navigate('/'));
            }}
          >
            <LogOut aria-hidden="true" /> Log out
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (!window.confirm('Log out of every device?')) return;
              void signOutAll().then(() => navigate('/'));
            }}
          >
            Log out of all devices
          </Button>
        </div>
      </GlassPanel>

      <GlassPanel aria-labelledby="coming-soon" className="space-y-3 border-dashed p-5">
        <h2 id="coming-soon" className="font-display text-title font-semibold">
          Coming soon
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Bell className="size-4" aria-hidden="true" /> Notifications and activity — waiting on
            API
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden="true" /> Blocking and privacy controls —
            waiting on API
          </li>
        </ul>
      </GlassPanel>

      <section aria-labelledby="my-videos" className="space-y-3">
        <h2 id="my-videos" className="sr-only">
          My videos
        </h2>
        <MyVideos />
      </section>
    </ResponsiveContainer>
  );
}
