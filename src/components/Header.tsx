'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Bell, ArrowLeft, Settings, Palmtree } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const router = useRouter();
  const { userName, refreshState, isSyncing, state } = useTrip();

  const membersCount = state?.members?.length || 7;
  const userInitial = (userName?.[0] || 'C').toUpperCase();

  return (
    <header className="sticky top-0 z-30 pt-safe bg-cream-100/90 backdrop-blur-md px-4 py-3 border-b border-cream-300/60">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Left Action */}
        <div className="flex items-center space-x-2">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white border border-cream-300 flex items-center justify-center text-bvc-text hover:bg-cream-200 transition-colors shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => refreshState()}
              disabled={isSyncing}
              className="w-9 h-9 rounded-full bg-white border border-cream-300 flex items-center justify-center text-bvc-secondary hover:text-bvc-text hover:bg-cream-200 transition-colors shadow-sm"
              aria-label="Refresh shared data"
              title="Refresh shared data"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-bvc-red' : ''}`} />
            </button>
          )}

          {/* Logo / Brand title when not displaying subpage title */}
          {!title && (
            <div className="flex items-center space-x-2 ml-1">
              <div className="w-8 h-8 rounded-xl bg-bvc-peach/30 flex items-center justify-center text-bvc-red">
                <Palmtree className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-bvc-text leading-tight tracking-tight">
                  BVC Trip
                </h1>
                <p className="text-[10px] text-bvc-secondary font-medium tracking-tight">
                  {membersCount} friends · One budget · Many memories
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Center Title (if explicit title passed) */}
        {title && (
          <h1 className="text-base font-bold text-bvc-text truncate max-w-[200px] text-center">
            {title}
          </h1>
        )}

        {/* Right Action: Notifications & Profile Shortcut */}
        <div className="flex items-center space-x-2">
          {rightAction ? (
            rightAction
          ) : (
            <>
              <Link
                href="/history"
                className="w-9 h-9 rounded-full bg-white border border-cream-300 flex items-center justify-center text-bvc-secondary hover:text-bvc-red hover:bg-cream-200 transition-colors shadow-sm"
                aria-label="Activity History"
                title="Activity History"
              >
                <Bell className="w-4 h-4" />
              </Link>
              <Link
                href="/settings"
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-bvc-red to-bvc-peach text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white hover:opacity-90 transition-opacity"
                aria-label="Settings and Profile"
                title={`Logged in as ${userName || 'You'}`}
              >
                {userInitial}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
