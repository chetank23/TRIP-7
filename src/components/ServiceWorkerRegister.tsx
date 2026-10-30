'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      window.location.protocol !== 'https:'
    ) {
      return;
    }

    // Existing tabs can otherwise keep running JavaScript from the previous
    // deployment even after the new service worker has activated.
    const wasAlreadyControlled = Boolean(navigator.serviceWorker.controller);
    let isReloading = false;

    const handleControllerChange = () => {
      if (!wasAlreadyControlled || isReloading) return;
      isReloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('BVC PWA Service Worker registered:', registration.scope);

        // Check the deployed worker on each app load instead of waiting for
        // the browser's periodic background update check.
        return registration.update();
      })
      .catch((error) => {
        console.warn('Service Worker registration/update skipped:', error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
