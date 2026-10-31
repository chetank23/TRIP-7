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
import { Header } from '@/components/Header';
import { useTrip } from '@/lib/trip-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
  const [typingMember, setTypingMember] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setMessages((previous) => {
        if (!prepend) return incoming;
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
    if (!userName || !currentMember) {
      if (!isLoading && state) {
        setIsLoadingMessages(false);
        setError('This profile is not in the current trip member list. Ask the trip organizer to add it.');
      }
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

          setTypingMember(sender);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingMember(null), 1800);
        })
        .subscribe();

      channelRef.current = channel;
    }

    // Small fallback poll covers reconnects and missed realtime broadcasts.
    const poll = window.setInterval(() => {
      if (!document.hidden) void fetchMessages();
    }, 15000);

    return () => {
      window.clearInterval(poll);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (client && channel) {
        void client.removeChannel(channel);
      }
      channelRef.current = null;
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
    });
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

      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'message-created',
          payload: { id: sent.id },
        });
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
        <Header title="BVC Circle" showBack />
        <div className="flex min-h-[55vh] items-center justify-center text-bvc-secondary">
          <Loader2 className="h-6 w-6 animate-spin text-bvc-red" />
        </div>
      </div>
    );
  }

  if (!userName) return null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bvc-bg">
      <Header title="BVC Circle" subtitle="Your group's shared chat" showBack />

      <main className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[420px] w-full max-w-lg flex-1 flex-col px-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 sm:px-4">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-cream-300 bg-white/80 px-3.5 py-2.5 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bvc-redLight text-bvc-red">
              <MessageCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-bvc-text">BVC Friends</p>
              <p className="text-[10px] font-medium text-bvc-secondary">
                {state?.members?.length || 7} trip members
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live chat
          </span>
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
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
                  </div>
                </React.Fragment>
              );
            })
          )}

          {typingMember && (
            <div className="px-2 text-[11px] font-medium text-bvc-secondary">
              {typingMember} is typing…
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        {error && messages.length > 0 && (
          <p role="alert" className="px-1 pt-1 text-[11px] font-medium text-bvc-error">{error}</p>
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
