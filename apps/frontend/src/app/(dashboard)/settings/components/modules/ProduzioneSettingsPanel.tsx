'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';

type Tab = 'impostazioni' | 'jobs';

interface Phase      { id: number; nome: string; ordine: number; attivo: boolean; }
interface Department { id: number; phaseId: number; nome: string; codice?: string; descrizione?: string; attivo: boolean; ordine: number; phase?: { nome: string }; }

const JOBS = [
  { key: 'prod.report-pdf',     label: 'Report Produzione PDF',     desc: 'Genera il report PDF giornaliero/periodico con i dati di produzione per fase e relativi trend.', output: 'PDF' },
  { key: 'prod.csv-report-pdf', label: 'Report CSV Produzione PDF', desc: 'Genera un PDF a partire dai dati CSV di produzione, con layout tabellare compatto per la condivisione via email.', output: 'PDF' },
];

function CrudModal({ title, children, onClose, onConfirm, saving, confirmLabel = 'Salva', confirmDisabled = false }: {
  title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; saving: boolean; confirmLabel?: string; confirmDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">Annulla</button>
          <button onClick={onConfirm} disabled={saving || confirmDisabled} className="flex-1 rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50">{saving ? 'Salvataggio...' : confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}
function DeleteModal({ label, onClose, onConfirm }: { label: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"><i className="fas fa-exclamation-triangle text-xl text-red-600"></i></div>
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

function ImpostazioniTab() {
  const spinner = <div className="py-6 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-7 w-7 rounded-full border-2 border-yellow-500 border-t-transparent" /></div>;
  const badgeStato = (a: boolean) => <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${a ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{a ? 'Attivo' : 'Inattivo'}</span>;
  const editBtn = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400"><i className="fas fa-edit text-xs"></i></button>;
  const delBtn  = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>;

  // Fasi
  const [fasi, setFasi] = useState<Phase[]>([]);
  const [faseLoading, setFaseLoading] = useState(true);
  const [faseSaving, setFaseSaving] = useState(false);
  const [faseShowCreate, setFaseShowCreate] = useState(false);
  const [faseShowEdit, setFaseShowEdit] = useState(false);
  const [faseShowDelete, setFaseShowDelete] = useState(false);
  const [faseSelected, setFaseSelected] = useState<Phase | null>(null);
  const [faseNome, setFaseNome] = useState('');
  const [faseOrdine, setFaseOrdine] = useState(0);
  const [faseAttivo, setFaseAttivo] = useState(true);

  // Reparti
  const [reparti, setReparti] = useState<Department[]>([]);
  const [repLoading, setRepLoading] = useState(true);
  const [repSaving, setRepSaving] = useState(false);
  const [repShowCreate, setRepShowCreate] = useState(false);
  const [repShowEdit, setRepShowEdit] = useState(false);
  const [repShowDelete, setRepShowDelete] = useState(false);
  const [repSelected, setRepSelected] = useState<Department | null>(null);
  const [repPhaseId, setRepPhaseId] = useState<number>(0);
  const [repNome, setRepNome] = useState('');
  const [repCodice, setRepCodice] = useState('');
  const [repDesc, setRepDesc] = useState('');
  const [repOrdine, setRepOrdine] = useState(0);
  const [repAttivo, setRepAttivo] = useState(true);

  useEffect(() => { loadFasi(); loadReparti(); }, []);

  const loadFasi = async () => { setFaseLoading(true); try { setFasi(await produzioneApi.getPhases()); } catch { showError('Errore caricamento fasi'); } finally { setFaseLoading(false); } };
  const faseCreate = async () => { setFaseSaving(true); try { await produzioneApi.createPhase({ nome: faseNome, ordine: faseOrdine, attivo: faseAttivo }); showSuccess('Fase creata'); setFaseShowCreate(false); setFaseNome(''); setFaseOrdine(0); setFaseAttivo(true); await loadFasi(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setFaseSaving(false); } };
  const faseEdit = async () => { if (!faseSelected) return; setFaseSaving(true); try { await produzioneApi.updatePhase(faseSelected.id, { nome: faseNome, ordine: faseOrdine, attivo: faseAttivo }); showSuccess('Fase aggiornata'); setFaseShowEdit(false); setFaseSelected(null); await loadFasi(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setFaseSaving(false); } };
  const faseDelete = async () => { if (!faseSelected) return; try { await produzioneApi.deletePhase(faseSelected.id); showSuccess('Fase eliminata'); setFaseShowDelete(false); setFaseSelected(null); await loadFasi(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };

  const loadReparti = async () => { setRepLoading(true); try { setReparti(await produzioneApi.getDepartments()); } catch { showError('Errore caricamento reparti'); } finally { setRepLoading(false); } };
  const repCreate = async () => { if (!repPhaseId) { showError('Seleziona una fase'); return; } setRepSaving(true); try { await produzioneApi.createDepartment({ phaseId: repPhaseId, nome: repNome, codice: repCodice || undefined, descrizione: repDesc || undefined, ordine: repOrdine, attivo: repAttivo }); showSuccess('Reparto creato'); setRepShowCreate(false); resetRep(); await loadReparti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setRepSaving(false); } };
  const repEdit = async () => { if (!repSelected) return; setRepSaving(true); try { await produzioneApi.updateDepartment(repSelected.id, { phaseId: repPhaseId, nome: repNome, codice: repCodice || undefined, descrizione: repDesc || undefined, ordine: repOrdine, attivo: repAttivo }); showSuccess('Reparto aggiornato'); setRepShowEdit(false); setRepSelected(null); resetRep(); await loadReparti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setRepSaving(false); } };
  const repDelete = async () => { if (!repSelected) return; try { await produzioneApi.deleteDepartment(repSelected.id); showSuccess('Reparto eliminato'); setRepShowDelete(false); setRepSelected(null); await loadReparti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };
  const resetRep = () => { setRepPhaseId(0); setRepNome(''); setRepCodice(''); setRepDesc(''); setRepOrdine(0); setRepAttivo(true); };

  return (
    <div className="space-y-8">
      {/* Fasi */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Fasi di Produzione</h4>
          <button onClick={() => { setFaseNome(''); setFaseOrdine(fasi.length > 0 ? Math.max(...fasi.map(f => f.ordine)) + 1 : 0); setFaseAttivo(true); setFaseShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600 text-white text-xs font-medium hover:bg-yellow-700 transition"><i className="fas fa-plus"></i>Nuova</button>
        </div>
        {faseLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ordine</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {fasi.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{item.ordine}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setFaseSelected(item); setFaseNome(item.nome); setFaseOrdine(item.ordine); setFaseAttivo(item.attivo); setFaseShowEdit(true); })}{delBtn(() => { setFaseSelected(item); setFaseShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {fasi.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-layer-group text-2xl mb-2 opacity-40 block"></i>Nessuna fase</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Reparti */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reparti</h4>
          <button onClick={() => { resetRep(); setRepShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600 text-white text-xs font-medium hover:bg-yellow-700 transition"><i className="fas fa-plus"></i>Nuovo</button>
        </div>
        {repLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fase</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ord.</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reparti.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{item.phase?.nome ?? `#${item.phaseId}`}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.codice || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{item.descrizione || '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{item.ordine}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setRepSelected(item); setRepPhaseId(item.phaseId); setRepNome(item.nome); setRepCodice(item.codice || ''); setRepDesc(item.descrizione || ''); setRepOrdine(item.ordine); setRepAttivo(item.attivo); setRepShowEdit(true); })}{delBtn(() => { setRepSelected(item); setRepShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {reparti.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-building text-2xl mb-2 opacity-40 block"></i>Nessun reparto</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS FASI */}
      {faseShowCreate && <CrudModal title="Nuova Fase" onClose={() => setFaseShowCreate(false)} onConfirm={faseCreate} saving={faseSaving} confirmLabel="Crea" confirmDisabled={!faseNome.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input type="text" value={faseNome} onChange={e => setFaseNome(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={faseOrdine} onChange={e => setFaseOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={faseAttivo} onChange={e => setFaseAttivo(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {faseShowEdit && faseSelected && <CrudModal title="Modifica Fase" onClose={() => { setFaseShowEdit(false); setFaseSelected(null); }} onConfirm={faseEdit} saving={faseSaving} confirmDisabled={!faseNome.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input type="text" value={faseNome} onChange={e => setFaseNome(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={faseOrdine} onChange={e => setFaseOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={faseAttivo} onChange={e => setFaseAttivo(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {faseShowDelete && faseSelected && <DeleteModal label={faseSelected.nome} onClose={() => { setFaseShowDelete(false); setFaseSelected(null); }} onConfirm={faseDelete} />}

      {/* MODALS REPARTI */}
      {(repShowCreate || (repShowEdit && repSelected)) && <CrudModal title={repShowCreate ? 'Nuovo Reparto' : 'Modifica Reparto'} onClose={() => { setRepShowCreate(false); setRepShowEdit(false); setRepSelected(null); resetRep(); }} onConfirm={repShowCreate ? repCreate : repEdit} saving={repSaving} confirmLabel={repShowCreate ? 'Crea' : 'Salva'} confirmDisabled={!repNome.trim() || !repPhaseId}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fase *</label>
            <select value={repPhaseId} onChange={e => setRepPhaseId(parseInt(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent">
              <option value={0}>— Seleziona fase —</option>
              {fasi.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input type="text" value={repNome} onChange={e => setRepNome(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice</label><input type="text" value={repCodice} onChange={e => setRepCodice(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" placeholder="es. REP01" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione</label><input type="text" value={repDesc} onChange={e => setRepDesc(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" min={0} value={repOrdine} onChange={e => setRepOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={repAttivo} onChange={e => setRepAttivo(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {repShowDelete && repSelected && <DeleteModal label={repSelected.nome} onClose={() => { setRepShowDelete(false); setRepSelected(null); }} onConfirm={repDelete} />}
    </div>
  );
}

function JobsTab() {
  const badge: Record<string, string> = { PDF: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' };
  return <div className="space-y-3">{JOBS.map(job => (
    <div key={job.key} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"><i className="fas fa-cog text-gray-400"></i></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-gray-900 dark:text-white">{job.label}</p><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge[job.output]}`}>{job.output}</span></div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.desc}</p>
        <p className="text-xs font-mono text-gray-400 dark:text-gray-600 mt-1">{job.key}</p>
      </div>
    </div>
  ))}</div>;
}

export default function ProduzioneSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('impostazioni');
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'impostazioni', icon: 'fa-sliders-h', label: 'Impostazioni' },
    ...(JOBS.length > 0 ? [{ id: 'jobs' as Tab, icon: 'fa-cogs', label: 'Jobs collegati' }] : []),
  ];
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 shadow"><i className="fas fa-calendar text-white text-xl"></i></div>
          <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Produzione</h3><p className="text-sm text-gray-500 dark:text-gray-400">Configurazione del modulo produzione</p></div>
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <i className={`fas ${tab.icon} text-xs`}></i>{tab.label}
              {tab.id === 'jobs' && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{JOBS.length}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="p-6">
        {activeTab === 'impostazioni' && <ImpostazioniTab />}
        {activeTab === 'jobs' && <JobsTab />}
      </div>
    </div>
  );
}
