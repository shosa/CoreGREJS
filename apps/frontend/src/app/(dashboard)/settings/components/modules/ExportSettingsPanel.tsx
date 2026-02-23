'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { exportApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';

type Tab = 'impostazioni' | 'jobs';

interface Terzista { id: number; ragioneSociale: string; nazione?: string; attivo: boolean; indirizzo1?: string; }
interface AspettoM { id: number; descrizione: string; codice?: string; ordine?: number; attivo: boolean; }
interface Vettore     { id: number; ragioneSociale: string; codice?: string; indirizzo?: string; telefono?: string; ordine?: number; attivo: boolean; }

const JOBS = [
  { key: 'export.segnacolli-pdf',       label: 'Segnacolli PDF',        desc: 'Genera le etichette segnacolli in PDF per i colli del lotto di esportazione.', output: 'PDF' },
  { key: 'export.griglia-materiali-pdf', label: 'Griglia Materiali PDF', desc: 'Genera la griglia materiali in PDF con l\'elenco dettagliato per terzista e commessa.', output: 'PDF' },
  { key: 'export.ddt-completo-pdf',      label: 'DDT Completo PDF',      desc: 'Genera il Documento di Trasporto completo in PDF.', output: 'PDF' },
  { key: 'export.ddt-excel',             label: 'DDT Excel',             desc: 'Esporta i dati del DDT in formato Excel.', output: 'XLSX' },
  { key: 'export.download-excel',        label: 'Download Dati Excel',   desc: 'Esporta i dati grezzi di esportazione in formato Excel.', output: 'XLSX' },
];

