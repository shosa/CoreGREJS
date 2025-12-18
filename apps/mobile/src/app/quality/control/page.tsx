'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useHydration } from '@/store/auth';
import { qualityApi, mobileApi } from '@/lib/api';
import ExceptionModal from '@/components/ExceptionModal';

interface CartollinoDetails {
  numero?: string;
  cartellino?: string;
  details?: {
    cartellino_info?: {
      codice_articolo?: string;
      descrizione_articolo?: string;
      cliente?: string;
      paia?: string;
    };
    linea_info?: {
      sigla?: string;
      descrizione?: string;
    };
    numerata?: string;
  };
  codice_articolo?: string;
  descrizione_articolo?: string;
  cliente?: string;
  paia?: string;
  linea?: string;
  numerata?: string;
}

interface Options {
  reparti_hermes?: Array<{ id: string; nome: string }>;
  difetti?: Array<{ id: number; descrizione: string; categoria?: string }>;
  calzate?: string[];
  taglie?: Array<{ nome: string }>;
}

interface Eccezione {
  id: number;
  taglia: string;
  tipo_difetto: string;
  note_operatore: string;
  fotoPath?: string;
  photoPreview?: string;
}

function QualityControlContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const hasHydrated = useHydration();
  const cartellino = searchParams.get('cartellino');

  const [cartollinoData, setCartollinoData] = useState<CartollinoDetails | null>(null);
  const [options, setOptions] = useState<Options>({
    reparti_hermes: [],
    difetti: [],
    calzate: [],
    taglie: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    reparto: '',
    tipo_cq: 'INTERNO',
    note: '',
  });
  const [eccezioni, setEccezioni] = useState<Eccezione[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEccezione, setCurrentEccezione] = useState<Eccezione | null>(null);
  const [successModal, setSuccessModal] = useState(false);

  useEffect(() => {
    // Aspetta che lo store si sia idratato prima di controllare l'auth
    if (!hasHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }
    if (!cartellino) {
      router.push('/quality/insert');
      return;
    }
    loadData();
  }, [cartellino, user, hasHydrated, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const detailsResponse = await qualityApi.getCartollinoDetails(cartellino!);
      if (detailsResponse.status === 'success') {
        setCartollinoData(detailsResponse.data);
      } else {
        setError('Errore caricamento dettagli cartellino');
        return;
      }

      const systemResponse = await mobileApi.getSystemData('quality');
      const optionsResponse = await qualityApi.getOptions(cartellino!);

      if (systemResponse.status === 'success' && optionsResponse.status === 'success') {
        const systemData = systemResponse.data;
        const optionsData = optionsResponse.data;

        let taglieData: any[] = [];
        try {
          const numerata =
            detailsResponse.data?.details?.numerata || detailsResponse.data?.numerata || 'uf';
          const taglieResponse = await mobileApi.getSystemData('quality', numerata);
          if (taglieResponse.status === 'success' && taglieResponse.data?.taglie) {
            taglieData = taglieResponse.data.taglie;
          }
        } catch (taglieErr) {
          console.error('Errore caricamento taglie:', taglieErr);
          taglieData = optionsData.taglie || systemData.taglie || [];
        }

        setOptions({
          reparti_hermes: optionsData.reparti_hermes || systemData.reparti_hermes || [],
          difetti: optionsData.difetti || systemData.difetti || [],
          calzate: optionsData.calzate || systemData.calzate || [],
          taglie:
            taglieData.length > 0 ? taglieData : optionsData.taglie || systemData.taglie || [],
        });
      } else {
        setError('Errore caricamento opzioni');
      }
    } catch (err: any) {
      console.error('Errore caricamento dati:', err);
      setError(err.message || 'Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const addEccezione = () => {
    setCurrentEccezione(null);
    setModalOpen(true);
  };

  const editEccezione = (eccezione: Eccezione) => {
    setCurrentEccezione(eccezione);
    setModalOpen(true);
  };

  const removeEccezione = (id: number) => {
    setEccezioni(eccezioni.filter((e) => e.id !== id));
  };

  const handleSaveEccezione = (eccezioneData: Eccezione) => {
    if (currentEccezione) {
      setEccezioni(eccezioni.map((e) => (e.id === currentEccezione.id ? eccezioneData : e)));
    } else {
      setEccezioni([...eccezioni, eccezioneData]);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.reparto) {
        setError('Seleziona un reparto');
        return;
      }

      setSaving(true);
      setError('');

      const data = {
        numero_cartellino: cartollinoData?.numero || cartollinoData?.cartellino,
        reparto: formData.reparto,
        operatore: user!.user,
        tipo_cq: formData.tipo_cq,
        paia_totali:
          cartollinoData?.details?.cartellino_info?.paia || cartollinoData?.paia || '0',
        cod_articolo:
          cartollinoData?.details?.cartellino_info?.codice_articolo ||
          cartollinoData?.codice_articolo,
        articolo:
          cartollinoData?.details?.cartellino_info?.descrizione_articolo ||
          cartollinoData?.descrizione_articolo,
        linea: cartollinoData?.details?.linea_info?.sigla || cartollinoData?.linea || '01',
        note: formData.note,
        user: user!.user,
        eccezioni: eccezioni.map((e) => ({
          taglia: e.taglia,
          tipo_difetto: e.tipo_difetto,
          note_operatore: e.note_operatore,
          fotoPath: e.fotoPath || '',
        })),
      };

      const response = await qualityApi.saveHermesCq(data);
      if (response.status === 'success') {
        setSuccessModal(true);
        setTimeout(() => {
          setSuccessModal(false);
          router.push('/quality');
        }, 2000);
      } else {
        setError(response.message || 'Errore nel salvataggio');
      }
    } catch (err: any) {
      console.error('Errore salvataggio:', err);
      setError(err.message || 'Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const getDifettoDescrizione = (difettoId: string) => {
    const difetto = options.difetti?.find((d) => d.id === parseInt(difettoId));
    return difetto ? difetto.descrizione : difettoId;
  };

  // Mostra loading se lo store non è ancora idratato o se stiamo caricando i dati
  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md z-50">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => router.push('/quality/insert')}
              className="p-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Controllo Qualità</h1>
            <div className="w-10"></div>
          </div>
        </div>

        <div className="pt-20 flex flex-col items-center justify-center px-4">
          <svg
            className="animate-spin h-12 w-12 text-primary mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md z-50">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.push('/quality/insert')}
            className="p-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Controllo Qualità</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-6 px-4">
        {/* Cartellino Info */}
        <div className="card-mobile p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Informazioni Cartellino
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cartellino:</span>
              <span className="font-semibold text-gray-800">
                {cartollinoData?.numero || cartollinoData?.cartellino}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Articolo:</span>
              <span className="font-semibold text-gray-800 text-right">
                {cartollinoData?.details?.cartellino_info?.descrizione_articolo ||
                  cartollinoData?.descrizione_articolo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Codice:</span>
              <span className="font-semibold text-gray-800">
                {cartollinoData?.details?.cartellino_info?.codice_articolo ||
                  cartollinoData?.codice_articolo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-semibold text-gray-800 text-right">
                {cartollinoData?.details?.cartellino_info?.cliente || cartollinoData?.cliente}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paia:</span>
              <span className="font-semibold text-gray-800">
                {cartollinoData?.details?.cartellino_info?.paia || cartollinoData?.paia}
              </span>
            </div>
          </div>
        </div>

        {/* Dati Controllo */}
        <div className="card-mobile p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Dati Controllo
          </h2>

          <div className="space-y-4">
            {/* Reparto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reparto Hermes <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {options.reparti_hermes?.map((rep) => (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, reparto: rep.id.toString() })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                      formData.reparto === rep.id.toString()
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {rep.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo Controllo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Controllo *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    formData.tipo_cq === 'INTERNO'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, tipo_cq: 'INTERNO' })}
                >
                  INTERNO
                </button>
                <button
                  type="button"
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    formData.tipo_cq === 'GRIFFE'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, tipo_cq: 'GRIFFE' })}
                >
                  GRIFFE
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
              <textarea
                className="input-mobile resize-none"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Inserisci note sul controllo..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Eccezioni */}
        <div className="card-mobile p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Eccezioni ({eccezioni.length})
            </h2>
            <button
              onClick={addEccezione}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              + Aggiungi
            </button>
          </div>

          {eccezioni.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto text-green-500 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600 font-medium">Nessuna eccezione rilevata</p>
              <p className="text-sm text-gray-500 mt-1">Clicca &quot;Aggiungi&quot; per segnalare un difetto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eccezioni.map((eccezione) => (
                <div
                  key={eccezione.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start justify-between"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-600 uppercase">
                        Taglia {eccezione.taglia}
                      </span>
                      {eccezione.photoPreview && (
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 mb-1">
                      {getDifettoDescrizione(eccezione.tipo_difetto)}
                    </div>
                    {eccezione.note_operatore && (
                      <div className="text-xs text-gray-600 truncate">
                        {eccezione.note_operatore}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => editEccezione(eccezione)}
                      className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                      title="Modifica"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEccezione(eccezione.id)}
                      className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                      title="Elimina"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

      </div>

      {/* Footer con azione salva */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-sm px-8 py-2.5 hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="font-medium">Salvataggio...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-medium">Salva Controllo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modale Eccezione */}
      {modalOpen && (
        <ExceptionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEccezione}
          eccezione={currentEccezione}
          options={options}
          cartollinoData={cartollinoData}
        />
      )}

      {/* Modale Successo */}
      {successModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center">
            <svg
              className="w-20 h-20 text-green-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Controllo Salvato!</h2>
            <p className="text-gray-600">Il controllo qualità è stato registrato con successo</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QualityControlPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    }>
      <QualityControlContent />
    </Suspense>
  );
}
