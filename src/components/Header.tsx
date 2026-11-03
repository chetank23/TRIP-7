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

  // Keep the same BVC brand block on every route; page title becomes its small descriptor.
  const displayTitle = 'BVC';
  const displaySubtitle =
    subtitle !== undefined ? subtitle : title ? title.toUpperCase() : 'TRAVEL TOGETHER';

  return (
    <>
    <header className="sticky top-0 z-30 w-full app-header-safe-area bg-[#FEFBF6]/95 backdrop-blur-md border-b border-[#EFE3D7]/70 shadow-[0_2px_8px_rgba(0,0,0,0.03)] select-none">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-2.5 sm:gap-4 sm:px-5 lg:px-7">
        {/* ================= BRAND SECTION ================= */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EFE3D7] bg-white text-[#81766C] shadow-sm transition-all hover:border-[#D7192D]/40 hover:bg-[#F6EDE2] hover:text-[#D7192D] active:scale-95 sm:h-9 sm:w-9"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2.4] sm:h-5 sm:w-5" />
            </button>
          )}

          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#FFC49B]/40 bg-[#FFC49B]/30 text-[#D7192D] shadow-xs transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10"
            aria-label="BVC Trip Home"
            title="BVC Trip Home"
          >
            <Palmtree className="h-5 w-5 stroke-[2.2] sm:h-6 sm:w-6" />
          </Link>

          <span className="h-8 w-px shrink-0 bg-[#DCCABD] sm:h-9" aria-hidden="true" />

          <div className="flex min-w-0 max-w-[92px] flex-col items-start justify-center min-[400px]:max-w-[116px] sm:max-w-none">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              aria-label={isSyncing ? 'Synchronizing trip data' : 'Refresh shared trip data'}
              aria-busy={isSyncing}
              title={isSyncing ? 'Synchronizing shared trip data…' : 'Tap BVC to refresh shared trip data'}
              className={`group relative flex max-w-full flex-col items-start justify-center rounded-md text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7192D]/40 disabled:cursor-wait ${
                isSyncing ? 'text-[#D7192D]' : 'text-[#242126] hover:text-[#D7192D]'
              }`}
            >
              <span className={`max-w-full truncate text-[21px] font-black leading-[1.02] tracking-[-0.045em] sm:text-2xl ${
                isSyncing ? 'drop-shadow-[0_0_9px_rgba(215,25,45,0.32)]' : ''
              }`}>
                {displayTitle}
              </span>
              {displaySubtitle && (
                <span className={`mt-1 max-w-full truncate text-[7px] font-extrabold uppercase leading-none tracking-[0.14em] min-[400px]:text-[8px] min-[400px]:tracking-[0.19em] sm:text-[9px] ${
                  isSyncing ? 'text-[#D7192D]' : 'text-[#8A796D]'
                }`}>
                  {isSyncing ? 'SYNCING TRIP DATA…' : displaySubtitle}
                </span>
              )}
              <span
                className={`mt-1.5 block h-[3px] w-8 rounded-full bg-[#D7192D] transition-all duration-300 ${
                  isSyncing
                    ? 'w-12 animate-pulse shadow-[0_0_10px_rgba(215,25,45,0.65)]'
                    : 'group-hover:w-11'
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* ================= QUICK ACTIONS ================= */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
          <div className="flex h-10 min-w-0 items-center gap-0.5 rounded-full border border-[#F0E1D5] bg-[#FFF3E8]/90 px-1 shadow-[0_2px_8px_rgba(120,88,64,0.06)] sm:gap-1.5 sm:px-1.5">
            {rightAction ? (
              <div className="flex h-8 max-w-[88px] min-w-0 items-center justify-center overflow-hidden px-0.5 min-[400px]:max-w-[108px] sm:max-w-[180px]">
                {rightAction}
              </div>
            ) : (
              <Link
                href="/history"
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
                  isHistoryPage
                    ? 'bg-white text-[#D7192D] shadow-sm'
                    : 'text-[#81766C] hover:bg-white/80 hover:text-[#D7192D]'
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
                    className="absolute right-0 top-0 h-2.5 w-2.5 animate-pulse rounded-full bg-[#D7192D] ring-2 ring-[#FFF3E8]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )}

            <span className="h-6 w-px shrink-0 bg-[#E2D1C3]" aria-hidden="true" />

            <Link
              href="/chat"
              className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
                isChatPage
                  ? 'bg-white text-[#D7192D] shadow-sm'
                  : 'text-[#81766C] hover:bg-white/80 hover:text-[#D7192D]'
              }`}
              aria-label={chatUnreadCount > 0 ? `Open BVC group chat, ${chatUnreadCount} unread messages` : 'Open BVC group chat'}
              title={chatUnreadCount > 0 ? `${chatUnreadCount} unread chat messages` : 'BVC group chat'}
            >
              <MessageCircle className="h-5 w-5 stroke-[2.2]" />
              {chatUnreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#FFF3E8] bg-[#D7192D] px-1 text-[9px] font-black leading-none text-white shadow-sm"
                  aria-label={`${chatUnreadCount} unread messages`}
                >
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </Link>
          </div>

          <Link
            href="/settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#D7192D] to-[#F36A68] text-xs font-black text-white shadow-sm ring-2 ring-white transition-all hover:opacity-90 active:scale-95"
            aria-label={`Logged in as ${userName || 'You'}. Open settings.`}
            title={`Logged in as ${userName || 'Member'} (Click for Settings)`}
          >
            {userInitials}
          </Link>
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
