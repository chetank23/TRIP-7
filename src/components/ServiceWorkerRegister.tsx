'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol === 'https:'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('BVC PWA Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.warn('Service Worker registration skipped:', error);
        });
    }
  }, []);

  return null;
}
