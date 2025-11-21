'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showError } from '@/store/notifications';
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

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

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
      <PageHeader
        title={`Produzione del ${formatDate(date)}`}
        subtitle="Dettaglio produzione e spedizione"
        actions={
          <>
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
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              <i className="fas fa-file-pdf mr-2 text-red-500"></i>
              Scarica PDF
            </motion.button>

            <Link href={`/produzione/new?date=${date}`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                <i className="fas fa-edit mr-2 text-blue-500"></i>
                Modifica
              </motion.button>
            </Link>

            <Link href="/produzione">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-primary bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <i className="fas fa-calendar mr-2"></i>
                Torna al Calendario
              </motion.button>
            </Link>
          </>
        }
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Produzione', href: '/produzione' },
          { label: formatDate(date) },
        ]}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Production Details - Left Column */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {sortedPhases.map(([phaseName, phase]: [string, any]) => {
              const colorClass = {
                blue: 'text-blue-500',
                green: 'text-green-500',
                purple: 'text-purple-500',
                orange: 'text-orange-500',
                red: 'text-red-500',
              }[phase.color] || 'text-blue-500';

              const valueColorClass = {
                blue: 'text-blue-600 dark:text-blue-400',
                green: 'text-green-600 dark:text-green-400',
                purple: 'text-purple-600 dark:text-purple-400',
                orange: 'text-orange-600 dark:text-orange-400',
                red: 'text-red-600 dark:text-red-400',
              }[phase.color] || 'text-blue-600 dark:text-blue-400';

              return (
                <motion.div
                  key={phaseName}
                  variants={itemVariants}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <i className={`fas ${phase.icon} mr-3 ${colorClass}`}></i>
                    {phaseName}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {phase.departments.map((v: any) => (
                      <div key={v.departmentId} className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {v.department.nome.toUpperCase()}
                        </label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                          <div className={`text-2xl font-bold ${valueColorClass}`}>
                            {v.valore ?? '0'}
                          </div>
                          {v.note && (
                            <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                              <i className="fas fa-sticky-note text-yellow-600 dark:text-yellow-500 mt-0.5"></i>
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic flex-1">
                                {v.note}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Totals Card */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <i className="fas fa-calculator mr-3 text-purple-500"></i>
                Totali
              </h3>

              <div className="space-y-4">
                {sortedPhases.map(([phaseName, phase]: [string, any]) => {
                  const bgClass = {
                    blue: 'bg-blue-50 dark:bg-blue-900/20',
                    green: 'bg-green-50 dark:bg-green-900/20',
                    purple: 'bg-purple-50 dark:bg-purple-900/20',
                    orange: 'bg-orange-50 dark:bg-orange-900/20',
                    red: 'bg-red-50 dark:bg-red-900/20',
                  }[phase.color] || 'bg-blue-50 dark:bg-blue-900/20';

                  const textClass = {
                    blue: 'text-blue-600 dark:text-blue-400',
                    green: 'text-green-600 dark:text-green-400',
                    purple: 'text-purple-600 dark:text-purple-400',
                    orange: 'text-orange-600 dark:text-orange-400',
                    red: 'text-red-600 dark:text-red-400',
                  }[phase.color] || 'text-blue-600 dark:text-blue-400';

                  return (
                    <div key={phaseName} className={`flex items-center justify-between p-3 ${bgClass} rounded-lg`}>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{phaseName}</span>
                      <span className={`text-xl font-bold ${textClass}`}>{totalsByPhase[phaseName]}</span>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-dashed border-purple-200 dark:border-purple-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Totale Generale</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalProduzione}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
