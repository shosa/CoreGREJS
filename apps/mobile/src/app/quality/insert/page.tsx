'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { mobileApi, qualityApi } from '@/lib/api';

export default function InsertQualityPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [cartellino, setCartellino] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const handleCheckCartellino = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cartellino.trim()) {
      setError('Inserisci un numero di cartellino');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check cartellino tramite mobile API
      const checkResponse = await mobileApi.checkData('cartellino', cartellino);

      if (checkResponse.status === 'success' && checkResponse.exists) {
        // Cartellino trovato, vai alla pagina di controllo
        router.push(`/quality/control?cartellino=${cartellino}`);
      } else {
        setError(checkResponse.message || 'Cartellino non trovato');
      }
    } catch (err: any) {
      console.error('Error checking cartellino:', err);
      setError(err.response?.data?.message || 'Errore nella verifica del cartellino');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md z-50">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.push('/quality')}
            className="p-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Inserisci Controllo</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-6 px-4">
        {/* Instructions Card */}
        <div className="card-mobile p-6 mb-6">
          <div className="flex items-start space-x-3 mb-4">
            <div className="bg-green-100 text-green-600 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-2">Come procedere</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Inserisci il numero del cartellino</li>
                <li>Verifica i dati del cartellino</li>
                <li>Compila il controllo qualità</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Cartellino Input Form */}
        <div className="card-mobile p-6">
          <form onSubmit={handleCheckCartellino} className="space-y-4">
            <div>
              <label htmlFor="cartellino" className="block text-sm font-medium text-gray-700 mb-2">
                Numero Cartellino
              </label>
              <input
                type="text"
                id="cartellino"
                value={cartellino}
                onChange={(e) => setCartellino(e.target.value)}
                className="input-mobile"
                placeholder="Es: 12345"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Inserisci il numero del cartellino da controllare
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !cartellino.trim()}
              className="btn-mobile btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifica in corso...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Verifica Cartellino
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Footer con azione rapida */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex justify-center">
          <button
            onClick={() => router.push('/quality/summary')}
            className="bg-white rounded-lg shadow-sm px-4 py-2 hover:shadow-md transition-shadow flex items-center gap-2"
          >
            <div className="bg-green-100 text-green-600 rounded-full p-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Riepilogo Giornaliero</span>
          </button>
        </div>
      </div>
    </div>
  );
}
