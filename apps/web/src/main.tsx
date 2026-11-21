import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

if (import.meta.env.DEV) {
  void import('./lib/dev-storage-seed')
    .then(({ maybeSeedDevStorage }) => maybeSeedDevStorage())
    .catch(() => undefined);
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
