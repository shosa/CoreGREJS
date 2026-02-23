'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { riparazioniApi, settingsApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';

type Tab = 'impostazioni' | 'jobs';

interface Laboratorio { id: number; nome: string; attivo: boolean; }
interface Reparto { id: number; nome: string; ordine: number; attivo: boolean; }
interface Numerata {
  id: number; idNumerata: string;
  n01?: string; n02?: string; n03?: string; n04?: string; n05?: string;
  n06?: string; n07?: string; n08?: string; n09?: string; n10?: string;
  n11?: string; n12?: string; n13?: string; n14?: string; n15?: string;
  n16?: string; n17?: string; n18?: string; n19?: string; n20?: string;
}

const JOBS = [
  { key: 'riparazioni.cedola-pdf', label: 'Stampa Cedola', desc: 'Genera il PDF della cedola di riparazione. Usa il template impostato (originale A4 verticale o nuovo A4 landscape tecnico).', output: 'PDF' },
];

const NUM_KEYS = Array.from({ length: 20 }, (_, i) => `n${String(i + 1).padStart(2, '0')}`);
const initTaglie = () => Object.fromEntries(NUM_KEYS.map((k) => [k, '']));

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function CrudModal({ title, children, onClose, onConfirm, saving, confirmLabel = 'Salva', confirmDisabled = false }: {
  title: string; children: React.ReactNode; onClose: () => void;
  onConfirm: () => void; saving: boolean; confirmLabel?: string; confirmDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">Annulla</button>
          <button onClick={onConfirm} disabled={saving || confirmDisabled} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvataggio...' : confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteModal({ label, onClose, onConfirm }: { label: string; onClose: () => void; onConfirm: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"><i className="fas fa-exclamation-triangle text-xl text-red-600 dark:text-red-400"></i></div>
          <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Conferma eliminazione</h3><p className="text-sm text-gray-500">Questa azione è irreversibile</p></div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4">Eliminare <span className="font-bold">{label}</span>?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Annulla</button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Elimina</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── TAB IMPOSTAZIONI: layout + laboratori + reparti + numerate in scroll ──────
function ImpostazioniTab() {
  // Layout stampa
  const [config, setConfig] = useState<{ layoutStampa: string }>({ layoutStampa: 'nuovo' });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  // Laboratori
  const [laboratori, setLaboratori] = useState<Laboratorio[]>([]);
  const [labLoading, setLabLoading] = useState(true);
  const [labSaving, setLabSaving] = useState(false);
  const [labShowCreate, setLabShowCreate] = useState(false);
  const [labShowEdit, setLabShowEdit] = useState(false);
  const [labShowDelete, setLabShowDelete] = useState(false);
  const [labSelected, setLabSelected] = useState<Laboratorio | null>(null);
  const [labNome, setLabNome] = useState('');
  const [labAttivo, setLabAttivo] = useState(true);

  // Reparti
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [repLoading, setRepLoading] = useState(true);
  const [repSaving, setRepSaving] = useState(false);
  const [repShowCreate, setRepShowCreate] = useState(false);
  const [repShowEdit, setRepShowEdit] = useState(false);
  const [repShowDelete, setRepShowDelete] = useState(false);
  const [repSelected, setRepSelected] = useState<Reparto | null>(null);
  const [repNome, setRepNome] = useState('');
  const [repOrdine, setRepOrdine] = useState(0);
  const [repAttivo, setRepAttivo] = useState(true);

  // Numerate
  const [numerate, setNumerate] = useState<Numerata[]>([]);
  const [numLoading, setNumLoading] = useState(true);
  const [numSaving, setNumSaving] = useState(false);
  const [numShowCreate, setNumShowCreate] = useState(false);
  const [numShowEdit, setNumShowEdit] = useState(false);
  const [numShowDelete, setNumShowDelete] = useState(false);
  const [numSelected, setNumSelected] = useState<Numerata | null>(null);
  const [numId, setNumId] = useState('');
  const [numTaglie, setNumTaglie] = useState<Record<string, string>>(initTaglie());

  useEffect(() => {
    settingsApi.getRiparazioniConfig()
      .then(setConfig)
      .catch(() => showError('Errore caricamento impostazioni'))
      .finally(() => setConfigLoading(false));
    loadLaboratori();
    loadReparti();
    loadNumerate();
  }, []);

  // ── Laboratori ──
  const loadLaboratori = async () => {
    setLabLoading(true);
    try { setLaboratori(await riparazioniApi.getLaboratori()); }
    catch { showError('Errore caricamento laboratori'); }
    finally { setLabLoading(false); }
  };
  const labCreate = async () => {
    setLabSaving(true);
    try { await riparazioniApi.createLaboratorio({ nome: labNome, attivo: labAttivo }); showSuccess('Laboratorio creato'); setLabShowCreate(false); setLabNome(''); setLabAttivo(true); await loadLaboratori(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
    finally { setLabSaving(false); }
  };
  const labEdit = async () => {
    if (!labSelected) return;
    setLabSaving(true);
    try { await riparazioniApi.updateLaboratorio(labSelected.id, { nome: labNome, attivo: labAttivo }); showSuccess('Laboratorio aggiornato'); setLabShowEdit(false); setLabSelected(null); setLabNome(''); setLabAttivo(true); await loadLaboratori(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
    finally { setLabSaving(false); }
  };
  const labDelete = async () => {
    if (!labSelected) return;
    try { await riparazioniApi.deleteLaboratorio(labSelected.id); showSuccess('Laboratorio eliminato'); setLabShowDelete(false); setLabSelected(null); await loadLaboratori(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };

  // ── Reparti ──
  const loadReparti = async () => {
    setRepLoading(true);
    try { setReparti(await riparazioniApi.getReparti()); }
    catch { showError('Errore caricamento reparti'); }
    finally { setRepLoading(false); }
  };
  const repCreate = async () => {
    setRepSaving(true);
    try { await riparazioniApi.createReparto({ nome: repNome, ordine: repOrdine, attivo: repAttivo }); showSuccess('Reparto creato'); setRepShowCreate(false); setRepNome(''); setRepOrdine(0); setRepAttivo(true); await loadReparti(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
    finally { setRepSaving(false); }
  };
  const repEdit = async () => {
    if (!repSelected) return;
    setRepSaving(true);
    try { await riparazioniApi.updateReparto(repSelected.id, { nome: repNome, ordine: repOrdine, attivo: repAttivo }); showSuccess('Reparto aggiornato'); setRepShowEdit(false); setRepSelected(null); setRepNome(''); setRepOrdine(0); setRepAttivo(true); await loadReparti(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
    finally { setRepSaving(false); }
  };
  const repDelete = async () => {
    if (!repSelected) return;
    try { await riparazioniApi.deleteReparto(repSelected.id); showSuccess('Reparto eliminato'); setRepShowDelete(false); setRepSelected(null); await loadReparti(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };

  // ── Numerate ──
  const loadNumerate = async () => {
    setNumLoading(true);
    try { setNumerate(await riparazioniApi.getNumerate()); }
    catch { showError('Errore caricamento numerate'); }
    finally { setNumLoading(false); }
  };
  const numCreate = async () => {
    setNumSaving(true);
    try { await riparazioniApi.createNumerata({ idNumerata: numId.toUpperCase(), ...numTaglie }); showSuccess('Numerata creata'); setNumShowCreate(false); setNumId(''); setNumTaglie(initTaglie()); await loadNumerate(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
    finally { setNumSaving(false); }
  };
  const numEdit = async () => {
    if (!numSelected) return;
    setNumSaving(true);
    try { await riparazioniApi.updateNumerata(numSelected.id, { idNumerata: numId.toUpperCase(), ...numTaglie }); showSuccess('Numerata aggiornata'); setNumShowEdit(false); setNumSelected(null); setNumId(''); setNumTaglie(initTaglie()); await loadNumerate(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
    finally { setNumSaving(false); }
  };
  const numDelete = async () => {
    if (!numSelected) return;
    try { await riparazioniApi.deleteNumerata(numSelected.id); showSuccess('Numerata eliminata'); setNumShowDelete(false); setNumSelected(null); await loadNumerate(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };
  const numOpenEdit = (n: Numerata) => {
    setNumSelected(n);
    setNumId(n.idNumerata);
    setNumTaglie(Object.fromEntries(NUM_KEYS.map((k) => [k, (n[k as keyof Numerata] as string) || ''])));
    setNumShowEdit(true);
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try { await settingsApi.updateRiparazioniConfig(config); showSuccess('Impostazioni salvate'); }
    catch { showError('Errore salvataggio'); }
    finally { setConfigSaving(false); }
  };

  const spinner = (
    <div className="py-6 flex justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Layout stampa cedola ── */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Layout stampa cedola</h4>
        {configLoading ? spinner : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'originale', label: 'ORIGINALE', sub: 'A4 verticale, classico',   icon: 'fa-file-alt',     active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',       iconBg: 'bg-blue-500',   txt: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
                { val: 'nuovo',     label: 'NUOVO',     sub: 'A4 orizzontale, tecnico',  icon: 'fa-file-invoice', active: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20', iconBg: 'bg-indigo-500', txt: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
              ].map((opt) => (
                <button key={opt.val} onClick={() => setConfig({ layoutStampa: opt.val })}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition cursor-pointer ${config.layoutStampa === opt.val ? opt.active : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'}`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.layoutStampa === opt.val ? opt.iconBg : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <i className={`fas ${opt.icon} text-xl ${config.layoutStampa === opt.val ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}></i>
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold text-sm ${config.layoutStampa === opt.val ? opt.txt : 'text-gray-700 dark:text-gray-300'}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.sub}</p>
                  </div>
                  {config.layoutStampa === opt.val && (
                    <div className={`absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full ${opt.dot}`}>
                      <i className="fas fa-check text-white text-xs"></i>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={saveConfig} disabled={configSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium">
                {configSaving
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-4 w-4 rounded-full border-2 border-white border-t-transparent" />Salvataggio...</>
                  : <><i className="fas fa-save"></i>Salva impostazioni</>}
              </button>
            </div>
          </>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Laboratori ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Laboratori</h4>
          <button onClick={() => { setLabNome(''); setLabAttivo(true); setLabShowCreate(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
            <i className="fas fa-plus"></i>Nuovo
          </button>
        </div>
        {labLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stato</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {laboratori.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${item.attivo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{item.attivo ? 'Attivo' : 'Inattivo'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { setLabSelected(item); setLabNome(item.nome); setLabAttivo(item.attivo); setLabShowEdit(true); }} className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"><i className="fas fa-edit text-xs"></i></button>
                        <button onClick={() => { setLabSelected(item); setLabShowDelete(true); }} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {laboratori.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-flask text-2xl mb-2 opacity-40 block"></i>Nessun laboratorio</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Reparti ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reparti</h4>
          <button onClick={() => { setRepNome(''); setRepOrdine(reparti.length > 0 ? Math.max(...reparti.map(r => r.ordine)) + 1 : 0); setRepAttivo(true); setRepShowCreate(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
            <i className="fas fa-plus"></i>Nuovo
          </button>
        </div>
        {repLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ordine</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stato</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reparti.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{item.ordine}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${item.attivo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{item.attivo ? 'Attivo' : 'Inattivo'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { setRepSelected(item); setRepNome(item.nome); setRepOrdine(item.ordine); setRepAttivo(item.attivo); setRepShowEdit(true); }} className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"><i className="fas fa-edit text-xs"></i></button>
                        <button onClick={() => { setRepSelected(item); setRepShowDelete(true); }} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reparti.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-industry text-2xl mb-2 opacity-40 block"></i>Nessun reparto</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Numerate ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Numerate</h4>
          <button onClick={() => { setNumId(''); setNumTaglie(initTaglie()); setNumShowCreate(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
            <i className="fas fa-plus"></i>Nuova
          </button>
        </div>
        {numLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Codice</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Taglie</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {numerate.map((item) => {
                  const taglieFilled = NUM_KEYS.map((k) => item[k as keyof Numerata] as string).filter(Boolean);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white">{item.idNumerata}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {taglieFilled.map((t, i) => <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">{t}</span>)}
                          {taglieFilled.length === 0 && <span className="text-gray-400 text-xs italic">Nessuna taglia</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => numOpenEdit(item)} className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"><i className="fas fa-edit text-xs"></i></button>
                          <button onClick={() => { setNumSelected(item); setNumShowDelete(true); }} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {numerate.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-ruler text-2xl mb-2 opacity-40 block"></i>Nessuna numerata</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALS LABORATORI ── */}
      {labShowCreate && (
        <CrudModal title="Nuovo Laboratorio" onClose={() => setLabShowCreate(false)} onConfirm={labCreate} saving={labSaving} confirmLabel="Crea" confirmDisabled={!labNome.trim()}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input type="text" value={labNome} onChange={(e) => setLabNome(e.target.value)} placeholder="Nome laboratorio..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={labAttivo} onChange={(e) => setLabAttivo(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
          </div>
        </CrudModal>
      )}
      {labShowEdit && labSelected && (
        <CrudModal title="Modifica Laboratorio" onClose={() => { setLabShowEdit(false); setLabSelected(null); }} onConfirm={labEdit} saving={labSaving} confirmDisabled={!labNome.trim()}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input type="text" value={labNome} onChange={(e) => setLabNome(e.target.value)} placeholder="Nome laboratorio..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={labAttivo} onChange={(e) => setLabAttivo(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
          </div>
        </CrudModal>
      )}
      {labShowDelete && labSelected && <DeleteModal label={labSelected.nome} onClose={() => { setLabShowDelete(false); setLabSelected(null); }} onConfirm={labDelete} />}

      {/* ── MODALS REPARTI ── */}
      {repShowCreate && (
        <CrudModal title="Nuovo Reparto" onClose={() => setRepShowCreate(false)} onConfirm={repCreate} saving={repSaving} confirmLabel="Crea" confirmDisabled={!repNome.trim()}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input type="text" value={repNome} onChange={(e) => setRepNome(e.target.value)} placeholder="Nome reparto..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label>
              <input type="number" value={repOrdine} onChange={(e) => setRepOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={repAttivo} onChange={(e) => setRepAttivo(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
          </div>
        </CrudModal>
      )}
      {repShowEdit && repSelected && (
        <CrudModal title="Modifica Reparto" onClose={() => { setRepShowEdit(false); setRepSelected(null); }} onConfirm={repEdit} saving={repSaving} confirmDisabled={!repNome.trim()}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input type="text" value={repNome} onChange={(e) => setRepNome(e.target.value)} placeholder="Nome reparto..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label>
              <input type="number" value={repOrdine} onChange={(e) => setRepOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={repAttivo} onChange={(e) => setRepAttivo(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
          </div>
        </CrudModal>
      )}
      {repShowDelete && repSelected && <DeleteModal label={repSelected.nome} onClose={() => { setRepShowDelete(false); setRepSelected(null); }} onConfirm={repDelete} />}

      {/* ── MODAL NUMERATE (wide per griglia taglie) ── */}
      {(numShowCreate || numShowEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{numShowCreate ? 'Nuova Numerata' : 'Modifica Numerata'}</h3>
            <div className="mb-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Numerata *</label>
                <input type="text" value={numId} onChange={(e) => setNumId(e.target.value.toUpperCase())} placeholder="Es. T15" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Taglie (N01–N20)</label>
                <div className="grid grid-cols-4 gap-2">
                  {NUM_KEYS.map((k, i) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">{k.toUpperCase()}</label>
                      <input type="text" value={numTaglie[k] || ''} onChange={(e) => setNumTaglie((prev) => ({ ...prev, [k]: e.target.value }))} placeholder={`T${i + 1}`} className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setNumShowCreate(false); setNumShowEdit(false); setNumSelected(null); }} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Annulla</button>
              <button onClick={numShowCreate ? numCreate : numEdit} disabled={numSaving || !numId.trim()} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{numSaving ? 'Salvataggio...' : (numShowCreate ? 'Crea' : 'Salva')}</button>
            </div>
          </motion.div>
        </div>
      )}
      {numShowDelete && numSelected && <DeleteModal label={numSelected.idNumerata} onClose={() => { setNumShowDelete(false); setNumSelected(null); }} onConfirm={numDelete} />}
    </div>
  );
}

// ── TAB JOBS ──────────────────────────────────────────────────────────────────
function JobsTab() {
  const outputBadge: Record<string, string> = {
    PDF:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    XLSX: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };
  return (
    <div className="space-y-3">
      {JOBS.map((job) => (
        <div key={job.key} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <i className="fas fa-cog text-gray-400 dark:text-gray-500"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.label}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outputBadge[job.output] || outputBadge['PDF']}`}>{job.output}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.desc}</p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-600 mt-1">{job.key}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PANEL PRINCIPALE ──────────────────────────────────────────────────────────
export default function RiparazioniSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('impostazioni');

  // Tab Jobs appare solo se ci sono jobs definiti
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'impostazioni', icon: 'fa-sliders-h', label: 'Impostazioni' },
    ...(JOBS.length > 0 ? [{ id: 'jobs' as Tab, icon: 'fa-cogs', label: 'Jobs collegati' }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
        {/* Header modulo */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow">
              <i className="fas fa-hammer text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Riparazioni</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configurazione del modulo riparazioni</p>
            </div>
          </div>
        </div>

        {/* Tab bar — visibile solo se ci sono più di un tab */}
        {tabs.length > 1 && (
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <i className={`fas ${tab.icon} text-xs`}></i>
                {tab.label}
                {tab.id === 'jobs' && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{JOBS.length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'impostazioni' && <ImpostazioniTab />}
          {activeTab === 'jobs'         && <JobsTab />}
        </div>
      </div>
    </div>
  );
}
