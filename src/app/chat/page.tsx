'use client';

import React, {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, Loader2, MessageCircle, Send } from 'lucide-react';
import { findProfileByName } from '@/lib/profiles';
import { Header } from '@/components/Header';
import { useTrip } from '@/lib/trip-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { markChatMessagesRead } from '@/lib/chat-notifications';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 50;
const MAX_MESSAGE_LENGTH = 2000;

function formatMessageTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMessageDate(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ChatPage() {
  const router = useRouter();
  const { userName, isUserLoaded, state, isLoading } = useTrip();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingMembers, setTypingMembers] = useState<string[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  const [seenByMessage, setSeenByMessage] = useState<Record<string, Array<{ reader: string; readAt: string }>>>({});
  const [expandedReceiptMessageId, setExpandedReceiptMessageId] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const channelRef = useRef<any>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const seenMessagesSentRef = useRef<Set<string>>(new Set());
  const lastTypingSentAtRef = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const currentMember = useMemo(() => {
    if (!userName || !state?.members) return null;
    return state.members.find(
      (member) => member.trim().toLocaleLowerCase('en-IN') === userName.trim().toLocaleLowerCase('en-IN')
    ) || null;
  }, [state?.members, userName]);

  useEffect(() => {
    if (isUserLoaded && !userName) {
      router.replace('/');
    }
  }, [isUserLoaded, userName, router]);

  const fetchMessages = useCallback(async (before?: string, prepend = false) => {
    if (!userName) return;

    const params = new URLSearchParams({ member: userName });
    if (before) params.set('before', before);

    try {
      const response = await fetch(`/api/chat/messages?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to load messages');
      }

      const incoming = (result.messages || []) as ChatMessage[];
      if (!prepend) markChatMessagesRead(userName, incoming);
      setMessages((previous) => {
        if (!prepend && previous.length <= PAGE_SIZE) return incoming;
        const merged = new Map<string, ChatMessage>();
        [...incoming, ...previous].forEach((message) => merged.set(message.id, message));
        return Array.from(merged.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      setHasMore(Boolean(result.hasMore));
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load group chat';
      setError(message);
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingOlder(false);
    }
  }, [userName]);

  useEffect(() => {
    if (!userName) return;

    if (!state) {
      if (!isLoading) {
        setIsLoadingMessages(false);
        setError('Unable to load the trip member list. Refresh the app and try again.');
      }
      return;
    }

    if (!currentMember) {
      setIsLoadingMessages(false);
      setError('This profile is not in the current trip member list. Ask the trip organizer to add it.');
      return;
    }

    void fetchMessages();

    const client = getSupabaseBrowserClient();
    let channel: any = null;

    if (client) {
      channel = client
        .channel('bvc-trip-group-chat')
        .on('broadcast', { event: 'message-created' }, () => {
          shouldStickToBottomRef.current =
            !listRef.current ||
            listRef.current.scrollHeight - listRef.current.scrollTop - listRef.current.clientHeight < 120;
          void fetchMessages();
        })
        .on('broadcast', { event: 'typing' }, ({ payload }: { payload?: { sender?: string } }) => {
          const sender = payload?.sender;
          if (!sender || sender.toLocaleLowerCase('en-IN') === userName.toLocaleLowerCase('en-IN')) return;
          setTypingMembers((current) => current.includes(sender) ? current : [...current, sender]);
          const previousTimeout = typingTimeoutsRef.current.get(sender);
          if (previousTimeout) clearTimeout(previousTimeout);
          const timeout = setTimeout(() => {
            setTypingMembers((current) => current.filter((member) => member !== sender));
            typingTimeoutsRef.current.delete(sender);
          }, 4000);
          typingTimeoutsRef.current.set(sender, timeout);
        })
        .on('broadcast', { event: 'typing-stop' }, ({ payload }: { payload?: { sender?: string } }) => {
          const sender = payload?.sender;
          if (!sender) return;
          const previousTimeout = typingTimeoutsRef.current.get(sender);
          if (previousTimeout) clearTimeout(previousTimeout);
          typingTimeoutsRef.current.delete(sender);
          setTypingMembers((current) => current.filter((member) => member !== sender));
        })
        .on('broadcast', { event: 'message-seen' }, ({ payload }: { payload?: { messageId?: string; reader?: string; readAt?: string } }) => {
          const messageId = payload?.messageId;
          const reader = payload?.reader;
          if (!messageId || !reader || reader.toLocaleLowerCase('en-IN') === userName.toLocaleLowerCase('en-IN')) return;
          const readAt = payload?.readAt || new Date().toISOString();
          setSeenByMessage((current) => {
            const receipts = current[messageId] || [];
            if (receipts.some((receipt) => receipt.reader.toLocaleLowerCase('en-IN') === reader.toLocaleLowerCase('en-IN'))) return current;
            return { ...current, [messageId]: [...receipts, { reader, readAt }] };
          });
        })
        .on('presence', { event: 'sync' }, () => {
          const presence = channel.presenceState() as Record<string, Array<{ member?: string; page?: string }>>;
          const members = Object.values(presence)
            .flat()
            .filter((entry) => entry.page === 'chat' && typeof entry.member === 'string')
            .map((entry) => entry.member as string);
          setOnlineMembers(Array.from(new Set(members)));
        })
        .subscribe(async (status: string) => {
          const connected = status === 'SUBSCRIBED';
          setIsRealtimeConnected(connected);
          if (connected) {
            try {
              await channel.track({ member: currentMember, page: 'chat', activeAt: new Date().toISOString() });
            } catch {
              // Presence is optional; messaging continues if tracking is unavailable.
            }
          } else {
            setOnlineMembers([]);
          }
        });

      channelRef.current = channel;
    }

    // Small fallback poll covers reconnects and missed realtime broadcasts.
    const poll = window.setInterval(() => {
      if (!document.hidden) void fetchMessages();
    }, 15000);

    return () => {
      window.clearInterval(poll);
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      if (client && channel) {
        void client.removeChannel(channel);
      }
      channelRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, [userName, currentMember, isLoading, state, fetchMessages]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const handleScroll = () => {
    const element = listRef.current;
    if (!element) return;
    shouldStickToBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  };

  // Broadcast a read receipt only when an incoming message is actually visible.
  useEffect(() => {
    const root = listRef.current;
    const channel = channelRef.current;
    if (!root || !channel || !currentMember || !isRealtimeConnected || isLoadingMessages || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (document.visibilityState !== 'visible') return;
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
        const element = entry.target as HTMLElement;
        const messageId = element.dataset.chatMessageId;
        const sender = element.dataset.chatMessageSender;
        if (!messageId || !sender) return;
        if (sender.trim().toLocaleLowerCase('en-IN') === currentMember.trim().toLocaleLowerCase('en-IN')) return;
        if (seenMessagesSentRef.current.has(messageId)) return;

        seenMessagesSentRef.current.add(messageId);
        void channel.send({
          type: 'broadcast',
          event: 'message-seen',
          payload: { messageId, reader: currentMember, readAt: new Date().toISOString() },
        }).then((result: { status?: string }) => {
          if (result?.status && result.status !== 'ok') seenMessagesSentRef.current.delete(messageId);
        }).catch(() => seenMessagesSentRef.current.delete(messageId));
      });
    }, { root, threshold: [0.6] });

    root.querySelectorAll<HTMLElement>('[data-chat-message-id]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [messages, currentMember, isLoadingMessages, isRealtimeConnected]);

  const loadOlderMessages = async () => {
    if (!hasMore || isLoadingOlder || messages.length === 0) return;
    const oldest = messages[0].created_at;
    setIsLoadingOlder(true);
    shouldStickToBottomRef.current = false;
    await fetchMessages(oldest, true);
  };

  const sendTypingSignal = () => {
    const now = Date.now();
    if (!channelRef.current || now - lastTypingSentAtRef.current < 1800) return;
    lastTypingSentAtRef.current = now;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: currentMember || userName },
    }).catch(() => undefined);
  };

  const stopTypingSignal = () => {
    if (!channelRef.current || !currentMember) return;
    lastTypingSentAtRef.current = 0;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing-stop',
      payload: { sender: currentMember },
    }).catch(() => undefined);
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !userName || isSending || content.length > MAX_MESSAGE_LENGTH) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: userName, content }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Message could not be sent');
      }

      const sent = result.message as ChatMessage;
      shouldStickToBottomRef.current = true;
      setMessages((previous) =>
        previous.some((message) => message.id === sent.id)
          ? previous
          : [...previous, sent]
      );
      setDraft('');
      stopTypingSignal();

      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'message-created',
          payload: { id: sent.id },
        }).catch(() => undefined);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Message could not be sent';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  if (!isUserLoaded || (isLoading && !state)) {
    return (
      <div className="min-h-screen bg-bvc-bg">
        <Header title="BVC Junction" showBack />
        <div className="flex min-h-[55vh] items-center justify-center text-bvc-secondary">
          <Loader2 className="h-6 w-6 animate-spin text-bvc-red" />
        </div>
      </div>
    );
  }

  if (!userName) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bvc-bg">
      <Header title="BVC Junction" subtitle="Your group's shared chat" showBack />

      <main className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[420px] w-full max-w-lg flex-1 flex-col px-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 sm:px-4">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-cream-300 bg-white/80 px-3.5 py-2.5 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bvc-redLight text-bvc-red">
              <MessageCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-bvc-text">BVC Friends</p>
              <p className="text-[10px] font-medium text-bvc-secondary">
                {onlineMembers.length} BVC online
              </p>
            </div>
          </div>
          <div className="flex max-w-[58%] items-center justify-end">
            {onlineMembers.length > 0 ? (
              <div className="flex items-center pl-1" aria-label={`${onlineMembers.length} BVC members online`}>
                {onlineMembers.slice(0, 6).map((member) => {
                  const profile = findProfileByName(member);
                  return (
                    <span key={member} className="relative -ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-bvc-peach/40 shadow-sm" title={`${member} is online`}>
                      {profile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.photoUrl} alt={profile.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-extrabold text-bvc-text">{member.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    </span>
                  );
                })}
                {onlineMembers.length > 6 && <span className="-ml-1 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-cream-100 px-1 text-[9px] font-bold text-bvc-secondary">+{onlineMembers.length - 6}</span>}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <span className={`h-1.5 w-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isRealtimeConnected ? 'Connected' : 'Auto sync'}
              </span>
            )}
          </div>
        </div>

        <section
          ref={listRef}
          onScroll={handleScroll}
          aria-label="Group messages"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl px-1 py-2"
        >
          {hasMore && (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={loadOlderMessages}
                disabled={isLoadingOlder}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-bvc-secondary shadow-sm disabled:opacity-60"
              >
                {isLoadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDown className="h-3.5 w-3.5 rotate-180" />}
                Load older messages
              </button>
            </div>
          )}

          {isLoadingMessages ? (
            <div className="flex h-40 items-center justify-center text-bvc-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-bvc-red" />
            </div>
          ) : error && messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-xs rounded-2xl border border-cream-300 bg-white p-5 text-center shadow-sm">
              <MessageCircle className="mx-auto mb-2 h-7 w-7 text-bvc-muted" />
              <p className="text-sm font-bold text-bvc-text">Chat is not available yet</p>
              <p className="mt-1 text-xs leading-relaxed text-bvc-secondary">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-xs text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bvc-peach/30 text-bvc-red">
                <MessageCircle className="h-7 w-7" />
              </div>
              <p className="text-sm font-extrabold text-bvc-text">Start the BVC conversation</p>
              <p className="mt-1 text-xs leading-relaxed text-bvc-secondary">
                Trip plans, updates, photos to come later, and all the random memories in one place.
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender.toLocaleLowerCase('en-IN') === userName.toLocaleLowerCase('en-IN');
              const previous = messages[index - 1];
              const showDate = !previous || formatMessageDate(previous.created_at) !== formatMessageDate(message.created_at);
              const showSender = !isOwn && (!previous || previous.sender !== message.sender || showDate);

              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold text-bvc-muted shadow-sm">
                        {formatMessageDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                    data-chat-message-id={message.id}
                    data-chat-message-sender={message.sender}
                  >
                    <div
                      className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 shadow-sm ${isOwn
                        ? 'rounded-br-md bg-gradient-to-br from-bvc-red to-bvc-deepRed text-white'
                        : 'rounded-bl-md border border-cream-300 bg-white text-bvc-text'
                      }`}
                    >
                      {showSender && (
                        <p className="mb-1 text-[10px] font-extrabold text-bvc-red">{message.sender}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{message.content}</p>
                      <div className={`mt-1 text-right text-[9px] ${isOwn ? 'text-white/70' : 'text-bvc-muted'}`}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                    {isOwn && (seenByMessage[message.id]?.length || 0) > 0 && (
                      <div className="relative mt-1 flex flex-col items-end pr-1">
                        <button
                          type="button"
                          onClick={() => setExpandedReceiptMessageId((current) => current === message.id ? null : message.id)}
                          aria-label={`View people who saw this message: ${seenByMessage[message.id].map((receipt) => receipt.reader).join(', ')}`}
                          aria-expanded={expandedReceiptMessageId === message.id}
                          className="flex items-center rounded-full py-0.5 transition-opacity hover:opacity-80"
                        >
                          <span className="flex items-center pl-1">
                            {seenByMessage[message.id].slice(0, 6).map((receipt) => {
                              const profile = findProfileByName(receipt.reader);
                              return (
                                <span
                                  key={receipt.reader}
                                  className="-ml-1.5 flex h-[19px] w-[19px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-bvc-peach/50 shadow-sm"
                                  title={`Seen by ${receipt.reader} · ${formatMessageTime(receipt.readAt)}`}
                                >
                                  {profile ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-[7px] font-black text-bvc-text">{receipt.reader.slice(0, 1).toUpperCase()}</span>
                                  )}
                                </span>
                              );
                            })}
                          </span>
                        </button>
                        {expandedReceiptMessageId === message.id && (
                          <div className="mt-1.5 min-w-36 rounded-xl border border-cream-300 bg-white p-2 shadow-lg">
                            {seenByMessage[message.id].map((receipt) => {
                              const profile = findProfileByName(receipt.reader);
                              return (
                                <div key={receipt.reader} className="flex items-center gap-2 py-1">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bvc-peach/50">
                                    {profile ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-[8px] font-bold">{receipt.reader.slice(0, 1).toUpperCase()}</span>
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-bvc-text">{receipt.reader}</span>
                                  <span className="shrink-0 text-[9px] text-bvc-muted">{formatMessageTime(receipt.readAt)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}

          <div ref={bottomRef} />
        </section>

        {error && messages.length > 0 && (
          <p role="alert" className="px-1 pt-1 text-[11px] font-medium text-bvc-error">{error}</p>
        )}

        {typingMembers.length > 0 && (
          <div className="mb-1 flex min-h-8 items-center gap-2 px-2" aria-live="polite">
            <div className="flex items-center pl-1">
              {typingMembers.slice(0, 3).map((member) => {
                const profile = findProfileByName(member);
                return (
                  <span key={member} className="-ml-1.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-bvc-bg bg-bvc-peach/50">
                    {profile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-extrabold text-bvc-text">{member.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-semibold text-bvc-secondary">
                {typingMembers.length === 1
                  ? `${typingMembers[0]} is typing`
                  : typingMembers.length === 2
                    ? `${typingMembers[0]} and ${typingMembers[1]} are typing`
                    : `${typingMembers.length} people are typing`}
              </span>
              <span className="flex items-center gap-0.5" aria-hidden="true">
                <span className="h-1 w-1 animate-bounce rounded-full bg-bvc-red [animation-delay:-0.2s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-bvc-red [animation-delay:-0.1s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-bvc-red" />
              </span>
            </div>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="mt-3 flex shrink-0 items-end gap-2 rounded-[22px] border border-cream-300 bg-white p-2 shadow-card"
        >
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              sendTypingSignal();
            }}
            onKeyDown={handleComposerKeyDown}
            onBlur={stopTypingSignal}
            placeholder="Message your friends…"
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={!currentMember || isLoadingMessages}
            aria-label="Write a group message"
            className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2.5 py-3 text-sm font-medium text-bvc-text outline-none placeholder:text-bvc-muted disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending || !currentMember}
            aria-label="Send message"
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bvc-red text-white shadow-sm transition-all hover:bg-bvc-deepRed active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-1.5 px-2 text-center text-[9px] text-bvc-muted">
          Enter to send · Shift + Enter for a new line
        </p>
      </main>
    </div>
  );
}
