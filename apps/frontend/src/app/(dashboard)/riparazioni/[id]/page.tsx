'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { riparazioniApi } from '@/lib/api';
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

interface Riparazione {
  id: number;
  idRiparazione: string;
  cartellino?: string;
  data: string;
  completa: boolean;
  dataChiusura?: string;
  laboratorio?: {
    id: number;
    nome: string;
  };
  reparto?: {
    id: number;
    nome: string;
  };
  linea?: {
    id: number;
    nome: string;
  };
  numerata?: {
    id: number;
    n01?: string;
    n02?: string;
    n03?: string;
    n04?: string;
    n05?: string;
    n06?: string;
    n07?: string;
    n08?: string;
    n09?: string;
    n10?: string;
    n11?: string;
    n12?: string;
    n13?: string;
    n14?: string;
    n15?: string;
    n16?: string;
    n17?: string;
    n18?: string;
    n19?: string;
    n20?: string;
  };
  user?: {
    id: number;
    nome: string;
    userName: string;
  };
  causale?: string;
  note?: string;
  qtaTotale: number;
  p01: number;
  p02: number;
  p03: number;
  p04: number;
  p05: number;
  p06: number;
  p07: number;
  p08: number;
  p09: number;
  p10: number;
  p11: number;
  p12: number;
  p13: number;
  p14: number;
  p15: number;
  p16: number;
  p17: number;
  p18: number;
  p19: number;
  p20: number;
}

export default function RiparazioneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [riparazione, setRiparazione] = useState<Riparazione | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    fetchRiparazione();
  }, [id]);

  const fetchRiparazione = async () => {
    try {
      setLoading(true);
      const data = await riparazioniApi.getRiparazione(parseInt(id));
      setRiparazione(data);
    } catch (error) {
      showError('Errore nel caricamento della riparazione');
      router.push('/riparazioni/list');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!riparazione) return;

    try {
      setCompleting(true);
      await riparazioniApi.completeRiparazione(riparazione.id);
      showSuccess('Riparazione completata con successo');
      setShowCompleteModal(false);
      await fetchRiparazione();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nel completamento della riparazione');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
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

  if (!riparazione) {
    return null;
  }

  // Build taglie array
  const taglie: Array<{ nome: string; qta: number }> = [];
  for (let i = 1; i <= 20; i++) {
    const pField = `p${String(i).padStart(2, '0')}` as keyof Riparazione;
    const nField = `n${String(i).padStart(2, '0')}` as keyof typeof riparazione.numerata;
    const qta = riparazione[pField] as number;
    const nome = riparazione.numerata?.[nField] || `T${i}`;

    if (qta > 0) {
      taglie.push({ nome: String(nome), qta });
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title={`Riparazione ${riparazione.idRiparazione}`}
        subtitle={riparazione.cartellino ? `Cartellino: ${riparazione.cartellino}` : ''}
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Riparazioni', href: '/riparazioni' },
          { label: 'Archivio', href: '/riparazioni/list' },
          { label: riparazione.idRiparazione },
        ]}
      />

      {/* Header Actions */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Stato:</span>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  !riparazione.completa
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {riparazione.completa ? (
                  <>
                    <i className="fas fa-check-circle mr-2"></i>
                    Completata
                  </>
                ) : (
                  <>
                    <i className="fas fa-clock mr-2"></i>
                    Aperta
                  </>
                )}
              </span>
            </div>
            {riparazione.completa && riparazione.dataChiusura && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Chiusa il: {new Date(riparazione.dataChiusura).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!riparazione.completa && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <i className="fas fa-check-circle mr-2"></i>
                Completa Riparazione
              </button>
            )}
            <button
              onClick={() => router.push('/riparazioni/list')}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Torna all'archivio
            </button>
          </div>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <i className="fas fa-info-circle text-blue-500 mr-2"></i>
          Informazioni Riparazione
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              ID Riparazione
            </div>
            <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
              {riparazione.idRiparazione}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Cartellino
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {riparazione.cartellino || '-'}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Data
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {new Date(riparazione.data).toLocaleDateString('it-IT')}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              <i className="fas fa-flask mr-1"></i>
              Laboratorio
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {riparazione.laboratorio?.nome || '-'}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              <i className="fas fa-industry mr-1"></i>
              Reparto
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {riparazione.reparto?.nome || '-'}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              <i className="fas fa-stream mr-1"></i>
              Linea
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {riparazione.linea?.nome || '-'}
            </div>
          </div>

          {riparazione.user && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-user mr-1"></i>
                Utente
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {riparazione.user.nome}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
              <i className="fas fa-boxes mr-1"></i>
              Quantità Totale
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {riparazione.qtaTotale}
            </div>
          </div>
        </div>

        {riparazione.causale && (
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <i className="fas fa-exclamation-circle text-orange-500 mr-2"></i>
              Causale
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {riparazione.causale}
              </p>
            </div>
          </div>
        )}

        {riparazione.note && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <i className="fas fa-sticky-note text-yellow-500 mr-2"></i>
              Note
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {riparazione.note}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Taglie Card */}
      {taglie.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <i className="fas fa-ruler text-blue-500 mr-2"></i>
            Taglie da Riparare
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {taglie.map((taglia, index) => (
              <div
                key={index}
                className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20 text-center"
              >
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  {taglia.nome}
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {taglia.qta}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <span className="text-sm text-gray-600 dark:text-gray-400">Totale: </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {riparazione.qtaTotale} paia
            </span>
          </div>
        </motion.div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <i className="fas fa-check-circle text-xl text-green-600 dark:text-green-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Completa Riparazione</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Conferma il completamento</p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Sei sicuro di voler segnare questa riparazione come completata?
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                La riparazione <span className="font-mono font-bold">{riparazione.idRiparazione}</span> verrà chiusa e non sarà più modificabile.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={completing}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {completing ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Completamento...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle mr-2"></i>
                    Completa
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
