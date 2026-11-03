'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { History, ArrowLeft, Palmtree, MessageCircle, X } from 'lucide-react';
import { useTrip } from '@/lib/trip-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getChatNotificationStorageKeys, readChatUnreadIds, writeChatUnreadIds } from '@/lib/chat-notifications';

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
  const isChatPage = pathname === '/chat';

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

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatAlert, setChatAlert] = useState<{ id: string; sender: string; content: string } | null>(null);

  useEffect(() => {
    if (!userName) {
      setChatUnreadCount(0);
      setChatAlert(null);
      return;
    }

    // Opening the chat marks messages as read in ChatPage. Do not show alerts while it is open.
    if (isChatPage) {
      setChatUnreadCount(0);
      setChatAlert(null);
      return;
    }

    const keys = getChatNotificationStorageKeys(userName);
    let active = true;
    let syncInFlight = false;
    let syncQueued = false;
    let channel: any = null;
    const client = getSupabaseBrowserClient();

    setChatUnreadCount(readChatUnreadIds(userName).length);

    const fetchChatMessages = async (after?: string) => {
      const params = new URLSearchParams({ member: userName });
      if (after) params.set('after', after);

      const response = await fetch(`/api/chat/messages?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const result = await response.json();

      if (!response.ok || !result.success || !Array.isArray(result.messages)) {
        throw new Error(result.error || 'Unable to check unread chat messages');
      }

      return result.messages as Array<{ id: string; sender: string; content: string; created_at: string }>;
    };

    async function syncUnread(showPopup = true) {
      if (syncInFlight) {
        syncQueued = true;
        return;
      }

      syncInFlight = true;
      try {
        let lastReadAt: string | null = null;
        try {
          lastReadAt = window.localStorage.getItem(keys.lastReadAt);
        } catch {}

        // On first use, establish a baseline instead of marking the entire old chat history unread.
        if (!lastReadAt || Number.isNaN(Date.parse(lastReadAt))) {
          const currentMessages = await fetchChatMessages();
          if (!active) return;
          const latest = currentMessages[currentMessages.length - 1];
          try {
            window.localStorage.setItem(keys.lastReadAt, latest?.created_at || new Date().toISOString());
          } catch {}
          writeChatUnreadIds(userName, []);
          setChatUnreadCount(0);
          return;
        }

        const incoming = await fetchChatMessages(lastReadAt);
        if (!active) return;

        const baselineTime = Date.parse(lastReadAt);
        const unreadMessages = incoming.filter((message) => {
          const isOwn = message.sender.trim().toLocaleLowerCase('en-IN') === userName.trim().toLocaleLowerCase('en-IN');
          return !isOwn && Date.parse(message.created_at) > baselineTime;
        });

        const existingIds = readChatUnreadIds(userName);
        const existingSet = new Set(existingIds);
        const newlyUnread = unreadMessages.filter((message) => !existingSet.has(message.id));
        const combinedIds = Array.from(new Set([...existingIds, ...unreadMessages.map((message) => message.id)])).slice(-100);

        writeChatUnreadIds(userName, combinedIds);
        setChatUnreadCount(combinedIds.length);

        if (showPopup && newlyUnread.length > 0) {
          const latestNewMessage = newlyUnread[newlyUnread.length - 1];
          setChatAlert({
            id: latestNewMessage.id,
            sender: latestNewMessage.sender,
            content: latestNewMessage.content,
          });
        }
      } catch {
        // Keep the last known unread count if the network is temporarily unavailable.
      } finally {
        syncInFlight = false;
        if (syncQueued && active) {
          syncQueued = false;
          void syncUnread(false);
        }
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === keys.unreadIds || event.key === keys.lastReadAt || event.key === null) {
        setChatUnreadCount(readChatUnreadIds(userName).length);
        if (readChatUnreadIds(userName).length === 0) setChatAlert(null);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void syncUnread(true);
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    if (client) {
      channel = client
        .channel('bvc-trip-group-chat')
        .on('broadcast', { event: 'message-created' }, () => {
          void syncUnread(true);
        })
        .on('broadcast', { event: 'chat-cleared' }, () => {
          writeChatUnreadIds(userName, []);
          setChatUnreadCount(0);
          setChatAlert(null);
        })
        .subscribe();
    }

    const poll = window.setInterval(() => {
      if (!document.hidden) void syncUnread(true);
    }, 15000);

    void syncUnread(true);

    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [userName, isChatPage]);

  useEffect(() => {
    if (!chatAlert) return;
    const timeout = window.setTimeout(() => setChatAlert(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [chatAlert]);

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
    <>
    <header className="sticky top-0 z-30 w-full app-header-safe-area bg-[#FEFBF6]/95 backdrop-blur-md border-b border-[#EFE3D7]/70 shadow-[0_2px_8px_rgba(0,0,0,0.03)] select-none">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3 lg:px-7">
        {/* ================= LEFT SECTION ================= */}
        <div className="flex min-w-0 items-center justify-start">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EFE3D7] bg-white text-[#242126] shadow-sm transition-all hover:border-[#D7192D]/40 hover:bg-[#F6EDE2] active:scale-95"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.4]" />
            </button>
          )}

          {/* Palm-Tree App Logo Icon */}
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FFC49B]/40 bg-[#FFC49B]/30 text-[#D7192D] shadow-xs transition-transform hover:scale-105 active:scale-95"
            aria-label="BVC Trip Home"
            title="BVC Trip Home"
          >
            <Palmtree className="h-5 w-5 stroke-[2.2]" />
          </Link>
        </div>

        {/* ================= CENTER SECTION ================= */}
        <div className="flex min-w-0 items-center justify-center overflow-hidden px-1 text-center">
          <h1 className="w-full min-w-0 truncate text-base font-black leading-tight tracking-tight text-[#242126] sm:text-xl">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              aria-label={isSyncing ? 'Synchronizing trip data' : 'Refresh shared trip data'}
              aria-busy={isSyncing}
              title={isSyncing ? 'Synchronizing shared trip data…' : 'Tap to refresh shared trip data'}
              className={`relative inline-flex max-w-full flex-col items-center justify-center rounded-xl border px-2.5 py-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7192D]/40 disabled:cursor-wait ${
                isSyncing
                  ? 'border-[#D7192D]/35 bg-[#FFF6F4] text-[#D7192D] shadow-[0_0_0_3px_rgba(215,25,45,0.06),0_0_20px_rgba(215,25,45,0.2)]'
                  : 'border-transparent hover:border-[#EFE3D7] hover:bg-white/60 active:scale-[0.98]'
              }`}
            >
              <span className={`relative z-[1] truncate ${isSyncing ? 'drop-shadow-[0_0_8px_rgba(215,25,45,0.2)]' : ''}`}>
                {displayTitle}
              </span>
              {(isSyncing || displaySubtitle) && (
                <span className={`relative z-[1] mt-0.5 hidden max-w-full items-center justify-center gap-1 truncate text-[10px] font-semibold leading-tight tracking-tight min-[340px]:inline-flex sm:text-xs ${
                  isSyncing ? 'text-[#D7192D]' : 'text-[#81766C]'
                }`}>
                  {isSyncing ? (
                    <>
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#D7192D]" />
                      <span className="truncate">Syncing trip data…</span>
                    </>
                  ) : (
                    displaySubtitle
                  )}
                </span>
              )}
            </button>
          </h1>
        </div>

        {/* ================= RIGHT SECTION ================= */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end sm:gap-2">
          {rightAction ? (
            <>{rightAction}</>
          ) : (
            <>
              {/* History & Audit Trail Button */}
              <Link
                href="/history"
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm transition-all active:scale-95 ${
                  isHistoryPage
                    ? 'border-[#D7192D] bg-[#FFF8F7] text-[#D7192D]'
                    : 'border-[#EFE3D7] text-[#81766C] hover:border-[#D7192D]/40 hover:bg-[#F6EDE2] hover:text-[#D7192D]'
                }`}
                aria-label={
                  hasUnread
                    ? 'Activity History & Audit Trail (New modifications recorded)'
                    : 'Activity History & Audit Trail (Who modified what)'
                }
                title={
                  hasUnread
                    ? 'New modifications recorded! Tap to inspect history'
                    : 'Activity History · Who modified what'
                }
              >
                <History className="h-5 w-5 stroke-[2.2]" />
                {hasUnread && (
                  <span
                    className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#D7192D] ring-2 ring-white"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </>
          )}

          {/* Group Chat — available throughout the app */}
          <Link
            href="/chat"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all active:scale-95 ${
              isChatPage
                ? 'border-[#D7192D] bg-[#FFF0F2] text-[#D7192D]'
                : 'border-[#EFE3D7] bg-white text-[#81766C] hover:border-[#D7192D]/40 hover:bg-[#FFF8F7] hover:text-[#D7192D]'
            }`}
            aria-label={chatUnreadCount > 0 ? `Open BVC group chat, ${chatUnreadCount} unread messages` : 'Open BVC group chat'}
            title={chatUnreadCount > 0 ? `${chatUnreadCount} unread chat messages` : 'BVC group chat'}
          >
            <MessageCircle className="h-5 w-5 stroke-[2.2]" />
            {chatUnreadCount > 0 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#D7192D] px-1 text-[9px] font-black leading-none text-white shadow-sm"
                aria-label={`${chatUnreadCount} unread messages`}
              >
                {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
              </span>
            )}
          </Link>

          {!rightAction && (
            /* User Avatar Initial */
            <Link
              href="/settings"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#D7192D] to-[#FFC49B] text-xs font-black text-white shadow-sm ring-2 ring-white transition-all hover:opacity-90 active:scale-95"
              aria-label={`Logged in as ${userName || 'You'}. Open settings.`}
              title={`Logged in as ${userName || 'Member'} (Click for Settings)`}
            >
              {userInitials}
            </Link>
          )}
        </div>
      </div>
    </header>
      {chatAlert && !isChatPage && (
        <div
          className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[60] mx-auto max-w-md"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2 rounded-2xl border border-[#F1D7D2] bg-white/95 p-3 shadow-[0_12px_35px_rgba(36,33,38,0.16)] backdrop-blur-xl">
            <Link
              href="/chat"
              onClick={() => setChatAlert(null)}
              className="flex min-w-0 flex-1 items-start gap-3"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F2] text-[#D7192D]">
                <MessageCircle className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-xs font-extrabold text-[#242126]">
                  {chatAlert.sender}
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#D7192D]">New message</span>
                </span>
                <span className="mt-1 block truncate text-xs font-medium text-[#655B55]">
                  {chatAlert.content}
                </span>
                <span className="mt-1 block text-[10px] font-bold text-[#D7192D]">Tap to open chat</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setChatAlert(null)}
              aria-label="Dismiss new chat message"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#81766C] transition-colors hover:bg-[#F6EDE2]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
