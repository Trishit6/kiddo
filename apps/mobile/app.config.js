const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const iosUrlScheme = iosClientId ? iosClientId.split('.').reverse().join('.') : '';

export default {
  expo: {
    name: 'Reel',
    slug: 'reel',
    scheme: 'reel',
    userInterfaceStyle: 'automatic',
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-dev-client',
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }]] : []),
    ],
    experiments: {
      onDemandFilesystem: true,
    },
  },
};
