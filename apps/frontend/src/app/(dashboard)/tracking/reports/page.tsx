'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

type ReportType = 'lot-pdf' | 'lot-excel' | 'cartel-pdf' | 'cartel-excel' | 'fiches';
type TabType = 'lotti' | 'cartellini' | 'fiches';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('lotti');
  const [lotInput, setLotInput] = useState('');
  const [cartelInput, setCartelInput] = useState('');
  const [fichesInput, setFichesInput] = useState('');
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
      } else if (type === 'cartel-pdf' || type === 'cartel-excel') {
        const cartelli = cartelInput.split('\n').map(l => parseInt(l.trim())).filter(n => !isNaN(n));
        if (cartelli.length === 0) {
          showError('Inserisci almeno un cartellino');
          return;
        }
        blob = type === 'cartel-pdf'
          ? await trackingApi.reportCartelPdf(cartelli)
          : await trackingApi.reportCartelExcel(cartelli);
      } else {
        // Fiches
        const cartelli = fichesInput.split('\n').map(l => parseInt(l.trim())).filter(n => !isNaN(n));
        if (cartelli.length === 0) {
          showError('Inserisci almeno un cartellino');
          return;
        }
        blob = await trackingApi.reportFichesPdf(cartelli);
      }

      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = type.includes('excel') ? 'xlsx' : 'pdf';
      const prefix = type.startsWith('lot') ? 'lotti' : type === 'fiches' ? 'fiches' : 'cartellini';
      a.download = `packing_list_${prefix}_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Report generato con successo');
    } catch (error: any) {
      showError(error?.response?.data?.message || 'Errore nella generazione del report');
    } finally {
      setGenerating(null);
    }
  };

  const tabs = [
    { id: 'lotti' as TabType, label: 'Per Lotti', icon: 'fa-cube', color: 'blue' },
    { id: 'cartellini' as TabType, label: 'Per Cartellini', icon: 'fa-tag', color: 'purple' },
    { id: 'fiches' as TabType, label: 'Fiches', icon: 'fa-id-card', color: 'orange' },
  ];

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

      {/* Tab Navigation */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? `text-${tab.color}-600 border-b-2 border-${tab.color}-600 bg-${tab.color}-50/50 dark:bg-${tab.color}-900/10`
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <i className={`fas ${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Tab: Lotti */}
          {activeTab === 'lotti' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
                  <i className="fas fa-cube text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report per Lotti</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Packing List raggruppato per numeri lotto</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Numeri Lotto (uno per riga)
                </label>
                <textarea
                  value={lotInput}
                  onChange={e => setLotInput(e.target.value)}
                  placeholder="LOT001&#10;LOT002&#10;LOT003"
                  rows={8}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleGenerateReport('lot-pdf')}
                  disabled={generating !== null || !lotInput.trim()}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating === 'lot-pdf' ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Generazione...</>
                  ) : (
                    <><i className="fas fa-file-pdf mr-2"></i>Genera PDF</>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateReport('lot-excel')}
                  disabled={generating !== null || !lotInput.trim()}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating === 'lot-excel' ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Generazione...</>
                  ) : (
                    <><i className="fas fa-file-excel mr-2"></i>Genera Excel</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Cartellini */}
          {activeTab === 'cartellini' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
                  <i className="fas fa-tag text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report per Cartellini</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Packing List raggruppato per numeri cartellino</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Numeri Cartellino (uno per riga)
                </label>
                <textarea
                  value={cartelInput}
                  onChange={e => setCartelInput(e.target.value)}
                  placeholder="12345678&#10;23456789&#10;34567890"
                  rows={8}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleGenerateReport('cartel-pdf')}
                  disabled={generating !== null || !cartelInput.trim()}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating === 'cartel-pdf' ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Generazione...</>
                  ) : (
                    <><i className="fas fa-file-pdf mr-2"></i>Genera PDF</>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateReport('cartel-excel')}
                  disabled={generating !== null || !cartelInput.trim()}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating === 'cartel-excel' ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Generazione...</>
                  ) : (
                    <><i className="fas fa-file-excel mr-2"></i>Genera Excel</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Fiches */}
          {activeTab === 'fiches' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 shadow-lg">
                  <i className="fas fa-id-card text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fiches Dettagliate</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PDF con una pagina per ogni cartellino con tutti i dettagli</p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-yellow-600 mt-0.5"></i>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Formato Fiches</p>
                    <p>Ogni cartellino viene stampato su una pagina separata con tutti i lotti raggruppati per tipo.</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Numeri Cartellino (uno per riga)
                </label>
                <textarea
                  value={fichesInput}
                  onChange={e => setFichesInput(e.target.value)}
                  placeholder="12345678&#10;23456789&#10;34567890"
                  rows={8}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
                />
              </div>

              <button
                onClick={() => handleGenerateReport('fiches')}
                disabled={generating !== null || !fichesInput.trim()}
                className="w-full px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating === 'fiches' ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Generazione Fiches...</>
                ) : (
                  <><i className="fas fa-file-pdf mr-2"></i>Genera Fiches PDF</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
