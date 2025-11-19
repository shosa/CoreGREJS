'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

// Color mapping for phases
const PHASE_COLORS: Record<string, { border: string; bg: string; text: string; input: string }> = {
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    input: 'focus:ring-blue-500',
  },
  green: {
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    input: 'focus:ring-green-500',
  },
  purple: {
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    input: 'focus:ring-purple-500',
  },
  orange: {
    border: 'border-orange-200 dark:border-orange-800',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    input: 'focus:ring-orange-500',
  },
  red: {
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    input: 'focus:ring-red-500',
  },
};

export default function ProduzioneNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [valori, setValori] = useState<any[]>([]);

  useEffect(() => {
    fetchRecord();
  }, [selectedDate]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const data = await produzioneApi.getByDate(selectedDate);
      setRecord(data);
      setValori(data.valori || []);
    } catch (error) {
      showError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (departmentId: number, field: 'valore' | 'note', value: any) => {
    setValori(prev => prev.map(v =>
      v.departmentId === departmentId
        ? { ...v, [field]: field === 'valore' ? (parseInt(value) || 0) : value }
        : v
    ));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await produzioneApi.saveByDate(selectedDate, { valori });
      showSuccess('Dati salvati con successo');
      router.push(`/produzione/${selectedDate}`);
    } catch (error) {
      showError('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Group valori by phase
  const groupedByPhase = valori.reduce((acc: any, v) => {
    const phaseName = v.department?.phase?.nome || 'Altro';
    const phaseColor = v.department?.phase?.colore || 'blue';
    const phaseIcon = v.department?.phase?.icona || 'fa-cog';
    const phaseOrder = v.department?.phase?.ordine || 0;

    if (!acc[phaseName]) {
      acc[phaseName] = {
        color: phaseColor,
        icon: phaseIcon,
        ordine: phaseOrder,
        departments: [],
      };
    }
    acc[phaseName].departments.push(v);
    return acc;
  }, {});

  // Sort phases by ordine
  const sortedPhases = Object.entries(groupedByPhase).sort(
    ([, a]: any, [, b]: any) => a.ordine - b.ordine
  );

  // Calculate totals
  const totalsByPhase: Record<string, number> = {};
  let totalProduzione = 0;

  sortedPhases.forEach(([phaseName, phase]: [string, any]) => {
    const phaseTotal = phase.departments.reduce((sum: number, v: any) => sum + (v.valore || 0), 0);
    totalsByPhase[phaseName] = phaseTotal;
    totalProduzione += phaseTotal;
  });

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {record?.isNew ? 'Nuova Produzione' : 'Modifica Produzione'}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Inserisci i dati di produzione
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {!record?.isNew && (
              <motion.button
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api'}/produzione/pdf/${selectedDate}`, {
                      headers: {
                        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('coregre-auth') || '{}').state?.token}`,
                      },
                    });
                    if (!response.ok) throw new Error('Errore generazione PDF');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  } catch (error) {
                    showError('Errore nella generazione del PDF');
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 shadow-md"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                PDF
              </motion.button>
            )}
            <Link href="/produzione">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Torna al Calendario
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">
              <i className="fas fa-home mr-2"></i>Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <Link href="/produzione" className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">
                Produzione
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Nuova</span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Date Picker Card */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-orange-200 bg-white p-6 shadow-lg dark:border-orange-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-md">
              <i className="fas fa-calendar-alt text-white text-lg"></i>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Produzione
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDateDisplay(selectedDate)}
            </p>
            {record && !record.isNew && (
              <p className="text-sm text-green-600 dark:text-green-400">
                <i className="fas fa-check-circle mr-1"></i>
                Record esistente
              </p>
            )}
            {record?.isNew && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                <i className="fas fa-plus-circle mr-1"></i>
                Nuovo record
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-12 w-12 rounded-full border-4 border-solid border-orange-500 border-t-transparent"
          />
        </div>
      ) : (
        <>
          {/* Totals Summary */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {sortedPhases.map(([phaseName, phase]: [string, any]) => {
              const colors = PHASE_COLORS[phase.color] || PHASE_COLORS.blue;
              return (
                <div key={phaseName} className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
                  <div className={`text-sm font-medium ${colors.text}`}>{phaseName}</div>
                  <div className={`text-2xl font-bold ${colors.text}`}>{totalsByPhase[phaseName]}</div>
                </div>
              );
            })}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Totale</div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalProduzione}</div>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit}>
            {/* Dynamic Phase Sections */}
            {sortedPhases.map(([phaseName, phase]: [string, any]) => {
              const colors = PHASE_COLORS[phase.color] || PHASE_COLORS.blue;
              return (
                <motion.div
                  key={phaseName}
                  variants={itemVariants}
                  className={`mb-6 rounded-2xl border ${colors.border} bg-white shadow-lg dark:bg-gray-800`}
                >
                  <div className={`p-4 border-b ${colors.border} ${colors.bg} rounded-t-2xl`}>
                    <h3 className={`text-lg font-semibold ${colors.text} flex items-center`}>
                      <i className={`fas ${phase.icon} mr-3`}></i>
                      {phaseName}
                    </h3>
                  </div>
                  <div className={`p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(phase.departments.length, 5)} gap-6`}>
                    {phase.departments.map((v: any) => (
                      <div key={v.departmentId}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {v.department.nome}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={v.valore || 0}
                          onChange={(e) => handleValueChange(v.departmentId, 'valore', e.target.value)}
                          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 ${colors.input}`}
                        />
                        <textarea
                          value={v.note || ''}
                          onChange={(e) => handleValueChange(v.departmentId, 'note', e.target.value)}
                          placeholder="Note..."
                          className={`w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 ${colors.input} text-sm`}
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {/* Actions */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {record?.creator && (
                  <span>
                    Creato da {record.creator.nome}
                    {record?.updater && record.updater.id !== record.creator.id && (
                      <>, aggiornato da {record.updater.nome}</>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/produzione">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300"
                  >
                    <i className="fas fa-times mr-2"></i>Annulla
                  </motion.button>
                </Link>
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02, y: saving ? 0 : -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <motion.i
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="fas fa-spinner mr-2"
                      />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>Salva Produzione
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </form>
        </>
      )}
    </motion.div>
  );
}
