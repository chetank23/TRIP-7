/**
 * Shared Authorization & Privilege Helpers
 * Safe for both Client and Server execution.
 */

export const ORGANIZER_NAME = 'Chetan K';
export const ORGANIZER_PASSWORD = '0923';
export const ORGANIZER_VERIFIED_KEY = 'bvc_organizer_verified';

export function isOrganizer(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === 'chetan k' ||
    n === 'chetan' ||
    n === 'chethan k' ||
    n === 'chethan' ||
    n.startsWith('chetan') ||
    n.startsWith('chethan')
  );
}

export function verifyOrganizerPassword(password: string): boolean {
  return password.trim() === ORGANIZER_PASSWORD;
}

export function isOrganizerVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ORGANIZER_VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOrganizerVerified(verified: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (verified) {
      localStorage.setItem(ORGANIZER_VERIFIED_KEY, 'true');
    } else {
      localStorage.removeItem(ORGANIZER_VERIFIED_KEY);
    }
  } catch {}
}
