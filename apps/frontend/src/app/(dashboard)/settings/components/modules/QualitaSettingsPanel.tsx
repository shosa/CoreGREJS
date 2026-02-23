'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { qualityApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';

type Tab = 'impostazioni' | 'jobs';

interface Department { id: number; nomeReparto: string; attivo: boolean; ordine?: number; }
interface DefectType  { id: number; descrizione: string; categoria?: string; attivo: boolean; ordine?: number; }

const JOBS = [
  { key: 'quality.report-pdf', label: 'Report Qualità PDF', desc: 'Genera il report PDF del controllo qualità con statistiche difetti, eccezioni taglie e andamento per operatore/reparto.', output: 'PDF' },
];

// ── MODALS ───────────────────────────────────────────────────────────────────
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
          <button onClick={onConfirm} disabled={saving || confirmDisabled} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{saving ? 'Salvataggio...' : confirmLabel}</button>
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

// ── TAB IMPOSTAZIONI ──────────────────────────────────────────────────────────
function ImpostazioniTab() {
  const spinner = <div className="py-6 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-7 w-7 rounded-full border-2 border-green-500 border-t-transparent" /></div>;

  // ── Reparti ──
  const [reparti, setReparti] = useState<Department[]>([]);
  const [repLoading, setRepLoading] = useState(true);
  const [repSaving, setRepSaving] = useState(false);
  const [repShowCreate, setRepShowCreate] = useState(false);
  const [repShowEdit, setRepShowEdit] = useState(false);
  const [repShowDelete, setRepShowDelete] = useState(false);
  const [repSelected, setRepSelected] = useState<Department | null>(null);
  const [repNome, setRepNome] = useState('');
  const [repOrdine, setRepOrdine] = useState(0);
  const [repAttivo, setRepAttivo] = useState(true);

  // ── Tipi difetti ──
  const [difetti, setDifetti] = useState<DefectType[]>([]);
  const [difLoading, setDifLoading] = useState(true);
  const [difSaving, setDifSaving] = useState(false);
  const [difShowCreate, setDifShowCreate] = useState(false);
  const [difShowEdit, setDifShowEdit] = useState(false);
  const [difShowDelete, setDifShowDelete] = useState(false);
  const [difSelected, setDifSelected] = useState<DefectType | null>(null);
  const [difDescrizione, setDifDescrizione] = useState('');
  const [difCategoria, setDifCategoria] = useState('');
  const [difOrdine, setDifOrdine] = useState(0);
  const [difAttivo, setDifAttivo] = useState(true);

  useEffect(() => { loadReparti(); loadDifetti(); }, []);

  const loadReparti = async () => { setRepLoading(true); try { setReparti(await qualityApi.getDepartments(false)); } catch { showError('Errore caricamento reparti'); } finally { setRepLoading(false); } };
  const repCreate = async () => { setRepSaving(true); try { await qualityApi.createDepartment({ nomeReparto: repNome, ordine: repOrdine, attivo: repAttivo }); showSuccess('Reparto creato'); setRepShowCreate(false); setRepNome(''); setRepOrdine(0); setRepAttivo(true); await loadReparti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setRepSaving(false); } };
  const repEdit = async () => { if (!repSelected) return; setRepSaving(true); try { await qualityApi.updateDepartment(repSelected.id, { nomeReparto: repNome, ordine: repOrdine, attivo: repAttivo }); showSuccess('Reparto aggiornato'); setRepShowEdit(false); setRepSelected(null); await loadReparti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setRepSaving(false); } };
  const repDelete = async () => { if (!repSelected) return; try { await qualityApi.deleteDepartment(repSelected.id); showSuccess('Reparto eliminato'); setRepShowDelete(false); setRepSelected(null); await loadReparti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };

  const loadDifetti = async () => { setDifLoading(true); try { setDifetti(await qualityApi.getDefectTypes(false)); } catch { showError('Errore caricamento tipi difetti'); } finally { setDifLoading(false); } };
  const difCreate = async () => { setDifSaving(true); try { await qualityApi.createDefectType({ descrizione: difDescrizione, categoria: difCategoria, ordine: difOrdine, attivo: difAttivo }); showSuccess('Tipo difetto creato'); setDifShowCreate(false); setDifDescrizione(''); setDifCategoria(''); setDifOrdine(0); setDifAttivo(true); await loadDifetti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setDifSaving(false); } };
  const difEdit = async () => { if (!difSelected) return; setDifSaving(true); try { await qualityApi.updateDefectType(difSelected.id, { descrizione: difDescrizione, categoria: difCategoria, ordine: difOrdine, attivo: difAttivo }); showSuccess('Tipo difetto aggiornato'); setDifShowEdit(false); setDifSelected(null); await loadDifetti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setDifSaving(false); } };
  const difDelete = async () => { if (!difSelected) return; try { await qualityApi.deleteDefectType(difSelected.id); showSuccess('Tipo difetto eliminato'); setDifShowDelete(false); setDifSelected(null); await loadDifetti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };

  const badgeStato = (attivo: boolean) => (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${attivo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{attivo ? 'Attivo' : 'Inattivo'}</span>
  );
  const editBtn = (onClick: () => void) => <button onClick={onClick} className="px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"><i className="fas fa-edit text-xs"></i></button>;
  const delBtn = (onClick: () => void) => <button onClick={onClick} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>;

  return (
    <div className="space-y-8">
      {/* ── Reparti ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reparti</h4>
          <button onClick={() => { setRepNome(''); setRepOrdine(reparti.length > 0 ? Math.max(...reparti.map(r => r.ordine ?? 0)) + 1 : 0); setRepAttivo(true); setRepShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition"><i className="fas fa-plus"></i>Nuovo</button>
        </div>
        {repLoading ? spinner : (
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
                {reparti.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nomeReparto}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{item.ordine ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setRepSelected(item); setRepNome(item.nomeReparto); setRepOrdine(item.ordine ?? 0); setRepAttivo(item.attivo); setRepShowEdit(true); })}{delBtn(() => { setRepSelected(item); setRepShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {reparti.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-building text-2xl mb-2 opacity-40 block"></i>Nessun reparto</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Tipi Difetti ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tipi Difetti</h4>
          <button onClick={() => { setDifDescrizione(''); setDifCategoria(''); setDifOrdine(difetti.length > 0 ? Math.max(...difetti.map(d => d.ordine ?? 0)) + 1 : 0); setDifAttivo(true); setDifShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition"><i className="fas fa-plus"></i>Nuovo</button>
        </div>
        {difLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {difetti.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.descrizione}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{item.categoria || '—'}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setDifSelected(item); setDifDescrizione(item.descrizione); setDifCategoria(item.categoria || ''); setDifOrdine(item.ordine ?? 0); setDifAttivo(item.attivo); setDifShowEdit(true); })}{delBtn(() => { setDifSelected(item); setDifShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {difetti.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-circle-exclamation text-2xl mb-2 opacity-40 block"></i>Nessun tipo difetto</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS REPARTI */}
      {repShowCreate && <CrudModal title="Nuovo Reparto" onClose={() => setRepShowCreate(false)} onConfirm={repCreate} saving={repSaving} confirmLabel="Crea" confirmDisabled={!repNome.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input type="text" value={repNome} onChange={e => setRepNome(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={repOrdine} onChange={e => setRepOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={repAttivo} onChange={e => setRepAttivo(e.target.checked)} className="w-4 h-4 text-green-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {repShowEdit && repSelected && <CrudModal title="Modifica Reparto" onClose={() => { setRepShowEdit(false); setRepSelected(null); }} onConfirm={repEdit} saving={repSaving} confirmDisabled={!repNome.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input type="text" value={repNome} onChange={e => setRepNome(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={repOrdine} onChange={e => setRepOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={repAttivo} onChange={e => setRepAttivo(e.target.checked)} className="w-4 h-4 text-green-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {repShowDelete && repSelected && <DeleteModal label={repSelected.nomeReparto} onClose={() => { setRepShowDelete(false); setRepSelected(null); }} onConfirm={repDelete} />}

      {/* MODALS DIFETTI */}
      {difShowCreate && <CrudModal title="Nuovo Tipo Difetto" onClose={() => setDifShowCreate(false)} onConfirm={difCreate} saving={difSaving} confirmLabel="Crea" confirmDisabled={!difDescrizione.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione *</label><input type="text" value={difDescrizione} onChange={e => setDifDescrizione(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label><input type="text" value={difCategoria} onChange={e => setDifCategoria(e.target.value)} placeholder="Es. Cucitura, Materiale..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={difOrdine} onChange={e => setDifOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={difAttivo} onChange={e => setDifAttivo(e.target.checked)} className="w-4 h-4 text-green-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {difShowEdit && difSelected && <CrudModal title="Modifica Tipo Difetto" onClose={() => { setDifShowEdit(false); setDifSelected(null); }} onConfirm={difEdit} saving={difSaving} confirmDisabled={!difDescrizione.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione *</label><input type="text" value={difDescrizione} onChange={e => setDifDescrizione(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label><input type="text" value={difCategoria} onChange={e => setDifCategoria(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={difOrdine} onChange={e => setDifOrdine(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={difAttivo} onChange={e => setDifAttivo(e.target.checked)} className="w-4 h-4 text-green-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {difShowDelete && difSelected && <DeleteModal label={difSelected.descrizione} onClose={() => { setDifShowDelete(false); setDifSelected(null); }} onConfirm={difDelete} />}
    </div>
  );
}

function JobsTab() {
  const badge: Record<string, string> = { PDF: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' };
  return <div className="space-y-3">{JOBS.map(job => (
    <div key={job.key} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"><i className="fas fa-cog text-gray-400"></i></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-gray-900 dark:text-white">{job.label}</p><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge[job.output] || badge['PDF']}`}>{job.output}</span></div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.desc}</p>
        <p className="text-xs font-mono text-gray-400 dark:text-gray-600 mt-1">{job.key}</p>
      </div>
    </div>
  ))}</div>;
}

export default function QualitaSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('impostazioni');
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'impostazioni', icon: 'fa-sliders-h', label: 'Impostazioni' },
    ...(JOBS.length > 0 ? [{ id: 'jobs' as Tab, icon: 'fa-cogs', label: 'Jobs collegati' }] : []),
  ];
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow"><i className="fas fa-check-circle text-white text-xl"></i></div>
          <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Controllo Qualità</h3><p className="text-sm text-gray-500 dark:text-gray-400">Configurazione del modulo qualità</p></div>
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
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
