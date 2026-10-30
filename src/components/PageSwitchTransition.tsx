'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTrip } from '@/lib/trip-context';

interface PageSwitchTransitionProps {
  children: React.ReactNode;
}

export function PageSwitchTransition({ children }: PageSwitchTransitionProps) {
  const pathname = usePathname();
  const { userName } = useTrip();
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const previousPathRef = useRef<string>(pathname);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only trigger page-switch loading when transitioning between routes after logging in
    if (userName && previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      setIsSwitching(true);

      if (timerRef.current) clearTimeout(timerRef.current);

      // Increased loading time on page switching (650ms smooth deliberate delay)
      timerRef.current = setTimeout(() => {
        setIsSwitching(false);
      }, 650);
    } else {
      previousPathRef.current = pathname;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, userName]);

  return (
    <>
      {/* Top glowing indeterminate progress line while page is switching */}
      {isSwitching && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1.5 overflow-hidden bg-cream-200 pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-bvc-deepRed via-bvc-red to-[#FFC49B] animate-pulse" />
        </div>
      )}

      {/* When switching, show an elegant full-page banking loading skeleton */}
      {isSwitching ? (
        <main className="max-w-lg mx-auto px-4 pt-5 pb-28 space-y-4 animate-in fade-in duration-200">
          <div className="space-y-4 animate-pulse">
            {/* Top Greeting / Header placeholder */}
            <div className="flex items-center justify-between py-1">
              <div className="h-7 w-40 bg-cream-300/80 rounded-xl" />
              <div className="h-8 w-24 bg-cream-200 rounded-full" />
            </div>

            {/* Main Featured Card placeholder */}
            <div className="h-44 sm:h-48 w-full rounded-3xl bg-gradient-to-br from-cream-300 to-cream-200 shadow-xs" />

            {/* Secondary Summary Card placeholder */}
            <div className="h-28 w-full rounded-3xl bg-cream-200/90" />

            {/* 3-column Grid placeholder */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="h-20 rounded-2xl bg-cream-200/70" />
              <div className="h-20 rounded-2xl bg-cream-200/70" />
              <div className="h-20 rounded-2xl bg-cream-200/70" />
            </div>

            {/* List / Transactions placeholder */}
            <div className="h-36 w-full rounded-3xl bg-cream-200/80" />
          </div>
        </main>
      ) : (
        <div className="animate-in fade-in duration-300">
          {children}
        </div>
      )}
    </>
  );
}

