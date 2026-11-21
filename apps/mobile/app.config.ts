import type { ConfigContext, ExpoConfig } from 'expo/config';

const scheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'kiddo';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosUrlScheme = googleIosClientId ? googleIosClientId.split('.').reverse().join('.') : '';

/** Web origin that serves the universal-link fallbacks (/s/:id and /@username). */
const webHost = process.env.EXPO_PUBLIC_WEB_HOST ?? 'kiddo.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kiddo',
  slug: 'kiddo',
  version: '1.0.0',
  scheme,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.kiddo.mobile',
    associatedDomains: [`applinks:${webHost}`],
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Kiddo records sound with your videos when you record in the app.',
    },
  },
  android: {
    package: 'app.kiddo.mobile',
    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0d0b12',
    },
    permissions: ['android.permission.RECORD_AUDIO'],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: webHost, pathPrefix: '/s' },
          { scheme: 'https', host: webHost, pathPrefix: '/@' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#0d0b12',
        dark: { backgroundColor: '#0d0b12' },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Kiddo uses the camera only while you record a video.',
        microphonePermission: 'Kiddo records sound with your videos.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Kiddo lets you choose a video or avatar from your library.',
      },
    ],
    ...(iosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as const]
      : []),
  ],
  extra: {
    apiBaseUrl,
    googleWebClientId,
    googleIosClientId,
    webHost,
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  experiments: {
    typedRoutes: true,
    onDemandFilesystem: true,
  },
});
