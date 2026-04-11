'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();
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
        <Card
          className="flex-1 bg-slate-900 border-2 border-blue-700 hover:border-blue-500 cursor-pointer transition-colors"
          onClick={() => router.push('/hide')}
        >
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-4xl">📦</span>
            <h2 className="text-blue-300 font-semibold">Hide a Treasure</h2>
            <p className="text-slate-500 text-xs">Pick a location &amp; share the code</p>
          </CardContent>
        </Card>

        <Card
          className="flex-1 bg-slate-900 border-2 border-green-700 hover:border-green-500 cursor-pointer transition-colors"
          onClick={() => router.push('/find')}
        >
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-4xl">🔍</span>
            <h2 className="text-green-300 font-semibold">Find a Treasure</h2>
            <p className="text-slate-500 text-xs">Enter a code &amp; start searching</p>
          </CardContent>
        </Card>
      </div>

      {hasActiveGame && (
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white"
          onClick={() => router.push('/play')}
        >
          ▶ Resume Active Game
        </Button>
      )}
    </main>
  );
}
