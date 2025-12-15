'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { produzioneApi, settingsApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Footer from '@/components/layout/Footer';

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
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string>('');

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

  const handleOpenEmailModal = async () => {
    try {
      const recipients = await settingsApi.getProduzioneEmails();
      setEmailRecipients(recipients);
      setEmailStatus('idle');
      setEmailError('');
      setShowEmailModal(true);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nel caricamento dei destinatari');
    }
  };

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      setEmailStatus('idle');
      setEmailError('');

      const res = await produzioneApi.sendEmail(date);

      if (res?.success) {
        setEmailStatus('success');
        // Auto-dismiss dopo 2 secondi
        setTimeout(() => {
          setShowEmailModal(false);
          setSendingEmail(false);
          setEmailStatus('idle');
        }, 2000);
      } else {
        setEmailStatus('error');
        setEmailError(res?.error || 'Errore nell\'invio dell\'email');
        setSendingEmail(false);
      }
    } catch (error: any) {
      setEmailStatus('error');
      const errorMsg = error.response?.data?.message || error.message || 'Errore nell\'invio dell\'email';
      setEmailError(errorMsg);
      setSendingEmail(false);
    }
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
        subtitle="Dettaglio produzione"
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

      {/* Footer con Actions */}
      <Footer>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/produzione/calendario">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-medium text-white hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <i className="fas fa-calendar mr-2"></i>
              Torna al Calendario
            </motion.button>
          </Link>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={async () => {
                const res = await produzioneApi.requestPdf(date);
                if (res?.jobId) {
                  showSuccess('Il lavoro è stato messo in coda.');
                } else {
                  showError('Errore nella generazione del PDF');
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm"
            >
              <i className="fas fa-file-pdf mr-2 text-red-500"></i>
              Stampa PDF
            </motion.button>

            <motion.button
              onClick={handleOpenEmailModal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-lg border border-green-300 bg-white px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 dark:border-green-600 dark:bg-gray-700 dark:text-green-300 dark:hover:bg-green-600/20 transition-colors shadow-sm"
            >
              <i className="fas fa-envelope mr-2 text-green-500"></i>
              Invia Email
            </motion.button>

            <Link href={`/produzione/new?date=${date}`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm"
              >
                <i className="fas fa-edit mr-2 text-blue-500"></i>
                Modifica
              </motion.button>
            </Link>
          </div>
        </div>
      </Footer>

      {/* Email Confirmation Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => !sendingEmail && setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-t-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                    <i className="fas fa-envelope text-white text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Conferma Invio Email
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cedola Produzione {formatDate(date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Success State */}
                {emailStatus === 'success' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6"
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                        <i className="fas fa-check text-green-600 dark:text-green-400 text-2xl"></i>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-green-900 dark:text-green-300">
                          Email inviata con successo!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          Il rapporto è stato inviato ai destinatari configurati
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error State */}
                {emailStatus === 'error' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <i className="fas fa-exclamation-circle text-red-500 mt-1 text-xl"></i>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                          Errore nell&apos;invio dell&apos;email
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400">
                          {emailError}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Idle State - Show form */}
                {emailStatus === 'idle' && (
                  <>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                      <div className="flex items-start gap-3">
                        <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                            Riepilogo Invio
                          </p>
                          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                            <div>
                              <span className="font-medium">Da:</span> {user?.mail || 'Email non configurata'}
                            </div>
                            <div>
                              <span className="font-medium">A:</span>
                              <div className="mt-1 ml-4 space-y-1">
                                {emailRecipients.length > 0 ? (
                                  emailRecipients.map((email, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <i className="fas fa-circle text-xs"></i>
                                      {email}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-red-600 dark:text-red-400">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    Nessun destinatario configurato
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                              <span className="font-medium">Allegato:</span> PRODUZIONE_{date}.pdf
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!user?.mail && (
                      <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                        <div className="flex items-start gap-3">
                          <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            <strong>Attenzione:</strong> Non hai configurato un indirizzo email nel tuo profilo.
                            Vai in Utenti per configurarlo.
                          </p>
                        </div>
                      </div>
                    )}

                    {emailRecipients.length === 0 && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                        <div className="flex items-start gap-3">
                          <i className="fas fa-exclamation-circle text-red-500 mt-1"></i>
                          <p className="text-sm text-red-800 dark:text-red-300">
                            <strong>Errore:</strong> Nessun destinatario configurato.
                            Vai nelle Impostazioni per configurare gli indirizzi email dei destinatari.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {emailStatus !== 'success' && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-end gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    disabled={sendingEmail}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {emailStatus === 'error' ? 'Chiudi' : 'Annulla'}
                  </button>
                  {emailStatus === 'idle' && (
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail || !user?.mail || emailRecipients.length === 0}
                      className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendingEmail ? (
                        <>
                          <motion.i
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="fas fa-spinner"
                          ></motion.i>
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          Conferma e Invia
                        </>
                      )}
                    </button>
                  )}
                  {emailStatus === 'error' && (
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail || !user?.mail || emailRecipients.length === 0}
                      className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <i className="fas fa-redo"></i>
                      Riprova
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
