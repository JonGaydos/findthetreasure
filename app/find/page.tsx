'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FindPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed.startsWith('FTT-')) {
      setError('Invalid code. Share codes start with FTT-');
      return;
    }

    setLoading(true);
    setError(null);

    // Validate the code by calling guess with a dummy location to check decryption
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: trimmed, guessLat: 0, guessLng: 0, guessCount: 0 }),
      });
      if (!res.ok) {
        setError('Invalid or expired code. Please check and try again.');
        return;
      }
      // Code is valid — clear old game state and start fresh
      const keys = ['ftt_shareCode','ftt_guesses','ftt_unit','ftt_circlesVisible','ftt_hintUnlocked','ftt_hint','ftt_gameOver','ftt_treasureLat','ftt_treasureLng'];
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('ftt_shareCode', trimmed);
      router.push('/play');
    } catch {
      setError('Could not validate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-1">Find a Treasure</h1>
        <p className="text-slate-400 text-sm">Enter the code shared by the Hider</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <Label htmlFor="code-input" className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
            Share Code
          </Label>
          <Input
            id="code-input"
            placeholder="FTT-..."
            value={code}
            onChange={e => { setCode(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            className="bg-slate-900 border-blue-700 text-yellow-400 font-mono text-lg text-center placeholder:text-slate-600 placeholder:font-sans placeholder:text-sm tracking-wider"
            autoFocus
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button
          onClick={handleStart}
          disabled={!code.trim() || loading}
          className="w-full bg-green-700 hover:bg-green-600 text-white disabled:opacity-40 py-5 text-base"
        >
          {loading ? 'Validating...' : 'Start Hunting →'}
        </Button>

        <button
          onClick={() => router.push('/')}
          className="text-slate-500 hover:text-slate-300 text-sm text-center"
        >
          ← Back
        </button>
      </div>
    </main>
  );
}
