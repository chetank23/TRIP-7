export interface DailyRoast {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const COUNTDOWN_ROASTS: Record<number, DailyRoast> = {
  10: {
    title: '🚨 BVC LAZY SQUAD!',
    body: '10 days to Goa! Some people have not even opened their bags. Are you planning to pack at the railway station? 😂',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  9: {
    title: '🌴 9 DAYS LEFT, PEOPLE!',
    body: 'Goa is getting closer. Your shopping list is longer than your actual preparation. Please behave like responsible adults. 🤣',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  8: {
    title: '📢 ATTENTION, BVC!',
    body: '8 days left! Charge your power banks, find your sunglasses and stop saying “I will do it tomorrow”. 😭',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  7: {
    title: '🔥 ONE WEEK TO GO!',
    body: '7 days! Whoever still has not planned their packing deserves to travel with one toothbrush for the whole group. 😂',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  6: {
    title: '🚨 PACKING INSPECTION!',
    body: '6 days left. Suitcase status: empty. Excitement status: unlimited. Common-sense status: still loading. 🤡',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  5: {
    title: '🧳 BVC, GET YOUR LIFE TOGETHER!',
    body: '5 days to go! Check your tickets, chargers and wallet. We cannot afford a “bro, I forgot” episode. 😂',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  4: {
    title: '🌊 GOA IS CALLING!',
    body: '4 days! Start sleeping on time. The group cannot wait 45 minutes because one legend cannot wake up. 😭',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  3: {
    title: '⚠️ THREE-DAY WARNING!',
    body: '3 days left! Keep your bags ready and your excuses at home. The BVC attendance register will be strict. 😂',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  2: {
    title: '🚨 FINAL PACKING ALERT!',
    body: '2 days! If you are still deciding what to wear, just bring the whole cupboard. We are not waiting. 🤣',
    url: '/',
    tag: 'bvc-daily-roast',
  },
  1: {
    title: '🔥 TOMORROW IS THE DAY!',
    body: 'One more sleep! Bags packed? Chargers ready? Please do not become the reason seven friends miss the trip. 😭',
    url: '/',
    tag: 'bvc-daily-roast',
  },
};

export function getDailyRoast(date: string): DailyRoast | null {
  if (!/^2026-11-(0[1-9]|1[01])$/.test(date)) return null;

  if (date === '2026-11-11') {
    return {
      title: '🔥 BVC, IT IS GO TIME!',
      body: 'GOA IS WAITING! Get up, get ready and reach on time. Whoever is late owes everyone breakfast. 😂🌴',
      url: '/',
      tag: 'bvc-trip-day',
    };
  }

  const day = Number(date.slice(-2));
  const daysRemaining = 11 - day;
  return COUNTDOWN_ROASTS[daysRemaining] || null;
}
