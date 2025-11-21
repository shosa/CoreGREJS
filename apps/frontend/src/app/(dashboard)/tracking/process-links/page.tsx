'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { trackingApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface TrackType {
  id: number;
  name: string;
  note?: string;
}

export default function ProcessLinksPage() {
  const router = useRouter();
  const [cartelli, setCartelli] = useState<number[]>([]);
  const [types, setTypes] = useState<TrackType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [lotsText, setLotsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showNewTypeForm, setShowNewTypeForm] = useState(false);

  useEffect(() => {
    // Load cartelli from sessionStorage
    const stored = sessionStorage.getItem('selectedCartelli');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCartelli(parsed);
      } catch {
        showError('Errore nel caricamento dei cartellini selezionati');
        router.push('/tracking');
        return;
      }
    } else {
      showError('Nessun cartellino selezionato');
      router.push('/tracking');
      return;
    }

    // Load types
    loadTypes();
  }, [router]);

  const loadTypes = async () => {
    try {
      const data = await trackingApi.getTypes();
      setTypes(data || []);
    } catch (error) {
      showError('Errore nel caricamento dei tipi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      showError('Inserisci un nome per il tipo');
      return;
    }

    try {
      const newType = await trackingApi.createType(newTypeName.trim());
      setTypes(prev => [...prev, newType]);
      setSelectedTypeId(newType.id);
      setNewTypeName('');
      setShowNewTypeForm(false);
      showSuccess('Tipo creato con successo');
    } catch (error) {
      showError('Errore nella creazione del tipo');
    }
  };

  const handleSave = async () => {
    if (!selectedTypeId) {
      showError('Seleziona un tipo');
      return;
    }

    const lots = lotsText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lots.length === 0) {
      showError('Inserisci almeno un lotto');
      return;
    }

    setSaving(true);
    try {
      const result = await trackingApi.saveLinks({
        typeId: selectedTypeId,
        lots,
        cartelli,
      });
      showSuccess(`${result.created} collegamenti creati con successo`);
      sessionStorage.removeItem('selectedCartelli');
      router.push('/tracking/tree-view');
    } catch (error) {
      showError('Errore nel salvataggio dei collegamenti');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('selectedCartelli');
    router.push('/tracking');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader
        title="Collega Cartellini a Lotti"
        subtitle={`${cartelli.length} cartellini selezionati`}
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Tracking', href: '/tracking' },
          { label: 'Collegamento' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Selected Cartellini */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-tag text-blue-500"></i>
            Cartellini Selezionati ({cartelli.length})
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {cartelli.map(cartel => (
                <span
                  key={cartel}
                  className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium"
                >
                  #{cartel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Type Selection */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-folder text-yellow-500"></i>
            Seleziona Tipo
          </h3>

          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
            {types.map(type => (
              <label
                key={type.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                  selectedTypeId === type.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  checked={selectedTypeId === type.id}
                  onChange={() => setSelectedTypeId(type.id)}
                  className="mr-3 h-4 w-4 text-blue-600"
                />
                <span className="font-medium text-gray-900 dark:text-white">{type.name}</span>
                {type.note && (
                  <span className="ml-2 text-xs text-gray-500">({type.note})</span>
                )}
              </label>
            ))}
          </div>

          {/* New Type Form */}
          {showNewTypeForm ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                placeholder="Nome nuovo tipo"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              <button
                onClick={handleCreateType}
                className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg"
              >
                <i className="fas fa-check"></i>
              </button>
              <button
                onClick={() => { setShowNewTypeForm(false); setNewTypeName(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTypeForm(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              <i className="fas fa-plus mr-1"></i>
              Aggiungi nuovo tipo
            </button>
          )}
        </div>
      </div>

      {/* Lots Input */}
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-cube text-purple-500"></i>
          Numeri Lotto
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Inserisci i numeri dei lotti da collegare (uno per riga)
        </p>
        <textarea
          value={lotsText}
          onChange={e => setLotsText(e.target.value)}
          placeholder="LOT001&#10;LOT002&#10;LOT003"
          rows={8}
          className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
        />
        <div className="mt-2 text-sm text-gray-500">
          {lotsText.split('\n').filter(l => l.trim()).length} lotti inseriti
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={handleCancel}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !selectedTypeId || !lotsText.trim()}
          className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i>Salvataggio...</>
          ) : (
            <><i className="fas fa-save mr-2"></i>Salva Collegamenti</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
