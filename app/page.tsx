'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [hasActiveGame, setHasActiveGame] = useState(false);

  useEffect(() => {
    const code = localStorage.getItem('ftt_shareCode');
    const gameOver = localStorage.getItem('ftt_gameOver');
    setHasActiveGame(!!code && !gameOver);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <h1 className="text-3xl font-bold text-white mb-2">Find The Treasure</h1>
        <p className="text-slate-400 text-sm">A distance-only treasure hunt</p>
      </div>

      <div className="flex gap-4 w-full max-w-md">
        <Link
          href="/hide"
          className="flex-1 flex flex-col items-center gap-3 p-6 text-center bg-slate-900 border-2 border-blue-700 hover:border-blue-500 active:border-blue-400 rounded-xl transition-colors"
        >
          <span className="text-4xl">📦</span>
          <span className="text-blue-300 font-semibold">Hide a Treasure</span>
          <span className="text-slate-500 text-xs">Pick a location &amp; share the code</span>
        </Link>

        <Link
          href="/find"
          className="flex-1 flex flex-col items-center gap-3 p-6 text-center bg-slate-900 border-2 border-green-700 hover:border-green-500 active:border-green-400 rounded-xl transition-colors"
        >
          <span className="text-4xl">🔍</span>
          <span className="text-green-300 font-semibold">Find a Treasure</span>
          <span className="text-slate-500 text-xs">Enter a code &amp; start searching</span>
        </Link>
      </div>

      {hasActiveGame && (
        <Link
          href="/play"
          className="px-4 py-2 rounded-md border border-slate-600 text-slate-300 hover:text-white text-sm transition-colors"
        >
          ▶ Resume Active Game
        </Link>
      )}
    </main>
  );
}
