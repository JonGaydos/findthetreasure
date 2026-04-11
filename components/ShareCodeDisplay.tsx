'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  shareCode: string;
}

export default function ShareCodeDisplay({ shareCode }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text manually
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-900 border border-dashed border-yellow-500/40 rounded-lg">
      <p className="text-slate-400 text-xs uppercase tracking-wide">Share Code</p>
      <p className="font-mono text-yellow-400 text-sm break-all leading-relaxed select-all">
        {shareCode}
      </p>
      <Button
        onClick={handleCopy}
        variant="outline"
        size="sm"
        className="w-full border-slate-600 text-slate-300 hover:text-white"
      >
        {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
      </Button>
      <p className="text-slate-500 text-xs">
        Share this code with the Seeker via text, Discord, etc.
      </p>
    </div>
  );
}
