import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthGateProvider } from '@/components/auth-gate';
import { AuthProvider } from '@/components/auth-provider';
import { AppShell } from '@/components/layout';
import { PlaybackSettingsProvider } from '@/components/playback-settings';
import { ProtectedRoute } from '@/components/protected-route';
import { RouteErrorBoundary } from '@/components/route-error-boundary';
import { ThemeProvider } from '@/components/theme-provider';
import { Spinner } from '@/components/ui/spinner';

function lazyNamed<T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[name] as ComponentType };
  });
}

const Landing = lazyNamed(() => import('@/pages/Landing'), 'Landing');
const ForYou = lazyNamed(() => import('@/pages/FeedPage'), 'ForYou');
const Following = lazyNamed(() => import('@/pages/FeedPage'), 'Following');
const Explore = lazyNamed(() => import('@/pages/Explore'), 'Explore');
const SearchPage = lazyNamed(() => import('@/pages/Search'), 'Search');
const NotificationsPage = lazyNamed(() => import('@/pages/Notifications'), 'Notifications');
const Tag = lazyNamed(() => import('@/pages/Tag'), 'Tag');
const VideoDetail = lazyNamed(() => import('@/pages/VideoDetail'), 'VideoDetail');
const Profile = lazyNamed(() => import('@/pages/Profile'), 'Profile');
const Settings = lazyNamed(() => import('@/pages/Settings'), 'Settings');
const Upload = lazyNamed(() => import('@/pages/Upload'), 'Upload');
const MyProfile = lazyNamed(() => import('@/pages/MyProfile'), 'MyProfile');
const Saved = lazyNamed(() => import('@/pages/Saved'), 'Saved');
const Login = lazyNamed(() => import('@/pages/Login'), 'Login');
const Signup = lazyNamed(() => import('@/pages/Signup'), 'Signup');
const VerifyEmail = lazyNamed(() => import('@/pages/VerifyEmail'), 'VerifyEmail');
const ForgotPassword = lazyNamed(() => import('@/pages/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyNamed(() => import('@/pages/ResetPassword'), 'ResetPassword');
const NotFound = lazyNamed(() => import('@/pages/NotFound'), 'NotFound');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function RouteFallback() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <Spinner label="Loading" />
    </div>
  );
}

function page(element: ReactNode) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{element}</Suspense>
    </RouteErrorBoundary>
  );
}

/** /videos/:id and /s/:id are legacy/share URLs; keep them working. */
function LegacyVideoRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/video/${id}`} replace />;
}

function ShareRedirect() {
  const { videoId = '' } = useParams();
  return <Navigate to={`/video/${videoId}`} replace />;
}

/** `/@username` is a single path segment; validate the @ before rendering a profile. */
function HandleRoute() {
  const { handle = '' } = useParams();
  if (!handle.startsWith('@') || handle.length < 2) return <NotFound />;
  return <Profile />;
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGateProvider>
            <PlaybackSettingsProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="welcome" element={page(<Landing />)} />
                  <Route path="login" element={page(<Login />)} />
                  <Route path="signup" element={page(<Signup />)} />
                  <Route path="verify-email" element={page(<VerifyEmail />)} />
                  <Route path="forgot-password" element={page(<ForgotPassword />)} />
                  <Route path="reset-password" element={page(<ResetPassword />)} />
                  <Route element={<AppShell />}>
                    <Route index element={page(<ForYou />)} />
                    <Route path="following" element={page(<Following />)} />
                    <Route path="explore" element={page(<Explore />)} />
                    <Route path="search" element={page(<SearchPage />)} />
                    <Route path="tag/:tag" element={page(<Tag />)} />
                    <Route path="video/:id" element={page(<VideoDetail />)} />
                    <Route path=":handle" element={page(<HandleRoute />)} />
                    <Route path="videos/:id" element={<LegacyVideoRedirect />} />
                    <Route path="s/:videoId" element={<ShareRedirect />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="upload" element={page(<Upload />)} />
                      <Route path="settings" element={page(<Settings />)} />
                      <Route path="profile" element={page(<MyProfile />)} />
                      <Route path="saved" element={page(<Saved />)} />
                      <Route path="notifications" element={page(<NotificationsPage />)} />
                    </Route>
                    <Route path="*" element={page(<NotFound />)} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </PlaybackSettingsProvider>
          </AuthGateProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
