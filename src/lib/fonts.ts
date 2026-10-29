import localFont from 'next/font/local';
import { Plus_Jakarta_Sans } from 'next/font/google';

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const remachineScript = localFont({
  src: '../../public/fonts/RemachineScript.ttf',
  variable: '--font-remachine',
  display: 'swap',
  fallback: ['cursive', 'system-ui'],
});

