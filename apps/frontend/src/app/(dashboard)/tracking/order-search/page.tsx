'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Footer from '@/components/layout/Footer';

interface CartelloResult {
  id: number;
  cartellino: string;
  valid: boolean;
  commessa?: string;
  modello?: string;
  descrizione?: string;
  cliente?: string;
  paia?: number;
}

export default function OrderSearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CartelloResult[]>([]);

  // Keep focus on input after loading completes
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleVerify = async () => {
    const cartel = inputValue.trim();

    if (!cartel || !/^\d+$/.test(cartel)) {
      showError('Inserisci un numero cartellino valido');
      return;
    }

    // Check if already exists
    if (results.some(r => r.cartellino === cartel)) {
      showError('Cartellino già inserito');
      setInputValue('');
      return;
    }

    setLoading(true);

    try {
      const result = await trackingApi.checkCartel(cartel);
      const newResult: CartelloResult = result.valid && result.data
        ? {
            id: result.data.id || parseInt(cartel),
            cartellino: cartel,
            valid: true,
            commessa: result.data.commessa,
            modello: result.data.modello,
            descrizione: result.data.descrizione,
            cliente: result.data.cliente,
            paia: result.data.paia || result.data.tot,
          }
        : {
            id: parseInt(cartel),
            cartellino: cartel,
            valid: false,
          };

      setResults(prev => [...prev, newResult]);
      setInputValue('');
    } catch {
      setResults(prev => [...prev, {
        id: parseInt(cartel),
        cartellino: cartel,
        valid: false,
      }]);
      setInputValue('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    }
  };

  const removeResult = (cartellino: string) => {
    setResults(prev => prev.filter(r => r.cartellino !== cartellino));
  };

  const validResults = useMemo(() => results.filter(r => r.valid), [results]);
  const invalidResults = useMemo(() => results.filter(r => !r.valid), [results]);

  const totalPaia = useMemo(() => {
    return validResults.reduce((sum, r) => sum + (r.paia || 0), 0);
  }, [validResults]);

  const handleProceed = () => {
    if (validResults.length === 0) {
      showError('Nessun cartellino valido');
      return;
    }
    sessionStorage.setItem('selectedCartelli', JSON.stringify(validResults.map(r => r.id)));
    router.push('/tracking/process-links');
  };

  const handleClear = () => {
    setResults([]);
    setInputValue('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      <PageHeader
        title="Inserimento Manuale Cartellini"
        subtitle="Inserisci i cartellini separati da invio, virgola o spazio"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Inserimento Manuale' },
        ]}
      />

      {/* Input Area */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Inserisci cartellino e premi Invio
        </label>
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="12345678"
            disabled={loading}
            autoFocus
            className="flex-1 px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
          />
          {loading && <i className="fas fa-spinner fa-spin text-blue-500 text-xl"></i>}
          {results.length > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <i className="fas fa-eraser mr-2"></i>Pulisci
            </button>
          )}
        </div>
      </div>

      {/* Valid Results */}
      {validResults.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-check-circle text-green-500"></i>
            Cartellini Validi ({validResults.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {validResults.map(item => (
              <div
                key={item.cartellino}
                className="relative p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              >
                <button
                  onClick={() => removeResult(item.cartellino)}
                  className="absolute top-2 right-2 p-1 text-green-600 hover:text-red-500 transition"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
                <div className="font-bold text-lg text-green-800 dark:text-green-300">
                  {item.cartellino}
                </div>
                {item.commessa && (
                  <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                    <span className="text-green-600 dark:text-green-500">Commessa:</span> {item.commessa}
                  </div>
                )}
                {item.modello && (
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <span className="text-green-600 dark:text-green-500">Articolo:</span> {item.modello}
                  </div>
                )}
                {item.cliente && (
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <span className="text-green-600 dark:text-green-500">Cliente:</span> {item.cliente}
                  </div>
                )}
                {item.paia !== undefined && (
                  <div className="text-sm font-medium text-green-800 dark:text-green-300 mt-1">
                    <span className="text-green-600 dark:text-green-500">Paia:</span> {item.paia}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invalid Results */}
      {invalidResults.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-times-circle text-red-500"></i>
            Cartellini Non Validi ({invalidResults.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {invalidResults.map(item => (
              <div
                key={item.cartellino}
                className="relative p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center"
              >
                <button
                  onClick={() => removeResult(item.cartellino)}
                  className="absolute top-1 right-1 p-1 text-red-400 hover:text-red-600 transition"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
                <div className="font-bold text-red-800 dark:text-red-300">
                  {item.cartellino}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Non trovato
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer show={results.length > 0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Validi:</span>{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">{validResults.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Non validi:</span>{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">{invalidResults.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Totale paia:</span>{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">{totalPaia}</span>
            </div>
          </div>
          <button
            onClick={handleProceed}
            disabled={validResults.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-arrow-right mr-2"></i>
            Procedi ({validResults.length})
          </button>
        </div>
      </Footer>
    </motion.div>
  );
}
