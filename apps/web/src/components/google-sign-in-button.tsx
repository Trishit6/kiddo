import { useEffect, useRef } from 'react';
import { googleWebClientId } from '@/lib/api';

let loadPromise: Promise<void> | null = null;
let initializedFor: string | null = null;
let deliverCredential: (credential: string) => void = () => undefined;

function loadGoogleIdentityServices(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gis]');
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleGis = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        loadPromise = null;
        reject(new Error('Google Identity Services could not be loaded'));
      },
      { once: true },
    );
  });
  return loadPromise;
}

function initialize(clientId: string, onCredential: (credential: string) => void): void {
  deliverCredential = onCredential;
  if (initializedFor === clientId) return;
  google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    callback: (response) => deliverCredential(response.credential),
  });
  initializedFor = clientId;
}

interface GoogleSignInButtonProps {
  onCredential(credential: string): Promise<void> | void;
}

export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef(onCredential);
  handlerRef.current = onCredential;

  useEffect(() => {
    if (!googleWebClientId) return;
    let active = true;
    void loadGoogleIdentityServices()
      .then(() => {
        if (!active || !hostRef.current) return;
        initialize(googleWebClientId, (credential) => {
          void handlerRef.current(credential);
        });
        hostRef.current.replaceChildren();
        google.accounts.id.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!googleWebClientId) return null;
  return <div ref={hostRef} className="flex justify-center" />;
}
