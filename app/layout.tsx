import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Find The Treasure',
  description: 'A two-player distance-only treasure hunt. Hide a location, share a code, and let your friend find it with only distance as a clue.',
  openGraph: {
    title: 'Find The Treasure',
    description: 'A two-player distance-only treasure hunt. Hide a location, share a code, and let your friend find it with only distance as a clue.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Find The Treasure',
    description: 'A two-player distance-only treasure hunt. Hide a location, share a code, and let your friend find it with only distance as a clue.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
