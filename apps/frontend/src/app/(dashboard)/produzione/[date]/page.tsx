'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function ProduzioneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [formData, setFormData] = useState({
    manovia1: 0,
    manovia1Notes: '',
    manovia2: 0,
    manovia2Notes: '',
    orlatura1: 0,
    orlatura1Notes: '',
    orlatura2: 0,
    orlatura2Notes: '',
    orlatura3: 0,
    orlatura3Notes: '',
    orlatura4: 0,
    orlatura4Notes: '',
    orlatura5: 0,
    orlatura5Notes: '',
    taglio1: 0,
    taglio1Notes: '',
    taglio2: 0,
    taglio2Notes: '',
  });

  useEffect(() => {
    fetchRecord();
  }, [date]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const data = await produzioneApi.getByDate(date);
      setRecord(data);
      setFormData({
        manovia1: data.manovia1 || 0,
        manovia1Notes: data.manovia1Notes || '',
        manovia2: data.manovia2 || 0,
        manovia2Notes: data.manovia2Notes || '',
        orlatura1: data.orlatura1 || 0,
        orlatura1Notes: data.orlatura1Notes || '',
        orlatura2: data.orlatura2 || 0,
        orlatura2Notes: data.orlatura2Notes || '',
        orlatura3: data.orlatura3 || 0,
        orlatura3Notes: data.orlatura3Notes || '',
        orlatura4: data.orlatura4 || 0,
        orlatura4Notes: data.orlatura4Notes || '',
        orlatura5: data.orlatura5 || 0,
        orlatura5Notes: data.orlatura5Notes || '',
        taglio1: data.taglio1 || 0,
        taglio1Notes: data.taglio1Notes || '',
        taglio2: data.taglio2 || 0,
        taglio2Notes: data.taglio2Notes || '',
      });
    } catch (error) {
      showError('Errore nel caricamento dei dati');
      router.push('/produzione');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await produzioneApi.saveByDate(date, formData);
      showSuccess('Dati salvati con successo');
      await fetchRecord(); // Refresh data
    } catch (error) {
      showError('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Calculate totals
  const totalMontaggio = (formData.manovia1 || 0) + (formData.manovia2 || 0);
  const totalOrlatura = (formData.orlatura1 || 0) + (formData.orlatura2 || 0) + (formData.orlatura3 || 0) + (formData.orlatura4 || 0) + (formData.orlatura5 || 0);
  const totalTaglio = (formData.taglio1 || 0) + (formData.taglio2 || 0);
  const totalProduzione = totalMontaggio + totalOrlatura + totalTaglio;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-yellow-500 border-t-transparent"
        />
      </div>
    );
  }

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
              {record?.isNew ? 'Inserisci i dati di produzione' : 'Modifica i dati di produzione'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
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
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Montaggio</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalMontaggio}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="text-sm font-medium text-green-600 dark:text-green-400">Orlatura</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalOrlatura}</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Taglio</div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalTaglio}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Totale</div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{totalProduzione}</div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        {/* Montaggio Section */}
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-blue-200 bg-white shadow-lg dark:border-blue-800 dark:bg-gray-800"
        >
          <div className="p-4 border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 flex items-center">
              <i className="fas fa-industry mr-3"></i>
              Montaggio
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manovia 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manovia 1
              </label>
              <input
                type="number"
                min="0"
                value={formData.manovia1}
                onChange={(e) => handleChange('manovia1', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={formData.manovia1Notes}
                onChange={(e) => handleChange('manovia1Notes', e.target.value)}
                placeholder="Note..."
                className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
              />
            </div>
            {/* Manovia 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manovia 2
              </label>
              <input
                type="number"
                min="0"
                value={formData.manovia2}
                onChange={(e) => handleChange('manovia2', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={formData.manovia2Notes}
                onChange={(e) => handleChange('manovia2Notes', e.target.value)}
                placeholder="Note..."
                className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
              />
            </div>
          </div>
        </motion.div>

        {/* Orlatura Section */}
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-green-200 bg-white shadow-lg dark:border-green-800 dark:bg-gray-800"
        >
          <div className="p-4 border-b border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 flex items-center">
              <i className="fas fa-cog mr-3"></i>
              Orlatura
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orlatura {num}
                </label>
                <input
                  type="number"
                  min="0"
                  value={(formData as any)[`orlatura${num}`]}
                  onChange={(e) => handleChange(`orlatura${num}`, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500"
                />
                <textarea
                  value={(formData as any)[`orlatura${num}Notes`]}
                  onChange={(e) => handleChange(`orlatura${num}Notes`, e.target.value)}
                  placeholder="Note..."
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 text-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Taglio Section */}
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-purple-200 bg-white shadow-lg dark:border-purple-800 dark:bg-gray-800"
        >
          <div className="p-4 border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 flex items-center">
              <i className="fas fa-cut mr-3"></i>
              Taglio
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Taglio 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Taglio 1
              </label>
              <input
                type="number"
                min="0"
                value={formData.taglio1}
                onChange={(e) => handleChange('taglio1', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={formData.taglio1Notes}
                onChange={(e) => handleChange('taglio1Notes', e.target.value)}
                placeholder="Note..."
                className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
                rows={2}
              />
            </div>
            {/* Taglio 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Taglio 2
              </label>
              <input
                type="number"
                min="0"
                value={formData.taglio2}
                onChange={(e) => handleChange('taglio2', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                value={formData.taglio2Notes}
                onChange={(e) => handleChange('taglio2Notes', e.target.value)}
                placeholder="Note..."
                className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
                rows={2}
              />
            </div>
          </div>
        </motion.div>

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
    </motion.div>
  );
}
