/**
 * Shared Authorization & Privilege Helpers
 * Safe for both Client and Server execution.
 */

export const ORGANIZER_NAME = 'Chetan K';

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

