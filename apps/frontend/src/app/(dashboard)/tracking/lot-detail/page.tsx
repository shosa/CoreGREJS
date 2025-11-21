'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

type Tab = 'ddt' | 'orders' | 'sku';

interface LotItem {
  lot: string;
  doc?: string;
  date?: string;
  note?: string;
}

interface OrderItem {
  ordine: number;
  date?: string;
}

interface SkuItem {
  art: string;
  descrizione?: string;
  sku?: string;
}

export default function LotDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ddt');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [completedData, setCompletedData] = useState<any[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  // Tab 1: Lotti senza DDT
  const [lotsWithoutDdt, setLotsWithoutDdt] = useState<LotItem[]>([]);
  const [ddtTotal, setDdtTotal] = useState(0);

  // Tab 2: Ordini senza date
  const [ordersWithoutDate, setOrdersWithoutDate] = useState<OrderItem[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);

  // Tab 3: Articoli senza SKU
  const [articlesWithoutSku, setArticlesWithoutSku] = useState<SkuItem[]>([]);
  const [skuTotal, setSkuTotal] = useState(0);

  // Editable values
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ddt') {
        const result = await trackingApi.getLotsWithoutDdt(1, 100);
        setLotsWithoutDdt(result.data || []);
        setDdtTotal(result.total || 0);
      } else if (activeTab === 'orders') {
        const result = await trackingApi.getOrdersWithoutDate(1, 100);
        setOrdersWithoutDate(result.data || []);
        setOrdersTotal(result.total || 0);
      } else if (activeTab === 'sku') {
        const result = await trackingApi.getArticlesWithoutSku(1, 100);
        setArticlesWithoutSku(result.data || []);
        setSkuTotal(result.total || 0);
      }
    } catch (error) {
      showError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const loadCompleted = async () => {
    setCompletedLoading(true);
    setShowCompletedModal(true);
    try {
      if (activeTab === 'orders') {
        const result = await trackingApi.getOrdersWithDate(1, 100);
        setCompletedData(result.data || []);
      } else if (activeTab === 'sku') {
        const result = await trackingApi.getArticlesWithSku(1, 100);
        setCompletedData(result.data || []);
      }
    } catch (error) {
      showError('Errore nel caricamento');
    } finally {
      setCompletedLoading(false);
    }
  };

  const handleSaveLotInfo = async (lot: string) => {
    const values = editValues[lot];
    if (!values) return;

    setSaving(lot);
    try {
      await trackingApi.updateLotInfo(lot, values);
      showSuccess('Dati lotto salvati');
      loadTabData();
      setEditValues(prev => {
        const updated = { ...prev };
        delete updated[lot];
        return updated;
      });
    } catch (error) {
      showError('Errore nel salvataggio');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveOrderInfo = async (ordine: number) => {
    const key = `order_${ordine}`;
    const values = editValues[key];
    if (!values?.date) return;

    setSaving(key);
    try {
      await trackingApi.updateOrderInfo(String(ordine), values.date);
      showSuccess('Data ordine salvata');
      loadTabData();
      setEditValues(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } catch (error) {
      showError('Errore nel salvataggio');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveSku = async (art: string) => {
    const key = `sku_${art}`;
    const values = editValues[key];
    if (!values?.sku) return;

    setSaving(key);
    try {
      await trackingApi.updateSku(art, values.sku);
      showSuccess('SKU salvato');
      loadTabData();
      setEditValues(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } catch (error) {
      showError('Errore nel salvataggio');
    } finally {
      setSaving(null);
    }
  };

  const tabs = [
    { id: 'ddt' as Tab, label: 'Lotti senza DDT', icon: 'fa-file-invoice', count: ddtTotal },
    { id: 'orders' as Tab, label: 'Ordini senza Date', icon: 'fa-calendar', count: ordersTotal },
    { id: 'sku' as Tab, label: 'Articoli senza SKU', icon: 'fa-barcode', count: skuTotal },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Dettagli Mancanti"
        subtitle="Completa i dati mancanti per lotti, ordini e articoli"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Dettagli Mancanti' },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
              {tab.count}
            </span>
          </button>
        ))}

        {/* Button to show completed */}
        {(activeTab === 'orders' || activeTab === 'sku') && (
          <button
            onClick={loadCompleted}
            className="ml-auto px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg flex items-center gap-2"
          >
            <i className="fas fa-check-circle"></i>
            Vedi Compilati
          </button>
        )}
      </div>

      {/* Content */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Tab 1: Lotti senza DDT */}
            {activeTab === 'ddt' && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Lotto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">DDT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Note</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {lotsWithoutDdt.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.lot}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editValues[item.lot]?.doc ?? item.doc ?? ''}
                          onChange={e => setEditValues(prev => ({
                            ...prev,
                            [item.lot]: { ...prev[item.lot], doc: e.target.value }
                          }))}
                          placeholder="N. DDT"
                          className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={editValues[item.lot]?.date ?? (item.date ? item.date.split('T')[0] : '')}
                          onChange={e => setEditValues(prev => ({
                            ...prev,
                            [item.lot]: { ...prev[item.lot], date: e.target.value }
                          }))}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editValues[item.lot]?.note ?? item.note ?? ''}
                          onChange={e => setEditValues(prev => ({
                            ...prev,
                            [item.lot]: { ...prev[item.lot], note: e.target.value }
                          }))}
                          placeholder="Note"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSaveLotInfo(item.lot)}
                          disabled={!editValues[item.lot] || saving === item.lot}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving === item.lot ? <i className="fas fa-spinner fa-spin"></i> : 'Salva'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lotsWithoutDdt.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Nessun lotto senza DDT
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Tab 2: Ordini senza date */}
            {activeTab === 'orders' && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">N. Ordine</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Data</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ordersWithoutDate.map((item, idx) => {
                    const key = `order_${item.ordine}`;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.ordine}</td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={editValues[key]?.date ?? (item.date ? item.date.split('T')[0] : '')}
                            onChange={e => setEditValues(prev => ({
                              ...prev,
                              [key]: { date: e.target.value }
                            }))}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSaveOrderInfo(item.ordine)}
                            disabled={!editValues[key]?.date || saving === key}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving === key ? <i className="fas fa-spinner fa-spin"></i> : 'Salva'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {ordersWithoutDate.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        Nessun ordine senza data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Tab 3: Articoli senza SKU */}
            {activeTab === 'sku' && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Cod. Articolo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Descrizione</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">SKU</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {articlesWithoutSku.map((item, idx) => {
                    const key = `sku_${item.art}`;
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.art}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{item.descrizione || '-'}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues[key]?.sku ?? item.sku ?? ''}
                            onChange={e => setEditValues(prev => ({
                              ...prev,
                              [key]: { sku: e.target.value }
                            }))}
                            placeholder="Codice SKU"
                            className="w-48 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSaveSku(item.art)}
                            disabled={!editValues[key]?.sku || saving === key}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving === key ? <i className="fas fa-spinner fa-spin"></i> : 'Salva'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {articlesWithoutSku.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Nessun articolo senza SKU
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal per visualizzare i compilati */}
      <AnimatePresence>
        {showCompletedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCompletedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-green-50 dark:bg-green-900/20">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fas fa-check-circle text-green-500"></i>
                  {activeTab === 'orders' ? 'Ordini con Data' : 'Articoli con SKU'}
                </h3>
                <button
                  onClick={() => setShowCompletedModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="overflow-auto max-h-[60vh]">
                {completedLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent"
                    />
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        {activeTab === 'orders' ? (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">N. Ordine</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Data</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Cod. Articolo</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Descrizione</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">SKU</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {completedData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {activeTab === 'orders' ? (
                            <>
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.ordine}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {item.date ? new Date(item.date).toLocaleDateString('it-IT') : '-'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.art}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{item.descrizione || '-'}</td>
                              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{item.sku}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {completedData.length === 0 && (
                        <tr>
                          <td colSpan={activeTab === 'orders' ? 2 : 3} className="px-4 py-8 text-center text-gray-500">
                            Nessun elemento compilato
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
