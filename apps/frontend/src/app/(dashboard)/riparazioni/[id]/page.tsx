'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { riparazioniApi, jobsApi } from '@/lib/api';
import Footer from '@/components/layout/Footer';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!riparazione) return;
    try {
      setDeleting(true);
      await riparazioniApi.deleteRiparazione(riparazione.id);
      showSuccess('Riparazione eliminata');
      setShowDeleteModal(false);
      router.push('/riparazioni/list');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore durante la eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = async () => {
    if (!riparazione) return;
    try {
      setPrinting(true);
      await jobsApi.enqueue('riparazioni.cedola-pdf', { id: riparazione.id });
      showSuccess('Il lavoro è stato messo in coda.');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nella stampa');
    } finally {
      setPrinting(false);
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
  const taglie: Array<{ field: string; nome: string; qta: number }> = [];
  for (let i = 1; i <= 20; i++) {
    const pField = `p${String(i).padStart(2, '0')}` as keyof Riparazione;
    const nField = `n${String(i).padStart(2, '0')}` as keyof typeof riparazione.numerata;
    const qta = riparazione[pField] as number;
    const nome = riparazione.numerata?.[nField] || `T${i}`;

    if (nome && String(nome).trim() !== '') {
      taglie.push({ field: pField, nome: String(nome), qta });
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Informazioni Riparazione
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Riparazione</div>
            <div className="text-base font-mono font-semibold text-gray-900 dark:text-white">
              {riparazione.idRiparazione}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cartellino</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {riparazione.cartellino || '-'}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data Creazione</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {new Date(riparazione.data).toLocaleDateString('it-IT')}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantità Totale</div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400">
              {riparazione.qtaTotale} paia
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Laboratorio</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {riparazione.laboratorio?.nome || '-'}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reparto</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {riparazione.reparto?.nome || '-'}
            </div>
          </div>

          {riparazione.user && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Creato da</div>
              <div className="text-base font-semibold text-gray-900 dark:text-white">
                {riparazione.user.nome}
              </div>
            </div>
          )}
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
            Taglie Riparazione
          </h3>

          {/* Tabella Taglie - 2 righe: ID Taglia, Qta Riparazione */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-28" />
                {taglie.map((taglia) => (
                  <col key={`col-${taglia.field}`} className="w-12" />
                ))}
              </colgroup>
              <tbody>
                {/* Riga 1: ID Taglia */}
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 sticky left-0 z-10">
                    ID Taglia
                  </td>
                  {taglie.map((taglia) => (
                    <td
                      key={`nome-${taglia.field}`}
                      className="py-2 px-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50"
                    >
                      {taglia.nome}
                    </td>
                  ))}
                </tr>

                {/* Riga 2: Qta Riparazione */}
                <tr>
                  <td className="py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 sticky left-0 z-10">
                    Qta Riparazione
                  </td>
                  {taglie.map((taglia) => (
                    <td
                      key={`qta-${taglia.field}`}
                      className="py-2 px-1 text-center text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20"
                    >
                      {taglia.qta}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Totale:</span>
            <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <i className="fas fa-exclamation-triangle text-xl text-red-600 dark:text-red-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Elimina Riparazione</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Conferma eliminazione</p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Sei sicuro di voler eliminare definitivamente questa riparazione?
              </p>
              <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                La riparazione <span className="font-mono">{riparazione.idRiparazione}</span> verrà eliminata permanentemente e non potrà essere recuperata.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    Elimina
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Footer show>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Riparazione {riparazione.idRiparazione} • Cartellino {riparazione.cartellino || '-'}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-3 rounded-lg border-2 border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <i className="fas fa-trash mr-2"></i>
              Elimina
            </button>
            {!riparazione.completa && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="px-5 py-3 rounded-lg border-2 border-green-300 text-green-700 dark:border-green-700 dark:text-green-300 font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition"
              >
                <i className="fas fa-check-circle mr-2"></i>
                Completa
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={printing}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
            >
              {printing ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-print mr-2"></i>}
              Stampa
            </button>
          </div>
        </div>
      </Footer>
    </motion.div>
  );
}
