'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { exportApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Terzista {
  id: number;
  ragioneSociale: string;
}

export default function CreateDDTPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingProgressivo, setCheckingProgressivo] = useState(false);
  const [terzisti, setTerzisti] = useState<Terzista[]>([]);

  const [progressivo, setProgressivo] = useState('');
  const [progressivoEdited, setProgressivoEdited] = useState(false);
  const [progressivoValid, setProgressivoValid] = useState(true);
  const [terzistaId, setTerzistaId] = useState<number | null>(null);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [nextProg, terzistiData] = await Promise.all([
        exportApi.getNextProgressivo(),
        exportApi.getTerzisti(true)
      ]);

      setProgressivo(nextProg.progressivo);
      setTerzisti(terzistiData);
      setProgressivoValid(true);
    } catch (error) {
      showError('Errore nel caricamento dei dati iniziali');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressivoChange = async (value: string) => {
    setProgressivo(value);
    setProgressivoEdited(true);

    if (!value.trim()) {
      setProgressivoValid(false);
      return;
    }

    // Check if progressivo is free
    try {
      setCheckingProgressivo(true);
      const doc = await exportApi.getDocumentByProgressivo(value);
      // If we get here, document exists
      setProgressivoValid(false);
    } catch (error: any) {
      // 404 means progressivo is free
      if (error.response?.status === 404) {
        setProgressivoValid(true);
      } else {
        setProgressivoValid(false);
      }
    } finally {
      setCheckingProgressivo(false);
    }
  };

  const handleCreate = async () => {
    if (!terzistaId) {
      showError('Seleziona un terzista');
      return;
    }

    if (!progressivo.trim() || !progressivoValid) {
      showError('Progressivo non valido o già esistente');
      return;
    }

    try {
      setLoading(true);

      await exportApi.createDocument({
        progressivo,
        terzistaId: terzistaId!,
        data,
      });

      showSuccess('DDT creato con successo!');

      // Redirect to archive (lista documenti)
      router.push('/export/archive');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nella creazione del DDT');
    } finally {
      setLoading(false);
    }
  };

  if (loading && terzisti.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Nuovo DDT"
        subtitle="Creazione documento di trasporto"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Export', href: '/export' },
          { label: 'Nuovo DDT' },
        ]}
      />

      {/* Form */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm max-w-3xl mx-auto"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg mb-4">
            <i className="fas fa-file-alt text-white text-2xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Crea Nuovo DDT
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Compila i campi per creare un nuovo documento di trasporto
          </p>
        </div>

        <div className="space-y-6">
          {/* Progressivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Progressivo *
            </label>
            <div className="relative">
              <input
                type="text"
                value={progressivo}
                onChange={(e) => handleProgressivoChange(e.target.value)}
                placeholder="YYYYMMDD-NNN"
                className={`w-full px-4 py-3 rounded-lg border ${
                  progressivoEdited
                    ? progressivoValid
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingProgressivo ? (
                  <i className="fas fa-spinner fa-spin text-gray-400"></i>
                ) : progressivoEdited ? (
                  progressivoValid ? (
                    <i className="fas fa-check-circle text-green-500"></i>
                  ) : (
                    <i className="fas fa-times-circle text-red-500"></i>
                  )
                ) : null}
              </div>
            </div>
            {progressivoEdited && !progressivoValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Progressivo già esistente o non valido
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Puoi modificare il progressivo suggerito. Formato: YYYYMMDD-NNN
            </p>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data *
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Terzista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Terzista / Destinazione *
            </label>
            <select
              value={terzistaId || ''}
              onChange={(e) => setTerzistaId(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleziona un terzista...</option>
              {terzisti.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ragioneSociale}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={() => router.push('/export/archive')}
            className="px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <i className="fas fa-times mr-2"></i>
            Annulla
          </button>

          <button
            onClick={handleCreate}
            disabled={loading || !terzistaId || !progressivoValid || !progressivo.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creazione...
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle mr-2"></i>
                Crea DDT
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
