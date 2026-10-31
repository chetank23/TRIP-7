export interface ChatReadMarker {
  id: string;
  created_at: string;
}

export function getChatNotificationStorageKeys(userName: string) {
  const memberKey = encodeURIComponent(userName.trim().toLocaleLowerCase('en-IN'));
  return {
    lastReadAt: `bvc_chat_last_read_at_v1:${memberKey}`,
    unreadIds: `bvc_chat_unread_ids_v1:${memberKey}`,
  };
}

export function readChatUnreadIds(userName: string): string[] {
  if (typeof window === 'undefined' || !userName) return [];
  try {
    const keys = getChatNotificationStorageKeys(userName);
    const parsed: unknown = JSON.parse(window.localStorage.getItem(keys.unreadIds) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeChatUnreadIds(userName: string, ids: string[]): void {
  if (typeof window === 'undefined' || !userName) return;
  try {
    const keys = getChatNotificationStorageKeys(userName);
    window.localStorage.setItem(keys.unreadIds, JSON.stringify(Array.from(new Set(ids)).slice(-100)));
  } catch {
    // Unread alerts remain best-effort when browser storage is unavailable.
  }
}

export function markChatMessagesRead(userName: string, messages: ChatReadMarker[]): void {
  if (typeof window === 'undefined' || !userName) return;

  const keys = getChatNotificationStorageKeys(userName);
  const latest = messages.reduce<ChatReadMarker | null>((current, message) => {
    if (!current || Date.parse(message.created_at) > Date.parse(current.created_at)) return message;
    return current;
  }, null);

  try {
    const existingLastReadAt = window.localStorage.getItem(keys.lastReadAt);
    if (
      latest &&
      existingLastReadAt &&
      Date.parse(existingLastReadAt) > Date.parse(latest.created_at)
    ) {
      return;
    }
    if (latest) window.localStorage.setItem(keys.lastReadAt, latest.created_at);
  } catch {
    // Continue clearing the local unread badge even if the read cursor cannot be saved.
  }

  writeChatUnreadIds(userName, []);
}
