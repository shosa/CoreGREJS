'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface InputState {
  value: string;
  status: 'empty' | 'loading' | 'valid' | 'invalid';
  data?: any;
}

const GRID_SIZE = 30;

export default function OrderSearchPage() {
  const router = useRouter();
  const [inputs, setInputs] = useState<InputState[]>(
    Array(GRID_SIZE).fill(null).map(() => ({ value: '', status: 'empty' }))
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const checkCartel = useCallback(async (index: number, value: string) => {
    if (!value.trim()) {
      setInputs(prev => {
        const updated = [...prev];
        updated[index] = { value: '', status: 'empty' };
        return updated;
      });
      return;
    }

    setInputs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'loading' };
      return updated;
    });

    try {
      const result = await trackingApi.checkCartel(value.trim());
      setInputs(prev => {
        const updated = [...prev];
        updated[index] = {
          value: value.trim(),
          status: result.valid ? 'valid' : 'invalid',
          data: result.data,
        };
        return updated;
      });
    } catch {
      setInputs(prev => {
        const updated = [...prev];
        updated[index] = { value: value.trim(), status: 'invalid' };
        return updated;
      });
    }
  }, []);

  const handleInputChange = (index: number, value: string) => {
    setInputs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  };

  const handleInputBlur = (index: number) => {
    const value = inputs[index].value;
    if (value.trim()) {
      checkCartel(index, value);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      checkCartel(index, inputs[index].value);
      // Move to next input
      const nextIndex = index + 1;
      if (nextIndex < GRID_SIZE) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
  };

  const getValidCartelli = () => {
    return inputs
      .filter(input => input.status === 'valid' && input.data?.id)
      .map(input => input.data.id);
  };

  const handleProceed = () => {
    const validCartelli = getValidCartelli();
    if (validCartelli.length === 0) {
      showError('Nessun cartellino valido selezionato');
      return;
    }
    // Store in sessionStorage and redirect
    sessionStorage.setItem('selectedCartelli', JSON.stringify(validCartelli));
    router.push('/tracking/process-links');
  };

  const handleClear = () => {
    setInputs(Array(GRID_SIZE).fill(null).map(() => ({ value: '', status: 'empty' })));
  };

  const validCount = inputs.filter(i => i.status === 'valid').length;
  const invalidCount = inputs.filter(i => i.status === 'invalid').length;

  const getInputClass = (status: string) => {
    switch (status) {
      case 'valid':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'invalid':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'loading':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-300 dark:border-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Inserimento Manuale Cartellini"
        subtitle="Inserisci fino a 30 cartellini con verifica real-time"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Inserimento Manuale' },
        ]}
      />

      {/* Status Bar */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Validi: {validCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Non validi: {invalidCount}</span>
        </div>
        <div className="flex-1"></div>
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <i className="fas fa-eraser mr-2"></i>
          Pulisci Tutto
        </button>
        <button
          onClick={handleProceed}
          disabled={validCount === 0}
          className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-arrow-right mr-2"></i>
          Procedi ({validCount})
        </button>
      </div>

      {/* Input Grid */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
        <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-3">
          {inputs.map((input, index) => (
            <div key={index} className="relative">
              <input
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                value={input.value}
                onChange={e => handleInputChange(index, e.target.value)}
                onBlur={() => handleInputBlur(index)}
                onKeyDown={e => handleKeyDown(index, e)}
                placeholder={`${index + 1}`}
                className={`w-full px-3 py-2 text-sm text-center border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition ${getInputClass(input.status)}`}
              />
              {input.status === 'loading' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <i className="fas fa-spinner fa-spin text-blue-500 text-xs"></i>
                </div>
              )}
              {input.status === 'valid' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <i className="fas fa-check text-green-500 text-xs"></i>
                </div>
              )}
              {input.status === 'invalid' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <i className="fas fa-times text-red-500 text-xs"></i>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview of valid cartellini */}
      {validCount > 0 && (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Cartellini Validi ({validCount})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {inputs
              .filter(i => i.status === 'valid' && i.data)
              .map((input, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                >
                  <div className="font-bold text-green-800 dark:text-green-300">
                    {input.value}
                  </div>
                  {input.data?.commessa && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {input.data.commessa}
                    </div>
                  )}
                  {input.data?.modello && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {input.data.modello}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
