'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { riparazioniApi, jobsApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Footer from '@/components/layout/Footer';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Laboratorio {
  id: number;
  nome: string;
}

interface Reparto {
  id: number;
  nome: string;
}

interface Numerata {
  id: number;
  n01?: string;
  n02?: string;
  n03?: string;
  n04?: string;
  n05?: string;
  n06?: string;
  n07?: string;
  n08?: string;
  n09?: string;
  n10?: string;
  n11?: string;
  n12?: string;
  n13?: string;
  n14?: string;
  n15?: string;
  n16?: string;
  n17?: string;
  n18?: string;
  n19?: string;
  n20?: string;
}

interface ArticleData {
  codiceArticolo: string;
  descrizione: string;
  cartellino: string;
  commessa: string;
  ragioneSociale: string;
  totale: number;
  numerataId: number;
  nu?: number; // NU field from core_dati
}

export default function CreateRiparazionePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Step 1: Input cartellino/commessa
  const [step, setStep] = useState<1 | 2>(1);
  const [searching, setSearching] = useState(false);
  const [cartellinoInput, setCartellinoInput] = useState('');

  // Step 2: Form data
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [numerata, setNumerata] = useState<Numerata | null>(null);
  const [laboratori, setLaboratori] = useState<Laboratorio[]>([]);
  const [reparti, setReparti] = useState<Reparto[]>([]);

  const [laboratorioId, setLaboratorioId] = useState<number | null>(null);
  const [repartoId, setRepartoId] = useState<number | null>(null);
  const [causale, setCausale] = useState('');

  // Taglie p01-p20
  const [taglieCartellino, setTaglieCartellino] = useState<Record<string, number>>({});
  const [taglie, setTaglie] = useState<Record<string, number>>({});

  const [creating, setCreating] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true); // Checkbox for auto-print, enabled by default

  useEffect(() => {
    fetchSupportData();
  }, []);

  const fetchSupportData = async () => {
    try {
      const [labData, repData] = await Promise.all([
        riparazioniApi.getLaboratori(),
        riparazioniApi.getReparti(),
      ]);
      setLaboratori(labData);
      setReparti(repData);
    } catch (error) {
      showError('Errore nel caricamento dei dati');
    }
  };

  const handleSearchCartellino = async () => {
    if (!cartellinoInput.trim()) {
      showError('Inserisci un cartellino o commessa');
      return;
    }

    setSearching(true);

    try {
      // Carica dati del cartellino da core_dati
      const cartellinoData = await riparazioniApi.getCartellinoData(cartellinoInput);

      const articleData: ArticleData = {
        codiceArticolo: cartellinoData.codiceArticolo,
        descrizione: cartellinoData.descrizione,
        cartellino: cartellinoData.cartellino,
        commessa: cartellinoData.commessa,
        ragioneSociale: cartellinoData.ragioneSociale,
        totale: cartellinoData.totale,
        numerataId: cartellinoData.numerataId,
        nu: cartellinoData.nu, // Include NU for redirect
      };

      setArticleData(articleData);

      // If no numerataId in core_dati, redirect to numerata page with NU value
      if (!articleData.numerataId) {
        setSearching(false);
        showError('Nessuna numerata associata. Creane una prima di procedere.');
        // Redirect to numerate page with create modal params
        if (articleData.nu) {
          router.push(`/riparazioni/numerate?create=true&id_numerata=${articleData.nu}`);
        } else {
          router.push('/riparazioni/numerate?create=true');
        }
        return;
      }

      let numerataData;
      try {
        numerataData = await riparazioniApi.getNumerata(cartellinoData.numerataId);
        setNumerata(numerataData);
      } catch (error: any) {
        // Numerata doesn't exist - redirect to create it
        const statusCode = error.response?.status || error.status;

        if (statusCode === 404) {
          setSearching(false);
          showError('Numerata non trovata. Creane una prima di procedere.');
          router.push(`/riparazioni/numerate?create=true&id_numerata=${cartellinoData.numerataId}`);
          return;
        }

        // For other errors, re-throw to be handled by outer catch
        throw error;
      }

      // Salva le quantità del cartellino (per visualizzazione)
      const qtaCartellino: Record<string, number> = {};
      for (let i = 1; i <= 20; i++) {
        const field = `p${String(i).padStart(2, '0')}`;
        qtaCartellino[field] = cartellinoData[field] || 0;
      }
      setTaglieCartellino(qtaCartellino);

      // Inizializza taglie da riparare a 0
      const initialTaglie: Record<string, number> = {};
      for (let i = 1; i <= 20; i++) {
        const field = `p${String(i).padStart(2, '0')}`;
        initialTaglie[field] = 0;
      }
      setTaglie(initialTaglie);

      setStep(2);
      setSearching(false);
    } catch (error: any) {
      setSearching(false);
      showError(error.response?.data?.message || 'Cartellino non trovato');
    }
  };

  const handleTagliaChange = (field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setTaglie(prev => ({ ...prev, [field]: numValue }));
  };

  const handleCreate = async () => {
    if (!articleData) return;

    if (!laboratorioId) {
      showError('Seleziona un laboratorio');
      return;
    }

    try {
      setCreating(true);

      const nextId = await riparazioniApi.getNextId();

      const createdRiparazione = await riparazioniApi.createRiparazione({
        idRiparazione: nextId.idRiparazione,
        cartellino: articleData.cartellino,
        numerataId: articleData.numerataId,
        userId: user?.id, // Add logged-in user ID
        laboratorioId,
        repartoId: repartoId || undefined,
        causale: causale || undefined,
        data: new Date().toISOString(),
        ...taglie, // Spread p01-p20
      });

      showSuccess('Riparazione creata con successo!');

      // Auto-print if checkbox is enabled
      if (autoPrint && createdRiparazione?.id) {
        try {
          const { jobId } = await jobsApi.enqueue('riparazioni.cedola-pdf', { id: createdRiparazione.id });
          showSuccess(`Stampa avviata automaticamente. Job ${jobId} nello spool`);
        } catch (error: any) {
          showError(error.response?.data?.message || 'Errore nella stampa automatica');
        }
      }

      router.push('/riparazioni/list');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nella creazione della riparazione');
    } finally {
      setCreating(false);
    }
  };

  const calculateTotal = () => {
    return Object.values(taglie).reduce((sum, val) => sum + val, 0);
  };

  // Build taglie display array
  const taglieArray: Array<{ field: string; nome: string; qta: number }> = [];
  if (numerata) {
    for (let i = 1; i <= 20; i++) {
      const pField = `p${String(i).padStart(2, '0')}`;
      const nField = `n${String(i).padStart(2, '0')}` as keyof Numerata;
      const nome = numerata[nField] || `T${i}`;
      const qta = taglie[pField] || 0;

      if (nome && nome !== '') {
        taglieArray.push({ field: pField, nome: String(nome), qta });
      }
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Nuova Riparazione"
        subtitle="Creazione riparazione esterna"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Riparazioni', href: '/riparazioni' },
          { label: 'Nuova Riparazione' },
        ]}
      />

      <AnimatePresence mode="wait">
        {step === 1 ? (
          /* STEP 1: Input Cartellino/Commessa */
          <motion.div
            key="step1"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={itemVariants}
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg mb-4">
                <i className="fas fa-barcode text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Ricerca Articolo
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Inserisci il cartellino o la commessa per caricare i dettagli
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cartellino / Commessa *
                </label>
                <input
                  type="text"
                  value={cartellinoInput}
                  onChange={(e) => setCartellinoInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchCartellino()}
                  placeholder="Inserisci cartellino o commessa..."
                  autoFocus
                  className="w-full px-4 py-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <i className="fas fa-info-circle mr-1"></i>
                  Premi Invio o clicca "Cerca" per continuare
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/riparazioni/list')}
                  className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <i className="fas fa-times mr-2"></i>
                  Annulla
                </button>

                <button
                  onClick={handleSearchCartellino}
                  disabled={searching || !cartellinoInput.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {searching ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Ricerca...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search mr-2"></i>
                      Cerca
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* STEP 2: Form con dettagli e taglie */
          <motion.div
            key="step2"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className="space-y-6 max-w-6xl mx-auto"
          >
            {/* Dettagli Articolo */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <i className="fas fa-info-circle text-blue-500 mr-2"></i>
                  Dettagli Articolo
                </h3>
                <button
                  onClick={() => {
                    setStep(1);
                    setArticleData(null);
                    setNumerata(null);
                    setCartellinoInput('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <i className="fas fa-edit mr-1"></i>
                  Cambia articolo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Codice Articolo
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {articleData?.codiceArticolo}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Descrizione
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {articleData?.descrizione}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Cartellino
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {articleData?.cartellino}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Commessa
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white">
                    {articleData?.commessa}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Ragione Sociale
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {articleData?.ragioneSociale}
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                    Totale Paia
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {articleData?.totale}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Griglia Taglie */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <i className="fas fa-ruler text-blue-500 mr-2"></i>
                Taglie da Riparare
              </h3>

              {/* Tabella Taglie - 3 righe: ID Taglia, Qta Cartellino, Input Riparazione */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col className="w-28" />
                    {taglieArray.map((taglia) => (
                      <col key={`col-${taglia.field}`} className="w-12" />
                    ))}
                  </colgroup>
                  <tbody>
                    {/* Riga 1: ID Taglia */}
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 sticky left-0 z-10">
                        ID Taglia
                      </td>
                      {taglieArray.map((taglia) => (
                        <td
                          key={`nome-${taglia.field}`}
                          className="py-2 px-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50"
                        >
                          {taglia.nome}
                        </td>
                      ))}
                    </tr>

                    {/* Riga 2: Qta Cartellino */}
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 sticky left-0 z-10">
                        Qta Cartellino
                      </td>
                      {taglieArray.map((taglia) => (
                        <td
                          key={`cart-${taglia.field}`}
                          className="py-2 px-1 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        >
                          {taglieCartellino[taglia.field] || 0}
                        </td>
                      ))}
                    </tr>

                    {/* Riga 3: Input Riparazione */}
                    <tr>
                      <td className="py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 sticky left-0 z-10">
                        Qta Riparazione
                      </td>
                      {taglieArray.map((taglia) => (
                        <td key={`input-${taglia.field}`} className="py-2 px-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={taglia.qta || ''}
                            onChange={(e) => handleTagliaChange(taglia.field, e.target.value)}
                            className="w-full px-1 py-1 text-center text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-right pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Totale da riparare:</span>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {calculateTotal()} paia
                </span>
              </div>
            </motion.div>

            {/* Form Riparazione */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <i className="fas fa-cogs text-blue-500 mr-2"></i>
                Dati Riparazione
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Laboratorio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-flask text-blue-500 mr-1"></i>
                      Laboratorio (Destinazione) *
                    </label>
                    <select
                      value={laboratorioId || ''}
                      onChange={(e) => setLaboratorioId(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleziona laboratorio...</option>
                      {laboratori.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          {lab.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reparto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <i className="fas fa-industry text-blue-500 mr-1"></i>
                      Reparto (Origine)
                    </label>
                    <select
                      value={repartoId || ''}
                      onChange={(e) => setRepartoId(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleziona reparto...</option>
                      {reparti.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Causale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-exclamation-circle text-orange-500 mr-1"></i>
                    Causale
                  </label>
                  <textarea
                    value={causale}
                    onChange={(e) => setCausale(e.target.value)}
                    placeholder="Descrivi il problema o la causale della riparazione..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer show={step === 2 && !!articleData}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg shadow-sm">
              {calculateTotal()}
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Totale taglie</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{calculateTotal()} paia</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => {
                setStep(1);
                setArticleData(null);
                setNumerata(null);
                setCartellinoInput('');
              }}
              className="px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Indietro
            </button>

            <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                <i className="fas fa-print mr-1"></i>
                Stampa
              </span>
            </label>

            <button
              onClick={handleCreate}
              disabled={creating || !laboratorioId || calculateTotal() === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {creating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creazione...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle mr-2"></i>
                  Crea Riparazione
                </>
              )}
            </button>
          </div>
        </div>
      </Footer>
    </motion.div>
  );
}
