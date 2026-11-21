import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export const googleSignInEnabled = webClientId.length > 0 || iosClientId.length > 0;

if (googleSignInEnabled) {
  GoogleSignin.configure({
    ...(webClientId ? { webClientId } : {}),
    ...(iosClientId ? { iosClientId } : {}),
    offlineAccess: false,
  });
}

export async function requestGoogleIdToken(): Promise<string | null> {
  if (!googleSignInEnabled) return null;
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') return null;
  return response.data.idToken;
}
