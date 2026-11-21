import { FeedScreen } from '@/components/feed/feed-screen';

export function ForYou() {
  return <FeedScreen kind="for-you" />;
}

export function Following() {
  return <FeedScreen kind="following" />;
}
