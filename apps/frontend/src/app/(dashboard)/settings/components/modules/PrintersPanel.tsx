'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { settingsApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';

interface CupsPrinter {
  name: string;
  location: string;
  state: string;
}

interface PrinterConfig {
  id?: number;
  cupsName: string;
  alias: string;
  isDefault: boolean;
}

const STATE_BADGE: Record<string, string> = {
  Idle:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Stopped:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Paused:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Unknown:    'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export default function PrintersPanel() {
  const spinner = (
    <div className="py-8 flex justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent"
      />
    </div>
  );

  const [cupsOnline, setCupsOnline] = useState<boolean | null>(null);
  const [cupsPrinters, setCupsPrinters] = useState<CupsPrinter[]>([]);
  const [configs, setConfigs] = useState<PrinterConfig[]>([]);
  const [loadingCups, setLoadingCups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoadingCups(true);
    try {
      const [cups, saved] = await Promise.all([
        settingsApi.getCupsPrinters(),
        settingsApi.getPrinterConfigs(),
      ]);

      setCupsOnline(cups.length > 0);
      setCupsPrinters(cups);

      // Merge: per ogni stampante CUPS crea/aggiorna riga con config salvata
      const savedMap = new Map(saved.map((s) => [s.cupsName, s]));
      const merged: PrinterConfig[] = [];

      // Stampanti live da CUPS
      for (const cp of cups) {
        const existing = savedMap.get(cp.name);
        merged.push({
          id: existing?.id,
          cupsName: cp.name,
          alias: existing?.alias ?? cp.name,
          isDefault: existing?.isDefault ?? false,
        });
        savedMap.delete(cp.name);
      }

      // Stampanti in DB ma non più rilevate da CUPS
      for (const orphan of savedMap.values()) {
        merged.push({ ...orphan, cupsName: orphan.cupsName });
      }

      setConfigs(merged);
    } catch {
      showError('Errore caricamento stampanti');
    } finally {
      setLoadingCups(false);
    }
  };

  const refreshCups = async () => {
    setLoadingCups(true);
    try {
      const cups = await settingsApi.getCupsPrinters();
      setCupsOnline(cups.length > 0);
      setCupsPrinters(cups);
      // Aggiorna solo le righe live, mantenendo alias configurati
      setConfigs((prev) => {
        const cupsNames = new Set(cups.map((c) => c.name));
        const next = cups.map((cp) => {
          const existing = prev.find((p) => p.cupsName === cp.name);
          return existing ?? { cupsName: cp.name, alias: cp.name, isDefault: false };
        });
        // Mantieni orfane
        for (const p of prev) {
          if (!cupsNames.has(p.cupsName)) next.push(p);
        }
        return next;
      });
    } catch {
      showError('Errore aggiornamento lista CUPS');
    } finally {
      setLoadingCups(false);
    }
  };

  const setAlias = (cupsName: string, alias: string) => {
    setConfigs((prev) => prev.map((c) => c.cupsName === cupsName ? { ...c, alias } : c));
  };

  const setDefault = (cupsName: string) => {
    setConfigs((prev) => prev.map((c) => ({ ...c, isDefault: c.cupsName === cupsName })));
  };

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.savePrinterConfigs(
        configs.map((c) => ({ cupsName: c.cupsName, alias: c.alias || c.cupsName, isDefault: c.isDefault }))
      );
      showSuccess('Configurazione stampanti salvata');
      await loadAll();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const testPrint = async (cupsName: string) => {
    setTestingId(cupsName);
    try {
      await settingsApi.testPrint(cupsName);
      showSuccess(`Stampa di prova inviata a "${cupsName}"`);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Errore stampa di prova');
    } finally {
      setTestingId(null);
    }
  };

  const isLive = (cupsName: string) => cupsPrinters.some((c) => c.name === cupsName);
  const getCupsState = (cupsName: string) => cupsPrinters.find((c) => c.name === cupsName)?.state ?? 'Unknown';
  const getCupsLocation = (cupsName: string) => cupsPrinters.find((c) => c.name === cupsName)?.location ?? '';

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow">
                <i className="fas fa-print text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stampanti di Sistema</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Stampanti rilevate dal demone CUPS del server
                </p>
              </div>
            </div>
            <button
              onClick={refreshCups}
              disabled={loadingCups}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs ${loadingCups ? 'animate-spin' : ''}`}></i>
              Aggiorna lista
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Banner stato CUPS */}
          {cupsOnline === false && !loadingCups && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">CUPS non raggiungibile</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Il demone CUPS non risponde su <code className="font-mono text-xs">localhost:631</code>.
                  Assicurarsi che CUPS sia installato e in esecuzione nel container Docker.
                  La configurazione salvata è comunque visualizzata.
                </p>
              </div>
            </div>
          )}

          {loadingCups ? spinner : (
            <>
              {/* Tabella stampanti */}
              {configs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-print text-4xl mb-3 opacity-30 block"></i>
                  <p className="text-sm">Nessuna stampante rilevata e nessuna configurazione salvata</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome CUPS</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Posizione</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Stato</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Alias</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Default</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Test</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {configs.map((cfg) => {
                        const live = isLive(cfg.cupsName);
                        const state = getCupsState(cfg.cupsName);
                        const location = getCupsLocation(cfg.cupsName);
                        const isTesting = testingId === cfg.cupsName;
                        return (
                          <tr key={cfg.cupsName} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!live ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <i className={`fas fa-circle text-[8px] ${live ? 'text-green-500' : 'text-gray-300'}`}></i>
                                <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{cfg.cupsName}</span>
                                {!live && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400">Non rilevata</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{location || '—'}</td>
                            <td className="px-4 py-3 text-center">
                              {live ? (
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${STATE_BADGE[state] ?? STATE_BADGE.Unknown}`}>
                                  {state}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={cfg.alias}
                                onChange={(e) => setAlias(cfg.cupsName, e.target.value)}
                                placeholder={cfg.cupsName}
                                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => setDefault(cfg.cupsName)}
                                className={`w-5 h-5 rounded-full border-2 transition ${cfg.isDefault ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
                                title={cfg.isDefault ? 'Stampante predefinita' : 'Imposta come predefinita'}
                              >
                                {cfg.isDefault && <i className="fas fa-check text-white text-[8px]"></i>}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => testPrint(cfg.cupsName)}
                                disabled={!live || isTesting}
                                title={live ? 'Stampa pagina di prova' : 'Stampante non disponibile'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isTesting ? (
                                  <i className="fas fa-spinner fa-spin text-[10px]"></i>
                                ) : (
                                  <i className="fas fa-print text-[10px]"></i>
                                )}
                                Test
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Info + Salva */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  <i className="fas fa-info-circle mr-1"></i>
                  Il tasto "Test" invia una pagina di prova direttamente alla stampante CUPS.
                </p>
                <button
                  onClick={save}
                  disabled={saving || configs.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  Salva configurazione
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