function CrudModal({ title, children, onClose, onConfirm, saving, confirmLabel = 'Salva', confirmDisabled = false, wide = false }: {
  title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; saving: boolean; confirmLabel?: string; confirmDisabled?: boolean; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">Annulla</button>
          <button onClick={onConfirm} disabled={saving || confirmDisabled} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Salvataggio...' : confirmLabel}</button>
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
  const spinner = <div className="py-6 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-7 w-7 rounded-full border-2 border-indigo-500 border-t-transparent" /></div>;
  const badgeStato = (a: boolean) => <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${a ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{a ? 'Attivo' : 'Inattivo'}</span>;
  const editBtn = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400"><i className="fas fa-edit text-xs"></i></button>;
  const delBtn  = (fn: () => void) => <button onClick={fn} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><i className="fas fa-trash text-xs"></i></button>;
  const inp = (value: string, onChange: (v: string) => void, placeholder = '') => <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />;

  // Terzisti
  const [terzisti, setTerzisti] = useState<Terzista[]>([]);
  const [terLoading, setTerLoading] = useState(true);
  const [terSaving, setTerSaving] = useState(false);
  const [terShowCreate, setTerShowCreate] = useState(false);
  const [terShowEdit, setTerShowEdit] = useState(false);
  const [terShowDelete, setTerShowDelete] = useState(false);
  const [terSelected, setTerSelected] = useState<Terzista | null>(null);
  const [terRS, setTerRS] = useState('');
  const [terNazione, setTerNazione] = useState('');
  const [terIndirizzo, setTerIndirizzo] = useState('');
  const [terAttivo, setTerAttivo] = useState(true);

  // Aspetto Merce
  const [aspetti, setAspetti] = useState<AspettoM[]>([]);
  const [aspLoading, setAspLoading] = useState(true);
  const [aspSaving, setAspSaving] = useState(false);
  const [aspShowCreate, setAspShowCreate] = useState(false);
  const [aspShowEdit, setAspShowEdit] = useState(false);
  const [aspShowDelete, setAspShowDelete] = useState(false);
  const [aspSelected, setAspSelected] = useState<AspettoM | null>(null);
  const [aspDesc, setAspDesc] = useState('');
  const [aspCodice, setAspCodice] = useState('');
  const [aspOrdine, setAspOrdine] = useState(0);
  const [aspAttivo, setAspAttivo] = useState(true);

  // Vettori
  const [vettori, setVettori] = useState<Vettore[]>([]);
  const [vetLoading, setVetLoading] = useState(true);
  const [vetSaving, setVetSaving] = useState(false);
  const [vetShowCreate, setVetShowCreate] = useState(false);
  const [vetShowEdit, setVetShowEdit] = useState(false);
  const [vetShowDelete, setVetShowDelete] = useState(false);
  const [vetSelected, setVetSelected] = useState<Vettore | null>(null);
  const [vetRS, setVetRS] = useState('');
  const [vetCodice, setVetCodice] = useState('');
  const [vetIndirizzo, setVetIndirizzo] = useState('');
  const [vetTelefono, setVetTelefono] = useState('');
  const [vetOrdine, setVetOrdine] = useState(0);
  const [vetAttivo, setVetAttivo] = useState(true);

  useEffect(() => { loadTerzisti(); loadAspetti(); loadVettori(); }, []);

  const loadTerzisti = async () => { setTerLoading(true); try { setTerzisti(await exportApi.getTerzisti(false)); } catch { showError('Errore caricamento terzisti'); } finally { setTerLoading(false); } };
  const terCreate = async () => { setTerSaving(true); try { await exportApi.createTerzista({ ragioneSociale: terRS, nazione: terNazione || undefined, indirizzo1: terIndirizzo || undefined }); showSuccess('Terzista creato'); setTerShowCreate(false); resetTer(); await loadTerzisti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setTerSaving(false); } };
  const terEdit = async () => { if (!terSelected) return; setTerSaving(true); try { await exportApi.updateTerzista(terSelected.id, { ragioneSociale: terRS, nazione: terNazione || undefined, indirizzo1: terIndirizzo || undefined, attivo: terAttivo }); showSuccess('Terzista aggiornato'); setTerShowEdit(false); setTerSelected(null); resetTer(); await loadTerzisti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setTerSaving(false); } };
  const terDelete = async () => { if (!terSelected) return; try { await exportApi.deleteTerzista(terSelected.id); showSuccess('Terzista eliminato'); setTerShowDelete(false); setTerSelected(null); await loadTerzisti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };
  const resetTer = () => { setTerRS(''); setTerNazione(''); setTerIndirizzo(''); setTerAttivo(true); };

  const loadAspetti = async () => { setAspLoading(true); try { setAspetti(await exportApi.getAllAspettoMerce(false)); } catch { showError('Errore caricamento aspetto merce'); } finally { setAspLoading(false); } };
  const aspCreate = async () => { setAspSaving(true); try { await exportApi.createAspettoMerce({ descrizione: aspDesc, codice: aspCodice || undefined, ordine: aspOrdine || undefined }); showSuccess('Aspetto creato'); setAspShowCreate(false); resetAsp(); await loadAspetti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setAspSaving(false); } };
  const aspEdit = async () => { if (!aspSelected) return; setAspSaving(true); try { await exportApi.updateAspettoMerce(aspSelected.id, { descrizione: aspDesc, codice: aspCodice, ordine: aspOrdine, attivo: aspAttivo }); showSuccess('Aspetto aggiornato'); setAspShowEdit(false); setAspSelected(null); resetAsp(); await loadAspetti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setAspSaving(false); } };
  const aspDelete = async () => { if (!aspSelected) return; try { await exportApi.deleteAspettoMerce(aspSelected.id); showSuccess('Aspetto eliminato'); setAspShowDelete(false); setAspSelected(null); await loadAspetti(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };
  const resetAsp = () => { setAspDesc(''); setAspCodice(''); setAspOrdine(0); setAspAttivo(true); };

  const loadVettori = async () => { setVetLoading(true); try { setVettori(await exportApi.getAllVettori(false)); } catch { showError('Errore caricamento vettori'); } finally { setVetLoading(false); } };
  const vetCreate = async () => { setVetSaving(true); try { await exportApi.createVettore({ ragioneSociale: vetRS, codice: vetCodice || undefined, indirizzo: vetIndirizzo || undefined, telefono: vetTelefono || undefined, ordine: vetOrdine || undefined }); showSuccess('Vettore creato'); setVetShowCreate(false); resetVet(); await loadVettori(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setVetSaving(false); } };
  const vetEdit = async () => { if (!vetSelected) return; setVetSaving(true); try { await exportApi.updateVettore(vetSelected.id, { ragioneSociale: vetRS, codice: vetCodice, indirizzo: vetIndirizzo, telefono: vetTelefono, ordine: vetOrdine, attivo: vetAttivo }); showSuccess('Vettore aggiornato'); setVetShowEdit(false); setVetSelected(null); resetVet(); await loadVettori(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } finally { setVetSaving(false); } };
  const vetDelete = async () => { if (!vetSelected) return; try { await exportApi.deleteVettore(vetSelected.id); showSuccess('Vettore eliminato'); setVetShowDelete(false); setVetSelected(null); await loadVettori(); } catch (e: any) { showError(e.response?.data?.message || 'Errore'); } };
  const resetVet = () => { setVetRS(''); setVetCodice(''); setVetIndirizzo(''); setVetTelefono(''); setVetOrdine(0); setVetAttivo(true); };

  const section = (title: string, btn: React.ReactNode, content: React.ReactNode) => (
    <div>
      <div className="flex items-center justify-between mb-3"><h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</h4>{btn}</div>
      {content}
    </div>
  );
  const newBtn = (label: string, onClick: () => void) => <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition"><i className="fas fa-plus"></i>{label}</button>;

  return (
    <div className="space-y-8">
      {/* Terzisti */}
      {section('Terzisti', newBtn('Nuovo', () => { resetTer(); setTerShowCreate(true); }),
        terLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ragione Sociale</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nazione</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {terzisti.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.ragioneSociale}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{item.nazione || '—'}</td>
                  <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                  <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setTerSelected(item); setTerRS(item.ragioneSociale); setTerNazione(item.nazione || ''); setTerIndirizzo(item.indirizzo1 || ''); setTerAttivo(item.attivo); setTerShowEdit(true); })}{delBtn(() => { setTerSelected(item); setTerShowDelete(true); })}</div></td>
                </tr>
              ))}
              {terzisti.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-user-check text-2xl mb-2 opacity-40 block"></i>Nessun terzista</td></tr>}
            </tbody></table>
          </div>
        )
      )}

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Aspetto Merce */}
      {section('Aspetto Merce', newBtn('Nuovo', () => { resetAsp(); setAspShowCreate(true); }),
        aspLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {aspetti.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.descrizione}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{item.codice || '—'}</td>
                  <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                  <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setAspSelected(item); setAspDesc(item.descrizione); setAspCodice(item.codice || ''); setAspOrdine(item.ordine ?? 0); setAspAttivo(item.attivo); setAspShowEdit(true); })}{delBtn(() => { setAspSelected(item); setAspShowDelete(true); })}</div></td>
                </tr>
              ))}
              {aspetti.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-box-open text-2xl mb-2 opacity-40 block"></i>Nessun aspetto merce</td></tr>}
            </tbody></table>
          </div>
        )
      )}

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Vettori */}
      {section('Vettori', newBtn('Nuovo', () => { resetVet(); setVetShowCreate(true); }),
        vetLoading ? spinner : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ragione Sociale</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {vettori.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.ragioneSociale}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{item.codice || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{item.telefono || '—'}</td>
                  <td className="px-4 py-2.5 text-center">{badgeStato(item.attivo)}</td>
                  <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-1.5">{editBtn(() => { setVetSelected(item); setVetRS(item.ragioneSociale); setVetCodice(item.codice || ''); setVetIndirizzo(item.indirizzo || ''); setVetTelefono(item.telefono || ''); setVetOrdine(item.ordine ?? 0); setVetAttivo(item.attivo); setVetShowEdit(true); })}{delBtn(() => { setVetSelected(item); setVetShowDelete(true); })}</div></td>
                </tr>
              ))}
              {vettori.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400"><i className="fas fa-truck text-2xl mb-2 opacity-40 block"></i>Nessun vettore</td></tr>}
            </tbody></table>
          </div>
        )
      )}

      {/* MODALS TERZISTI */}
      {(terShowCreate || (terShowEdit && terSelected)) && <CrudModal wide title={terShowCreate ? 'Nuovo Terzista' : 'Modifica Terzista'} onClose={() => { setTerShowCreate(false); setTerShowEdit(false); setTerSelected(null); }} onConfirm={terShowCreate ? terCreate : terEdit} saving={terSaving} confirmLabel={terShowCreate ? 'Crea' : 'Salva'} confirmDisabled={!terRS.trim()}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ragione Sociale *</label>{inp(terRS, setTerRS)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazione</label>{inp(terNazione, setTerNazione, 'Es. IT, FR...')}</div>
          <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Indirizzo</label>{inp(terIndirizzo, setTerIndirizzo)}</div>
          <label className="col-span-2 flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={terAttivo} onChange={e => setTerAttivo(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {terShowDelete && terSelected && <DeleteModal label={terSelected.ragioneSociale} onClose={() => { setTerShowDelete(false); setTerSelected(null); }} onConfirm={terDelete} />}

      {/* MODALS ASPETTO MERCE */}
      {(aspShowCreate || (aspShowEdit && aspSelected)) && <CrudModal title={aspShowCreate ? 'Nuovo Aspetto Merce' : 'Modifica Aspetto Merce'} onClose={() => { setAspShowCreate(false); setAspShowEdit(false); setAspSelected(null); }} onConfirm={aspShowCreate ? aspCreate : aspEdit} saving={aspSaving} confirmLabel={aspShowCreate ? 'Crea' : 'Salva'} confirmDisabled={!aspDesc.trim()}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione *</label>{inp(aspDesc, setAspDesc)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice</label>{inp(aspCodice, setAspCodice)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={aspOrdine} onChange={e => setAspOrdine(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aspAttivo} onChange={e => setAspAttivo(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {aspShowDelete && aspSelected && <DeleteModal label={aspSelected.descrizione} onClose={() => { setAspShowDelete(false); setAspSelected(null); }} onConfirm={aspDelete} />}

      {/* MODALS VETTORI */}
      {(vetShowCreate || (vetShowEdit && vetSelected)) && <CrudModal wide title={vetShowCreate ? 'Nuovo Vettore' : 'Modifica Vettore'} onClose={() => { setVetShowCreate(false); setVetShowEdit(false); setVetSelected(null); }} onConfirm={vetShowCreate ? vetCreate : vetEdit} saving={vetSaving} confirmLabel={vetShowCreate ? 'Crea' : 'Salva'} confirmDisabled={!vetRS.trim()}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ragione Sociale *</label>{inp(vetRS, setVetRS)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Codice</label>{inp(vetCodice, setVetCodice)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefono</label>{inp(vetTelefono, setVetTelefono)}</div>
          <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Indirizzo</label>{inp(vetIndirizzo, setVetIndirizzo)}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordine</label><input type="number" value={vetOrdine} onChange={e => setVetOrdine(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></div>
          <label className="flex items-center gap-2 cursor-pointer mt-6"><input type="checkbox" checked={vetAttivo} onChange={e => setVetAttivo(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attivo</span></label>
        </div>
      </CrudModal>}
      {vetShowDelete && vetSelected && <DeleteModal label={vetSelected.ragioneSociale} onClose={() => { setVetShowDelete(false); setVetSelected(null); }} onConfirm={vetDelete} />}
    </div>
  );
}

function JobsTab() {
  const badge: Record<string, string> = { PDF: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', XLSX: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' };
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

export default function ExportSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('impostazioni');
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'impostazioni', icon: 'fa-sliders-h', label: 'Impostazioni' },
    ...(JOBS.length > 0 ? [{ id: 'jobs' as Tab, icon: 'fa-cogs', label: 'Jobs collegati' }] : []),
  ];
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 shadow"><i className="fas fa-globe-europe text-white text-xl"></i></div>
          <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Export / DDT</h3><p className="text-sm text-gray-500 dark:text-gray-400">Configurazione del modulo export e DDT</p></div>
        </div>
      </div>
      {tabs.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
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
