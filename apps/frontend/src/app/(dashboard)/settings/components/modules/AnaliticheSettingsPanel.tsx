'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analiticheApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';

type Tab = 'impostazioni' | 'jobs';

interface Reparto {
  id: number;
  nome: string;
  codice?: string;
  descrizione?: string;
  attivo: boolean;
  ordine: number;
  costiAssociati?: string[];
}

const COST_OPTIONS = [
  { key: 'costoTaglio',    label: 'Taglio' },
  { key: 'costoOrlatura',  label: 'Orlatura' },
  { key: 'costoStrobel',   label: 'Strobel' },
  { key: 'costoMontaggio', label: 'Montaggio' },
  { key: 'altriCosti',     label: 'Altri costi' },
];

const JOBS = [
  { key: 'analitiche.report-pdf',   label: 'Report Analitiche PDF',   desc: 'Genera il report PDF con le analisi statistiche sui dati storici e indicatori chiave.', output: 'PDF' },
  { key: 'analitiche.report-excel', label: 'Report Analitiche Excel', desc: 'Esporta i dati analitici in formato Excel con tabelle pivot e dati grezzi.', output: 'XLSX' },
];

// ── MODALS ───────────────────────────────────────────────────────────────────
function CrudModal({ title, children, onClose, onConfirm, saving, confirmLabel = 'Salva', confirmDisabled = false }: {
  title: string; children: React.ReactNode; onClose: () => void;
  onConfirm: () => void; saving: boolean; confirmLabel?: string; confirmDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">Annulla</button>
          <button onClick={onConfirm} disabled={saving || confirmDisabled} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Salvataggio...' : confirmLabel}</button>
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

// ── Tipi mappatura ────────────────────────────────────────────────────────────
interface ProdDept {
  id: number;
  nome: string;
  phase?: { nome: string; ordine: number } | null;
}

interface Mapping {
  id: number;
  analiticaRepartoId: number;
  prodDepartmentId: number;
}

// ── ImpostazioniTab ──────────────────────────────────────────────────────────
function ImpostazioniTab() {
  const spinner = <div className="py-6 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent" /></div>;
  const badgeStato = (a: boolean) => <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${a ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{a ? 'Attivo' : 'Inattivo'}</span>;
  const editBtn = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"><i className="fas fa-edit text-xs"></i></button>;
  const delBtn  = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>;

  // ── State reparti ──────────────────────────────────────────────────────────
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<Reparto | null>(null);
  const [nome, setNome] = useState('');
  const [codice, setCodice] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [ordine, setOrdine] = useState(0);
  const [attivo, setAttivo] = useState(true);
  const [costiAssociati, setCostiAssociati] = useState<string[]>([]);

  // ── State mappatura ────────────────────────────────────────────────────────
  const [prodDepts, setProdDepts] = useState<ProdDept[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [savingMapId, setSavingMapId] = useState<number | null>(null);
  const [selections, setSelections] = useState<Map<number, Set<number>>>(new Map());

  useEffect(() => { load(); loadMappings(); }, []);

  const load = async () => {
    setLoading(true);
    try { setReparti(await analiticheApi.getReparti(false)); }
    catch { showError('Errore caricamento reparti'); }
    finally { setLoading(false); }
  };

  const loadMappings = async () => {
    setLoadingMap(true);
    try {
      const [depts, maps] = await Promise.all([
        analiticheApi.getProdDepartments(),
        analiticheApi.getMappings(),
      ]);
      setProdDepts(depts || []);
      setMappings(maps || []);
      const sel = new Map<number, Set<number>>();
      for (const m of (maps || [])) {
        if (!sel.has(m.analiticaRepartoId)) sel.set(m.analiticaRepartoId, new Set());
        sel.get(m.analiticaRepartoId)!.add(m.prodDepartmentId);
      }
      setSelections(sel);
    } catch { showError('Errore caricamento mappature'); }
    finally { setLoadingMap(false); }
  };

  const reset = () => { setNome(''); setCodice(''); setDescrizione(''); setOrdine(0); setAttivo(true); setCostiAssociati([]); };
  const toggleCosto = (key: string) => setCostiAssociati(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);

  const create = async () => {
    setSaving(true);
    try {
      await analiticheApi.createReparto({ nome, codice: codice.toUpperCase() || undefined, descrizione: descrizione || undefined, ordine, attivo, costiAssociati });
      showSuccess('Reparto creato'); setShowCreate(false); reset(); await load();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setSaving(false); }
  };
  const edit = async () => {
    if (!selected) return; setSaving(true);
    try {
      await analiticheApi.updateReparto(selected.id, { nome, codice: codice.toUpperCase() || undefined, descrizione: descrizione || undefined, ordine, attivo, costiAssociati });
      showSuccess('Reparto aggiornato'); setShowEdit(false); setSelected(null); reset(); await load();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!selected) return;
    try { await analiticheApi.deleteReparto(selected.id); showSuccess('Reparto eliminato'); setShowDelete(false); setSelected(null); await load(); }
    catch (e: any) { showError(e.response?.data?.message || 'Errore'); }
  };

  const toggleDept = (anaId: number, deptId: number) => {
    setSelections(prev => {
      const next = new Map(prev);
      if (!next.has(anaId)) next.set(anaId, new Set());
      const s = new Set(next.get(anaId)!);
      if (s.has(deptId)) s.delete(deptId); else s.add(deptId);
      next.set(anaId, s);
      return next;
    });
  };

  const saveMapping = async (anaId: number) => {
    setSavingMapId(anaId);
    try {
      const ids = [...(selections.get(anaId) || new Set())];
      await analiticheApi.upsertMappings(anaId, ids);
      showSuccess('Mappatura salvata');
      await loadMappings();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore salvataggio'); }
    finally { setSavingMapId(null); }
  };

  // Raggruppa prodDepts per fase
  const deptsByPhase = prodDepts.reduce<Record<string, ProdDept[]>>((acc, d) => {
    const k = d.phase?.nome || 'Senza fase';
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {});

  // deptId → anaRepartoId
  const usedBy = new Map<number, number>();
  for (const m of mappings) usedBy.set(m.prodDepartmentId, m.analiticaRepartoId);
  const anaNames = new Map(reparti.map(r => [r.id, r.nome]));

  const fields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input value={nome} onChange={e => setNome(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice</label><input value={codice} onChange={e => setCodice(e.target.value.toUpperCase())} maxLength={20} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase" placeholder="es. REP01" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione</label><input value={descrizione} onChange={e => setDescrizione(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Costi associati</label>
        <div className="flex flex-wrap gap-2">
          {COST_OPTIONS.map(c => (
            <button key={c.key} type="button" onClick={() => toggleCosto(c.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${costiAssociati.includes(c.key) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-400'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" min={0} value={ordine} onChange={e => setOrdine(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
        <label className="flex items-center gap-2 cursor-pointer self-end pb-1"><input type="checkbox" checked={attivo} onChange={e => setAttivo(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Reparti analitici ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reparti analitici</h4>
          <button onClick={() => { reset(); setShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"><i className="fas fa-plus"></i>Nuovo</button>
        </div>
        {loading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Costi associati</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ord.</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reparti.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.codice || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5">
                      {item.costiAssociati && item.costiAssociati.length > 0
                        ? <div className="flex flex-wrap gap-1">{item.costiAssociati.map(c => <span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{COST_OPTIONS.find(o => o.key === c)?.label ?? c}</span>)}</div>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{item.ordine}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setSelected(item); setNome(item.nome); setCodice(item.codice || ''); setDescrizione(item.descrizione || ''); setOrdine(item.ordine); setAttivo(item.attivo); setCostiAssociati(item.costiAssociati ?? []); setShowEdit(true); })}{delBtn(() => { setSelected(item); setShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {reparti.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-sitemap text-2xl mb-2 opacity-40 block"></i>Nessun reparto</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mappatura reparti produzione ───────────────────────────────────── */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          <i className="fas fa-link mr-1.5"></i>Mappatura reparti produzione
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Associa i reparti di produzione ai reparti analitici. Un reparto produzione può essere assegnato a un solo reparto analitico.
          Le mappature vengono usate nel report "Produzione Mese" con la spunta "Includi dati di produzione".
        </p>

        {loadingMap ? spinner : (
          <div className="space-y-3">
            {reparti.length === 0 && (
              <p className="text-xs text-gray-400">Nessun reparto analitico configurato</p>
            )}
            {reparti.map(reparto => {
              const sel = selections.get(reparto.id) || new Set<number>();
              const isSaving = savingMapId === reparto.id;

              return (
                <div key={reparto.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{reparto.nome}</span>
                      {reparto.codice && <span className="text-xs text-gray-400 font-mono">{reparto.codice}</span>}
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        {sel.size > 0 ? `${sel.size} reparti` : 'Nessuna mappatura'}
                      </span>
                    </div>
                    <button
                      onClick={() => saveMapping(reparto.id)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                      Salva
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    {prodDepts.length === 0 && (
                      <p className="text-xs text-gray-400">Nessun reparto di produzione attivo</p>
                    )}
                    {Object.entries(deptsByPhase).map(([phaseName, depts]) => (
                      <div key={phaseName}>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{phaseName}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {depts.map(dept => {
                            const isChecked = sel.has(dept.id);
                            const occupiedBy = usedBy.get(dept.id);
                            const isDisabled = !isChecked && occupiedBy !== undefined && occupiedBy !== reparto.id;
                            const occupiedName = isDisabled ? anaNames.get(occupiedBy!) : undefined;
                            return (
                              <label
                                key={dept.id}
                                title={isDisabled ? `Già assegnato a "${occupiedName}"` : undefined}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer select-none
                                  ${isDisabled
                                    ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'
                                    : isChecked
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => !isDisabled && toggleDept(reparto.id, dept.id)}
                                  className="sr-only"
                                />
                                {isChecked && <i className="fas fa-check text-[9px]"></i>}
                                {dept.nome}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CrudModal title="Nuovo reparto" onClose={() => { setShowCreate(false); reset(); }} onConfirm={create} saving={saving} confirmLabel="Crea" confirmDisabled={!nome.trim()}>{fields}</CrudModal>}
      {showEdit && selected && <CrudModal title="Modifica reparto" onClose={() => { setShowEdit(false); setSelected(null); reset(); }} onConfirm={edit} saving={saving} confirmDisabled={!nome.trim()}>{fields}</CrudModal>}
      {showDelete && selected && <DeleteModal label={selected.nome} onClose={() => { setShowDelete(false); setSelected(null); }} onConfirm={del} />}
    </div>
  );
}

function JobsTab() {
  const badge: Record<string, string> = {
    PDF:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    XLSX: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };
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

export default function AnaliticheSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('impostazioni');
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'impostazioni', icon: 'fa-sliders-h', label: 'Impostazioni' },
    ...(JOBS.length > 0 ? [{ id: 'jobs' as Tab, icon: 'fa-cogs', label: 'Jobs collegati' }] : []),
  ];
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow"><i className="fas fa-chart-bar text-white text-xl"></i></div>
          <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Analitiche</h3><p className="text-sm text-gray-500 dark:text-gray-400">Configurazione reparti analitici e costi associati</p></div>
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
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
