import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { ProfileView, SignedOutProfile } from '@/components/profile-view';

export default function ProfileTab() {
  const { user } = useAuth();
  const { prompt } = useSignInPrompt();

  if (!user) return <SignedOutProfile onSignIn={() => prompt()} />;
  return <ProfileView username={user.username} isOwner />;
}
