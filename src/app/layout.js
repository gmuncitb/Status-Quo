import { Newsreader, Roboto } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: "Status Quo — GMUNC",
  description:
    'A monthly macro-recap of critical world news by GMUNC. Covers international relations, global political economies, and security frameworks across seven key regions.',
  openGraph: {
    title: 'Status Quo — GMUNC',
    description: 'A monthly macro-recap of critical world news by GMUNC.',
    url: 'https://statusquo.gmunc-itb.workers.dev',
    siteName: 'Status Quo',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Status Quo — GMUNC',
    description: 'A monthly macro-recap of critical world news by GMUNC.',
  },
  icons: {
    icon: '/gmunc-logo.png',
  },
  other: {
    'theme-color': '#f8f8fa',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
