'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Si è verificato un errore</h1>
      <p className="mt-4 text-gray-600">{error.message || 'Errore del server'}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Riprova
      </button>
    </div>
  );
}
