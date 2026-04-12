import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">🗺️</div>
      <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
      <p className="text-slate-400 text-sm">This treasure doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
      >
        Back to Home
      </Link>
    </main>
  );
}
