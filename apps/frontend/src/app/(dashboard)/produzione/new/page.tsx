'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import Footer from '@/components/layout/Footer';
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
      await produzioneApi.save({
        date: selectedDate,
        valori: valori.map(v => ({
          departmentId: v.departmentId,
          valore: v.valore || 0,
          note: v.note || null,
        })),
      });
      showSuccess('Produzione salvata con successo');
      router.push(`/produzione/${selectedDate}`);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Group valori by phase (same structure as show page)
  const groupedByPhase = (valori || []).reduce((acc: any, v: any) => {
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
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="pb-24">
      {/* Header */}
      <PageHeader
        title={record?.id ? 'Modifica Produzione' : 'Nuova Produzione'}
        actions={
          <Link
            href="/produzione"
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Torna al calendario
          </Link>
        }
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Produzione', href: '/produzione' },
          { label: record?.id ? 'Modifica' : 'Nuova' },
        ]}
      />

      {/* Date Selection */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <i className="fas fa-calendar-alt mr-3 text-blue-500"></i>
          Selezione Data
        </h3>

        <div className="max-w-md">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data *
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
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
        <form onSubmit={handleSubmit}>
          {/* Main Content - Two Column Layout */}
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
                          <div key={v.departmentId} className="space-y-4">
                            <div className="space-y-2">
                              <label
                                htmlFor={`dept-${v.departmentId}`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                {v.department.nome.toUpperCase()}
                              </label>
                              <input
                                type="number"
                                id={`dept-${v.departmentId}`}
                                min="0"
                                step="1"
                                value={v.valore || ''}
                                onChange={(e) => handleValueChange(v.departmentId, 'valore', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                htmlFor={`note-${v.departmentId}`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Note {v.department.nome.toUpperCase()}
                              </label>
                              <textarea
                                id={`note-${v.departmentId}`}
                                rows={3}
                                value={v.note || ''}
                                onChange={(e) => handleValueChange(v.departmentId, 'note', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Note aggiuntive..."
                              />
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
        </form>
      )}

      {/* Fixed Footer with Actions */}
      <Footer show={!loading}>
        <div className="flex items-center justify-end space-x-4">
          <Link
            href="/produzione"
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-times mr-2"></i>
            Annulla
          </Link>

          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            className="inline-flex items-center px-6 py-3 rounded-lg border border-transparent bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <motion.i
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="fas fa-spinner mr-2"
                />
                Salvataggio...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                {record?.id ? 'Aggiorna Produzione' : 'Salva Produzione'}
              </>
            )}
          </button>
        </div>
      </Footer>
    </motion.div>
  );
}
