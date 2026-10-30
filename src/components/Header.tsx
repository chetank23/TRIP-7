'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { RefreshCw, History, ArrowLeft, Palmtree } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

const LAST_VIEWED_ACT_KEY = 'bvc_last_viewed_activity_id';

export function Header({
  title,
  subtitle,
  showBack = false,
  rightAction,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userName, refreshState, isSyncing, state, showToast } = useTrip();

  const membersCount = state?.members?.length || 7;
  const isHistoryPage = pathname === '/history';

  // Unread notifications tracker
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  useEffect(() => {
    if (!state?.activities || state.activities.length === 0) {
      setHasUnread(false);
      return;
    }

    const latestActId = state.activities[0].id;
    if (isHistoryPage) {
      try {
        localStorage.setItem(LAST_VIEWED_ACT_KEY, latestActId);
      } catch {}
      setHasUnread(false);
    } else {
      try {
        const lastViewed = localStorage.getItem(LAST_VIEWED_ACT_KEY);
        setHasUnread(Boolean(!lastViewed || lastViewed !== latestActId));
      } catch {
        setHasUnread(false);
      }
    }
  }, [state?.activities, isHistoryPage]);

  // Compute initials: "Chetan K" -> "CK", "Adithi" -> "AD"
  const userInitials = useMemo(() => {
    if (!userName || !userName.trim()) return 'CK';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }, [userName]);

  const handleRefresh = async () => {
    try {
      await refreshState();
      showToast('Trip data synchronized', 'success');
    } catch {
      showToast('Failed to refresh shared data', 'error');
    }
  };

  const displayTitle = title || 'BVC Trip';
  const displaySubtitle =
    subtitle !== undefined
      ? subtitle
      : title
      ? undefined
      : `${membersCount} friends · One budget · Many memories`;

  return (
    <header className="sticky top-0 z-30 pt-safe bg-[#FEFBF6]/95 backdrop-blur-md px-3.5 sm:px-5 py-3.5 sm:py-4 border-b border-[#EFE3D7]/70 shadow-[0_2px_8px_rgba(0,0,0,0.03)] select-none">
      <div className="w-full max-w-lg mx-auto grid grid-cols-[88px_1fr_88px] sm:grid-cols-[96px_1fr_96px] items-center gap-1.5 sm:gap-2.5">
        {/* ================= LEFT SECTION ================= */}
        <div className="flex items-center gap-2 shrink-0 justify-start">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-[#EFE3D7] flex items-center justify-center text-[#242126] hover:bg-[#F6EDE2] hover:border-[#D7192D]/40 active:scale-95 transition-all shadow-sm shrink-0"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-[#EFE3D7] flex items-center justify-center text-[#81766C] hover:text-[#D7192D] hover:border-[#D7192D]/40 hover:bg-[#F6EDE2] active:scale-95 transition-all shadow-sm disabled:opacity-60 shrink-0"
              aria-label="Refresh shared data"
              title="Refresh shared data"
            >
              <RefreshCw
                className={`w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2] ${
                  isSyncing ? 'animate-spin text-[#D7192D]' : ''
                }`}
              />
            </button>
          )}

          {/* Palm-Tree App Logo Icon */}
          <Link
            href="/"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FFC49B]/30 border border-[#FFC49B]/40 flex items-center justify-center text-[#D7192D] shrink-0 hover:scale-105 active:scale-95 transition-transform shadow-xs"
            aria-label="BVC Trip Home"
            title="BVC Trip Home"
          >
            <Palmtree className="w-5 h-5 stroke-[2.2]" />
          </Link>
        </div>

        {/* ================= CENTER SECTION ================= */}
        <div className="flex flex-col items-center justify-center min-w-0 px-1 text-center overflow-hidden">
          <h1 className="text-base sm:text-lg font-black text-[#242126] tracking-tight truncate w-full leading-tight">
            {displayTitle}
          </h1>
          {displaySubtitle && (
            <p className="text-[11px] sm:text-xs text-[#81766C] font-semibold tracking-tight truncate w-full leading-tight mt-0.5 hidden min-[340px]:block">
              {displaySubtitle}
            </p>
          )}
        </div>

        {/* ================= RIGHT SECTION ================= */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          {rightAction ? (
            rightAction
          ) : (
            <>
              {/* History & Audit Trail Button */}
              <Link
                href="/history"
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border flex items-center justify-center active:scale-95 transition-all shadow-sm relative shrink-0 ${
                  isHistoryPage
                    ? 'border-[#D7192D] text-[#D7192D] bg-[#FFF8F7]'
                    : 'border-[#EFE3D7] text-[#81766C] hover:text-[#D7192D] hover:border-[#D7192D]/40 hover:bg-[#F6EDE2]'
                }`}
                aria-label={
                  hasUnread
                    ? 'Activity History & Audit Trail (New modifications recorded)'
                    : 'Activity History & Audit Trail (Who modified what)'
                }
                title={
                  hasUnread
                    ? 'New modifications recorded! Tap to inspect history'
                    : 'Activity History · Who modified what (Permanent in Blob)'
                }
              >
                <History className="w-5 h-5 stroke-[2.2]" />
                {hasUnread && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#D7192D] ring-2 ring-white animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </Link>

              {/* User Avatar Initial */}
              <Link
                href="/settings"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#D7192D] to-[#FFC49B] text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 ring-white hover:opacity-90 active:scale-95 transition-all shrink-0"
                aria-label={`Logged in as ${userName || 'You'}. Open settings.`}
                title={`Logged in as ${userName || 'Member'} (Click for Settings)`}
              >
                {userInitials}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
