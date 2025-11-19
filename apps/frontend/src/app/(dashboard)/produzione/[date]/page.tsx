'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showError } from '@/store/notifications';

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
const PHASE_COLORS: Record<string, { border: string; bg: string; text: string; valueBg: string }> = {
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    valueBg: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    valueBg: 'text-green-600 dark:text-green-400',
  },
  purple: {
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    valueBg: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    border: 'border-orange-200 dark:border-orange-800',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    valueBg: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    valueBg: 'text-red-600 dark:text-red-400',
  },
};

export default function ProduzioneViewPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);

  useEffect(() => {
    fetchRecord();
  }, [date]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const data = await produzioneApi.getByDate(date);
      setRecord(data);

      // Se non ci sono dati, redirect al form new con la data preselezionata
      if (data.isNew) {
        router.replace(`/produzione/new?date=${date}`);
        return;
      }
    } catch (error) {
      showError('Errore nel caricamento dei dati');
      router.push('/produzione');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-orange-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!record || record.isNew) {
    return null; // Will redirect
  }

  // Group valori by phase
  const groupedByPhase = (record.valori || []).reduce((acc: any, v: any) => {
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
              Produzione - {formatDate(date)}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Visualizzazione dati di produzione
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <motion.button
              onClick={async () => {
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api'}/produzione/pdf/${date}`, {
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
            <Link href={`/produzione/new?date=${date}`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-orange-700 shadow-md"
              >
                <i className="fas fa-edit mr-2"></i>
                Modifica
              </motion.button>
            </Link>
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
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{formatDate(date)}</span>
            </div>
          </li>
        </ol>
      </motion.nav>

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
            <div className={`p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(phase.departments.length, 5)} gap-4`}>
              {phase.departments.map((v: any) => (
                <div key={v.departmentId} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {v.department.nome}
                    </span>
                    <span className={`text-xl font-bold ${colors.valueBg}`}>
                      {v.valore || 0}
                    </span>
                  </div>
                  {v.note && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      <i className="fas fa-sticky-note mr-1"></i>
                      {v.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Meta Info */}
      <motion.div variants={itemVariants} className="text-sm text-gray-500 dark:text-gray-400">
        {record?.creator && (
          <p>
            <i className="fas fa-user mr-2"></i>
            Creato da {record.creator.nome}
            {record?.updater && record.updater.id !== record.creator.id && (
              <>, aggiornato da {record.updater.nome}</>
            )}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
