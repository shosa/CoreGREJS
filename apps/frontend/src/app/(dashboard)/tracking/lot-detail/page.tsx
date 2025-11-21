'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Offcanvas from '@/components/ui/Offcanvas';

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

  // Offcanvas state
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [completedData, setCompletedData] = useState<any[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

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
    setShowOffcanvas(true);
    setSearchTerm('');
    try {
      if (activeTab === 'ddt') {
        const result = await trackingApi.getLotsWithDdt(1, 500);
        setCompletedData(result.data || []);
      } else if (activeTab === 'orders') {
        const result = await trackingApi.getOrdersWithDate(1, 500);
        setCompletedData(result.data || []);
      } else if (activeTab === 'sku') {
        const result = await trackingApi.getArticlesWithSku(1, 500);
        setCompletedData(result.data || []);
      }
    } catch (error) {
      showError('Errore nel caricamento');
    } finally {
      setCompletedLoading(false);
    }
  };

  // Filter completed data based on search
  const filteredCompletedData = useMemo(() => {
    if (!searchTerm.trim()) return completedData;
    const term = searchTerm.toLowerCase();
    return completedData.filter(item => {
      if (activeTab === 'ddt') {
        return item.lot?.toLowerCase().includes(term) ||
               item.doc?.toLowerCase().includes(term) ||
               item.note?.toLowerCase().includes(term);
      } else if (activeTab === 'orders') {
        return String(item.ordine).includes(term);
      } else {
        return item.art?.toLowerCase().includes(term) ||
               item.descrizione?.toLowerCase().includes(term) ||
               item.sku?.toLowerCase().includes(term);
      }
    });
  }, [completedData, searchTerm, activeTab]);

  const openEditModal = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'ddt') {
      setEditFormData({
        doc: item.doc || '',
        date: item.date ? item.date.split('T')[0] : '',
        note: item.note || ''
      });
    } else if (activeTab === 'orders') {
      setEditFormData({
        date: item.date ? item.date.split('T')[0] : ''
      });
    } else {
      setEditFormData({
        sku: item.sku || ''
      });
    }
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    setEditSaving(true);
    try {
      if (activeTab === 'ddt') {
        await trackingApi.updateLotInfo(editingItem.lot, editFormData);
        showSuccess('Dati lotto aggiornati');
      } else if (activeTab === 'orders') {
        await trackingApi.updateOrderInfo(String(editingItem.ordine), editFormData.date);
        showSuccess('Data ordine aggiornata');
      } else {
        await trackingApi.updateSku(editingItem.art, editFormData.sku);
        showSuccess('SKU aggiornato');
      }
      setEditModalOpen(false);
      loadCompleted();
    } catch (error) {
      showError('Errore nel salvataggio');
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditDelete = async () => {
    if (!editingItem) return;
    if (!confirm('Sei sicuro di voler eliminare questo record?')) return;

    setEditSaving(true);
    try {
      if (activeTab === 'ddt') {
        await trackingApi.updateLotInfo(editingItem.lot, { doc: '', date: '', note: '' });
        showSuccess('DDT rimosso');
      } else if (activeTab === 'orders') {
        await trackingApi.updateOrderInfo(String(editingItem.ordine), '');
        showSuccess('Data ordine rimossa');
      } else {
        await trackingApi.updateSku(editingItem.art, '');
        showSuccess('SKU rimosso');
      }
      setEditModalOpen(false);
      loadCompleted();
      loadTabData();
    } catch (error) {
      showError('Errore nella rimozione');
    } finally {
      setEditSaving(false);
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

  const offcanvasTitle = activeTab === 'ddt' ? 'Lotti con DDT' : activeTab === 'orders' ? 'Ordini con Data' : 'Articoli con SKU';

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

        <button
          onClick={loadCompleted}
          className="ml-auto px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg flex items-center gap-2"
        >
          <i className="fas fa-check-circle"></i>
          Vedi Compilati
        </button>
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

      {/* Offcanvas per i compilati */}
      <Offcanvas
        open={showOffcanvas}
        onClose={() => setShowOffcanvas(false)}
        title={offcanvasTitle}
        icon="fa-check-circle"
        iconColor="text-green-500"
        headerBg="bg-green-50 dark:bg-green-900/20"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        loading={completedLoading}
        footer={
          <div className="text-sm text-gray-500">
            {filteredCompletedData.length} elementi {searchTerm && `(filtrati da ${completedData.length})`}
          </div>
        }
      >
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              {activeTab === 'ddt' ? (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Lotto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">DDT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Data</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Azioni</th>
                </>
              ) : activeTab === 'orders' ? (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">N. Ordine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Data</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Azioni</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Cod. Articolo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Descrizione</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">SKU</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Azioni</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCompletedData.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                {activeTab === 'ddt' ? (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.lot}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{item.doc}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.date ? new Date(item.date).toLocaleDateString('it-IT') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 inline-flex items-center justify-center transition"
                        title="Modifica"
                      >
                        <i className="fas fa-edit text-sm"></i>
                      </button>
                    </td>
                  </>
                ) : activeTab === 'orders' ? (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.ordine}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.date ? new Date(item.date).toLocaleDateString('it-IT') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 inline-flex items-center justify-center transition"
                        title="Modifica"
                      >
                        <i className="fas fa-edit text-sm"></i>
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.art}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm max-w-[200px] truncate">{item.descrizione || '-'}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{item.sku}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 inline-flex items-center justify-center transition"
                        title="Modifica"
                      >
                        <i className="fas fa-edit text-sm"></i>
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredCompletedData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {searchTerm ? 'Nessun risultato trovato' : 'Nessun elemento compilato'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Offcanvas>

      {/* Modal per modifica */}
      <AnimatePresence>
        {editModalOpen && editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4"
            onClick={() => setEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fas fa-edit text-blue-500"></i>
                  Modifica {activeTab === 'ddt' ? 'Lotto' : activeTab === 'orders' ? 'Ordine' : 'Articolo'}
                </h3>
              </div>

              <div className="p-4 space-y-4">
                {activeTab === 'ddt' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lotto</label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">{editingItem.lot}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">DDT</label>
                      <input
                        type="text"
                        value={editFormData.doc}
                        onChange={e => setEditFormData({ ...editFormData, doc: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                      <input
                        type="text"
                        value={editFormData.note}
                        onChange={e => setEditFormData({ ...editFormData, note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'orders' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N. Ordine</label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">{editingItem.ordine}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'sku' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cod. Articolo</label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white">{editingItem.art}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione</label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 text-sm">{editingItem.descrizione || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                      <input
                        type="text"
                        value={editFormData.sku}
                        onChange={e => setEditFormData({ ...editFormData, sku: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-between">
                <button
                  onClick={handleEditDelete}
                  disabled={editSaving}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <i className="fas fa-trash"></i>
                  Elimina
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={editSaving}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {editSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                    Salva
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
