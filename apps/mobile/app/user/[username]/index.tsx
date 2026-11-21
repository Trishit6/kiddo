import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/components/auth-provider';
import { ProfileView } from '@/components/profile-view';

export default function UserScreen() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const { user } = useAuth();
  return <ProfileView username={username} isOwner={user?.username === username} />;
}
