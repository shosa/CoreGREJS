'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';

type Tab = 'impostazioni' | 'jobs';

interface Laboratory {
  id: number;
  codice?: string;
  nome: string;
  indirizzo?: string;
  telefono?: string;
  email?: string;
  accessCode?: string;
  attivo: boolean;
}

interface StandardPhase {
  id: number;
  nome: string;
  codice?: string;
  descrizione?: string;
  ordine: number;
  attivo: boolean;
}

const JOBS: { key: string; label: string; desc: string; output: string }[] = [];

// ── MODALS ───────────────────────────────────────────────────────────────────
function CrudModal({ title, children, onClose, onConfirm, saving, confirmLabel = 'Salva', confirmDisabled = false, wide = false }: {
  title: string; children: React.ReactNode; onClose: () => void;
  onConfirm: () => void; saving: boolean; confirmLabel?: string; confirmDisabled?: boolean; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">Annulla</button>
          <button onClick={onConfirm} disabled={saving || confirmDisabled} className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{saving ? 'Salvataggio...' : confirmLabel}</button>
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

// ── ImpostazioniTab ──────────────────────────────────────────────────────────
function ImpostazioniTab() {
  const spinner = <div className="py-6 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-7 w-7 rounded-full border-2 border-orange-500 border-t-transparent" /></div>;
  const badgeStato = (a: boolean) => <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${a ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{a ? 'Attivo' : 'Inattivo'}</span>;
  const editBtn = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400"><i className="fas fa-edit text-xs"></i></button>;
  const delBtn  = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>;

  // Laboratori
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [labLoading, setLabLoading] = useState(true);
  const [labSaving, setLabSaving] = useState(false);
  const [labShowCreate, setLabShowCreate] = useState(false);
  const [labShowEdit, setLabShowEdit] = useState(false);
  const [labShowDelete, setLabShowDelete] = useState(false);
  const [labSelected, setLabSelected] = useState<Laboratory | null>(null);
  const [labCodice, setLabCodice] = useState('');
  const [labNome, setLabNome] = useState('');
  const [labIndirizzo, setLabIndirizzo] = useState('');
  const [labTelefono, setLabTelefono] = useState('');
  const [labEmail, setLabEmail] = useState('');
  const [labAccessCode, setLabAccessCode] = useState('');
  const [labAttivo, setLabAttivo] = useState(true);

  // Fasi standard
  const [phases, setPhases] = useState<StandardPhase[]>([]);
  const [phaseLoading, setPhaseLoading] = useState(true);
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [phaseShowCreate, setPhaseShowCreate] = useState(false);
  const [phaseShowEdit, setPhaseShowEdit] = useState(false);
  const [phaseShowDelete, setPhaseShowDelete] = useState(false);
  const [phaseSelected, setPhaseSelected] = useState<StandardPhase | null>(null);
  const [phaseNome, setPhaseNome] = useState('');
  const [phaseCodice, setPhaseCodice] = useState('');
  const [phaseDesc, setPhaseDesc] = useState('');
  const [phaseOrdine, setPhaseOrdine] = useState(0);
  const [phaseAttivo, setPhaseAttivo] = useState(true);

  useEffect(() => { loadLabs(); loadPhases(); }, []);

  const loadLabs = async () => { setLabLoading(true); try { const r = await api.get('/scm/laboratories'); setLabs(Array.isArray(r.data) ? r.data : []); } catch { showError('Errore caricamento laboratori'); } finally { setLabLoading(false); } };
  const labCreate = async () => {
    setLabSaving(true);
    try {
      await api.post('/scm/laboratories', { codice: labCodice || null, nome: labNome, indirizzo: labIndirizzo || null, telefono: labTelefono || null, email: labEmail || null, accessCode: labAccessCode || null, attivo: labAttivo });
      showSuccess('Laboratorio creato'); setLabShowCreate(false); setLabNome(''); setLabCodice(''); setLabIndirizzo(''); setLabTelefono(''); setLabEmail(''); setLabAccessCode(''); setLabAttivo(true);
      await loadLabs();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setLabSaving(false); }
  };
  const labEdit = async () => {
    if (!labSelected) return; setLabSaving(true);
    try {
      await api.put(`/scm/laboratories/${labSelected.id}`, { codice: labCodice || null, nome: labNome, indirizzo: labIndirizzo || null, telefono: labTelefono || null, email: labEmail || null, accessCode: labAccessCode || null, attivo: labAttivo });
      showSuccess('Laboratorio aggiornato'); setLabShowEdit(false); setLabSelected(null); await loadLabs();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setLabSaving(false); }
  };
  const labDelete = async () => { if (!labSelected) return; try { await api.delete(`/scm/laboratories/${labSelected.id}`); showSuccess('Laboratorio eliminato'); setLabShowDelete(false); setLabSelected(null); await loadLabs(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };

  const loadPhases = async () => { setPhaseLoading(true); try { const r = await api.get('/scm/standard-phases'); setPhases(Array.isArray(r.data) ? r.data : []); } catch { showError('Errore caricamento fasi'); } finally { setPhaseLoading(false); } };
  const phaseCreate = async () => {
    setPhaseSaving(true);
    try {
      await api.post('/scm/standard-phases', { nome: phaseNome, codice: phaseCodice || null, descrizione: phaseDesc || null, ordine: phaseOrdine, attivo: phaseAttivo });
      showSuccess('Fase creata'); setPhaseShowCreate(false); setPhaseNome(''); setPhaseCodice(''); setPhaseDesc(''); setPhaseOrdine(0); setPhaseAttivo(true);
      await loadPhases();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setPhaseSaving(false); }
  };
  const phaseEdit = async () => {
    if (!phaseSelected) return; setPhaseSaving(true);
    try {
      await api.put(`/scm/standard-phases/${phaseSelected.id}`, { nome: phaseNome, codice: phaseCodice || null, descrizione: phaseDesc || null, ordine: phaseOrdine, attivo: phaseAttivo });
      showSuccess('Fase aggiornata'); setPhaseShowEdit(false); setPhaseSelected(null); await loadPhases();
    } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setPhaseSaving(false); }
  };
  const phaseDelete = async () => { if (!phaseSelected) return; try { await api.delete(`/scm/standard-phases/${phaseSelected.id}`); showSuccess('Fase eliminata'); setPhaseShowDelete(false); setPhaseSelected(null); await loadPhases(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };

  const labFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice</label><input value={labCodice} onChange={e => setLabCodice(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="es. LAB01" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input value={labNome} onChange={e => setLabNome(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="Nome laboratorio" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Indirizzo</label><input value={labIndirizzo} onChange={e => setLabIndirizzo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="Via, città" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefono</label><input value={labTelefono} onChange={e => setLabTelefono(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="+39 ..." /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><input type="email" value={labEmail} onChange={e => setLabEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice accesso portale</label><input value={labAccessCode} onChange={e => setLabAccessCode(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="es. ABC123" /></div>
      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={labAttivo} onChange={e => setLabAttivo(e.target.checked)} className="w-4 h-4 text-orange-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
    </div>
  );

  const phaseFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label><input value={phaseNome} onChange={e => setPhaseNome(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" /></div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice</label><input value={phaseCodice} onChange={e => setPhaseCodice(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="es. F01" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione</label><input value={phaseDesc} onChange={e => setPhaseDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" /></div>
      <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" min={0} value={phaseOrdine} onChange={e => setPhaseOrdine(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" /></div>
      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={phaseAttivo} onChange={e => setPhaseAttivo(e.target.checked)} className="w-4 h-4 text-orange-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Laboratori */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Laboratori terzisti</h4>
          <button onClick={() => { setLabCodice(''); setLabNome(''); setLabIndirizzo(''); setLabTelefono(''); setLabEmail(''); setLabAccessCode(''); setLabAttivo(true); setLabShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition"><i className="fas fa-plus"></i>Nuovo</button>
        </div>
        {labLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {labs.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.codice || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{item.telefono || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{item.email || '—'}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setLabSelected(item); setLabCodice(item.codice || ''); setLabNome(item.nome); setLabIndirizzo(item.indirizzo || ''); setLabTelefono(item.telefono || ''); setLabEmail(item.email || ''); setLabAccessCode(item.accessCode || ''); setLabAttivo(item.attivo); setLabShowEdit(true); })}{delBtn(() => { setLabSelected(item); setLabShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {labs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-flask text-2xl mb-2 opacity-40 block"></i>Nessun laboratorio</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Fasi standard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Fasi standard</h4>
          <button onClick={() => { setPhaseNome(''); setPhaseCodice(''); setPhaseDesc(''); setPhaseOrdine(phases.length > 0 ? Math.max(...phases.map(p => p.ordine)) + 1 : 0); setPhaseAttivo(true); setPhaseShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition"><i className="fas fa-plus"></i>Nuova</button>
        </div>
        {phaseLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ordine</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {phases.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.codice || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.nome}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs truncate max-w-[200px]">{item.descrizione || '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{item.ordine}</td>
                    <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                    <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setPhaseSelected(item); setPhaseNome(item.nome); setPhaseCodice(item.codice || ''); setPhaseDesc(item.descrizione || ''); setPhaseOrdine(item.ordine); setPhaseAttivo(item.attivo); setPhaseShowEdit(true); })}{delBtn(() => { setPhaseSelected(item); setPhaseShowDelete(true); })}</div></td>
                  </tr>
                ))}
                {phases.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-tasks text-2xl mb-2 opacity-40 block"></i>Nessuna fase standard</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS LABORATORI */}
      {labShowCreate && <CrudModal title="Nuovo laboratorio" wide onClose={() => setLabShowCreate(false)} onConfirm={labCreate} saving={labSaving} confirmLabel="Crea" confirmDisabled={!labNome.trim()}>{labFields}</CrudModal>}
      {labShowEdit && labSelected && <CrudModal title="Modifica laboratorio" wide onClose={() => { setLabShowEdit(false); setLabSelected(null); }} onConfirm={labEdit} saving={labSaving} confirmDisabled={!labNome.trim()}>{labFields}</CrudModal>}
      {labShowDelete && labSelected && <DeleteModal label={labSelected.nome} onClose={() => { setLabShowDelete(false); setLabSelected(null); }} onConfirm={labDelete} />}

      {/* MODALS FASI */}
      {phaseShowCreate && <CrudModal title="Nuova fase standard" onClose={() => setPhaseShowCreate(false)} onConfirm={phaseCreate} saving={phaseSaving} confirmLabel="Crea" confirmDisabled={!phaseNome.trim()}>{phaseFields}</CrudModal>}
      {phaseShowEdit && phaseSelected && <CrudModal title="Modifica fase standard" onClose={() => { setPhaseShowEdit(false); setPhaseSelected(null); }} onConfirm={phaseEdit} saving={phaseSaving} confirmDisabled={!phaseNome.trim()}>{phaseFields}</CrudModal>}
      {phaseShowDelete && phaseSelected && <DeleteModal label={phaseSelected.nome} onClose={() => { setPhaseShowDelete(false); setPhaseSelected(null); }} onConfirm={phaseDelete} />}
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

export default function ScmSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('impostazioni');
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'impostazioni', icon: 'fa-sliders-h', label: 'Impostazioni' },
    ...(JOBS.length > 0 ? [{ id: 'jobs' as Tab, icon: 'fa-cogs', label: 'Jobs collegati' }] : []),
  ];
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 shadow"><i className="fas fa-truck text-white text-xl"></i></div>
          <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Supply Chain Management</h3><p className="text-sm text-gray-500 dark:text-gray-400">Laboratori terzisti e fasi standard</p></div>
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
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
