/**
 * Centralized Typed Configuration for BVC Trip Friend Profiles
 * Contains canonical names, Cloudinary photos, and playful greetings.
 */

export interface FriendProfile {
  name: string;
  aliases: string[];
  photoUrl: string;
  message: string;
  initials: string;
  tagline?: string;
  isAbsent?: boolean;
}

export const FRIEND_PROFILES: FriendProfile[] = [
  {
    name: 'Chetan K',
    aliases: ['chetan k', 'chetan', 'chethan k', 'chethan'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/CHETHAN_o38wnn.png',
    message: "Haha, that's you, Chetan! 😎",
    initials: 'CK',
  },
  {
    name: 'Rohith',
    aliases: ['rohith', 'rohit'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/ROHTIH_n0co1m.png',
    message: 'Ayy Rohith, caught you! 😂',
    initials: 'RO',
  },
  {
    name: 'Dharma',
    aliases: ['dharma'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/DHARMA_o7zets.jpg',
    message: "Dharma spotted! That's you! 😄",
    initials: 'DH',
  },
  {
    name: 'Adithi',
    aliases: ['adithi', 'aditi'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/Adithi_hxtfpc.png',
    message: 'Hehe, Adithi found herself! 💖',
    initials: 'AD',
  },
  {
    name: 'Harshitha',
    aliases: ['harshitha', 'harshita', 'harsh'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/HARSH_g9rhfa.png',
    message: 'Harshitha, no hiding now! 😆',
    initials: 'HA',
  },
  {
    name: 'Vyshnavi',
    aliases: ['vyshnavi', 'vaishnavi', 'vysh', 'vyshh'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307425/VYSH_pghbo8.png',
    message: 'We miss you Vyshh! 🥺❤️',
    tagline: 'WE MISS YOU VYSHH',
    initials: 'VY',
    isAbsent: true,
  },
  {
    name: 'Lavanya',
    aliases: ['lavanya', 'lav'],
    photoUrl: 'https://res.cloudinary.com/dccnccjgr/image/upload/v1793307424/LAVANYA_pmkkjk.jpg',
    message: 'Lavanya, we found you! 🫶',
    initials: 'LA',
  },
];

/**
 * Finds a profile matching the entered string case-insensitively.
 * Matches complete names or known aliases after trimming whitespace.
 */
export function findProfileByName(input?: string | null): FriendProfile | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  return (
    FRIEND_PROFILES.find(
      (p) =>
        p.name.toLowerCase() === clean ||
        p.aliases.some((alias) => alias.toLowerCase() === clean)
    ) || null
  );
}

