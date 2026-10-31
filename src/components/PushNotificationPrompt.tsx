'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Loader2, Smartphone, X } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';

const DISMISSED_UNTIL_KEY = 'bvc_daily_push_prompt_dismissed_until';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || '';

function decodeVapidPublicKey(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isIosDevice(): boolean {
  const userAgent = navigator.userAgent || '';
  const isAppleMobile = /iPad|iPhone|iPod/i.test(userAgent);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadOs;
}

function isInstalledHomeScreenApp(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function PushNotificationPrompt() {
  const { userName, isUserLoaded, state, isLoading, showToast } = useTrip();

  const [isOpen, setIsOpen] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isIosInstallRequired, setIsIosInstallRequired] = useState(false);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoaded || !userName || isLoading || !state || !VAPID_PUBLIC_KEY) return;

    const member = state.members?.find(
      (name) => name.trim().toLocaleLowerCase('en-IN') === userName.trim().toLocaleLowerCase('en-IN')
    );
    if (!member) return;

    let cancelled = false;

    const checkNotificationSetup = async () => {
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        return;
      }

      const permissionBlocked = Notification.permission === 'denied';
      const iosInstallRequired = isIosDevice() && !isInstalledHomeScreenApp();

      if (cancelled) return;
      setIsPermissionBlocked(permissionBlocked);
      setIsIosInstallRequired(iosInstallRequired);

      if (permissionBlocked) {
        setIsOpen(true);
        return;
      }

      // If this device has already opted in, keep its server-side record fresh
      // (for example after the member changes their display name).
      if (Notification.permission === 'granted' && !iosInstallRequired) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();

          if (subscription) {
            const response = await fetch('/api/push/subscriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                member,
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
              }),
            });
            const result = await response.json().catch(() => null);

            if (response.ok && result?.success) {
              if (!cancelled) setIsOpen(false);
              return;
            }
          }
        } catch (syncError) {
          console.warn('BVC push subscription refresh notice:', syncError);
        }
      }

      try {
        const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
        if (dismissedUntil > Date.now()) return;
      } catch {
        // Continue to show the prompt if browser storage is unavailable.
      }

      if (!cancelled) setIsOpen(true);
    };

    void checkNotificationSetup();

    return () => {
      cancelled = true;
    };
  }, [isUserLoaded, userName, state, isLoading]);

  const dismissForNow = () => {
    try {
      // Avoid prompting on every page visit. Offer again the following day.
      localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {}
    setIsOpen(false);
  };

  const enableNotifications = async () => {
    if (!userName || !VAPID_PUBLIC_KEY) {
      setError('Notification setup is incomplete. Please try again after the app update finishes.');
      return;
    }

    setIsEnabling(true);
    setError(null);

    try {
      // Keep the permission request directly inside this button gesture.
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        setIsPermissionBlocked(permission === 'denied');
        throw new Error(
          permission === 'denied'
            ? 'Notifications are blocked for BVC Trip. Enable them in your browser or phone settings.'
            : 'Notification permission was not granted.'
        );
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(VAPID_PUBLIC_KEY),
        });
      }

      const response = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member: userName,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Your device subscription could not be saved.');
      }

      try {
        localStorage.removeItem(DISMISSED_UNTIL_KEY);
      } catch {}

      setIsOpen(false);
      showToast('BVC Daily Roasts enabled on this device! 🌴', 'success');
    } catch (enableError: unknown) {
      const message = enableError instanceof Error
        ? enableError.message
        : 'Unable to enable BVC notifications.';
      setError(message);
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#242126]/45 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bvc-push-title"
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-cream-300 bg-[#FEFBF6] p-5 shadow-[0_24px_80px_rgba(36,33,38,0.28)]"
      >
        <button
          type="button"
          onClick={dismissForNow}
          aria-label="Close notification prompt"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-bvc-secondary shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D7192D] to-[#F18A71] text-white shadow-sm">
          <BellRing className="h-7 w-7" />
        </div>

        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-bvc-red">
          BVC Trip Countdown
        </p>
        <h2 id="bvc-push-title" className="mt-1 text-xl font-black tracking-tight text-bvc-text">
          Allow the daily roast? 😂
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-bvc-secondary">
          One funny BVC reminder every morning at 9 AM IST, plus a special message on November 11.
          No spam, just your friends keeping you accountable.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cream-300 bg-white p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bvc-peach/30 text-bvc-red">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-bvc-text">Daily BVC notifications</p>
            <p className="mt-0.5 text-[11px] leading-snug text-bvc-secondary">
              {isPermissionBlocked
                ? 'Notifications are blocked in this browser. Change the permission in device settings.'
                : isIosInstallRequired
                  ? 'On iPhone: Add BVC Trip to your Home Screen, open it from the new icon, then enable notifications.'
                  : 'Delivered to this device, even when BVC Trip is closed (when supported by your device).'}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium leading-relaxed text-bvc-error">
            {error}
          </p>
        )}

        {isPermissionBlocked && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-bvc-secondary">
            <CheckCircle2 className="h-4 w-4 text-bvc-success" />
            Change BVC Trip notification permission in your browser or phone settings.
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={dismissForNow}
            disabled={isEnabling}
            className="flex-1 rounded-2xl border border-cream-300 bg-white px-3 py-3 text-xs font-bold text-bvc-secondary transition-colors hover:bg-cream-50 disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={enableNotifications}
            disabled={isEnabling || isIosInstallRequired || isPermissionBlocked}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-bvc-red px-3 py-3 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-bvc-deepRed active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEnabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            {isEnabling ? 'Enabling…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}
