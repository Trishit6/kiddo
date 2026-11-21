import { Redirect, useLocalSearchParams } from 'expo-router';

/** Universal-link fallback for https://<host>/s/:videoId. */
export default function SharedVideoRedirect() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  return <Redirect href={`/video/${videoId}`} />;
}
