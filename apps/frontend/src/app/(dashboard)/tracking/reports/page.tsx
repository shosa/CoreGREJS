'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError, showSuccess, showInfo } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

type ReportType = 'lot-pdf' | 'lot-excel' | 'cartel-pdf' | 'cartel-excel' | 'fiches';

export default function ReportsPage() {
  const [lotInput, setLotInput] = useState('');
  const [cartelInput, setCartelInput] = useState('');
  const [generating, setGenerating] = useState<ReportType | null>(null);

  const handleGenerateReport = async (type: ReportType) => {
    setGenerating(type);
    try {
      let blob: Blob;

      if (type === 'lot-pdf' || type === 'lot-excel') {
        const lots = lotInput.split('\n').map(l => l.trim()).filter(Boolean);
        if (lots.length === 0) {
          showError('Inserisci almeno un lotto');
          return;
        }
        blob = type === 'lot-pdf'
          ? await trackingApi.reportLotPdf(lots)
          : await trackingApi.reportLotExcel(lots);
      } else {
        const cartelli = cartelInput.split('\n').map(l => parseInt(l.trim())).filter(n => !isNaN(n));
        if (cartelli.length === 0) {
          showError('Inserisci almeno un cartellino');
          return;
        }
        if (type === 'cartel-pdf') {
          blob = await trackingApi.reportCartelPdf(cartelli);
        } else if (type === 'cartel-excel') {
          blob = await trackingApi.reportCartelExcel(cartelli);
        } else {
          blob = await trackingApi.reportFichesPdf(cartelli);
        }
      }

      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = type.includes('excel') ? 'xlsx' : 'pdf';
      a.download = `tracking-report-${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Report generato con successo');
    } catch (error: any) {
      if (error?.response?.data?.message) {
        showInfo(error.response.data.message);
      } else {
        showError('Errore nella generazione del report');
      }
    } finally {
      setGenerating(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Report e Stampe"
        subtitle="Genera PDF e Excel per lotti, cartellini e fiches"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Report e Stampe' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report per Lotti */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
              <i className="fas fa-cube text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report per Lotti</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Packing List per numeri lotto</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Numeri Lotto (uno per riga)
            </label>
            <textarea
              value={lotInput}
              onChange={e => setLotInput(e.target.value)}
              placeholder="LOT001&#10;LOT002&#10;LOT003"
              rows={6}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleGenerateReport('lot-pdf')}
              disabled={generating !== null}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition disabled:opacity-50"
            >
              {generating === 'lot-pdf' ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-file-pdf mr-2"></i>
              )}
              PDF
            </button>
            <button
              onClick={() => handleGenerateReport('lot-excel')}
              disabled={generating !== null}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50"
            >
              {generating === 'lot-excel' ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-file-excel mr-2"></i>
              )}
              Excel
            </button>
          </div>
        </div>

        {/* Report per Cartellini */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
              <i className="fas fa-tag text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report per Cartellini</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Packing List per numeri cartellino</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Numeri Cartellino (uno per riga)
            </label>
            <textarea
              value={cartelInput}
              onChange={e => setCartelInput(e.target.value)}
              placeholder="12345&#10;12346&#10;12347"
              rows={6}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleGenerateReport('cartel-pdf')}
              disabled={generating !== null}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition disabled:opacity-50"
            >
              {generating === 'cartel-pdf' ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-file-pdf mr-2"></i>
              )}
              PDF
            </button>
            <button
              onClick={() => handleGenerateReport('cartel-excel')}
              disabled={generating !== null}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50"
            >
              {generating === 'cartel-excel' ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-file-excel mr-2"></i>
              )}
              Excel
            </button>
          </div>
        </div>

        {/* Fiches */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 shadow-lg">
              <i className="fas fa-id-card text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fiches Dettagliate</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Genera PDF con fiches complete per cartellini</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Utilizza i cartellini inseriti sopra per generare le fiches dettagliate.
          </p>

          <button
            onClick={() => handleGenerateReport('fiches')}
            disabled={generating !== null || !cartelInput.trim()}
            className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating === 'fiches' ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-file-pdf mr-2"></i>
            )}
            Genera Fiches PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}
