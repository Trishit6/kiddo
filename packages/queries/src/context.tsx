import { createContext, useContext, type ReactNode } from 'react';
import type { ApiClient, ApiClientError } from '@reel/shared';

export interface ReelQueriesContextValue {
  api: ApiClient;
  /**
   * Called when an interaction fails because the viewer is signed out. Apps
   * open their login flow and call `retry` after a successful sign-in.
   */
  onAuthRequired?: (error: ApiClientError, retry?: () => void) => void;
  subscribeToBackground?: (flush: () => void) => () => void;
}

const ReelQueriesContext = createContext<ReelQueriesContextValue | null>(null);

export function ReelQueriesProvider({
  api,
  onAuthRequired,
  subscribeToBackground,
  children,
}: ReelQueriesContextValue & { children: ReactNode }) {
  return (
    <ReelQueriesContext.Provider value={{ api, onAuthRequired, subscribeToBackground }}>
      {children}
    </ReelQueriesContext.Provider>
  );
}

export function useReelQueries(): ReelQueriesContextValue {
  const context = useContext(ReelQueriesContext);
  if (!context) throw new Error('ReelQueriesProvider is missing');
  return context;
}
