'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { mobileApi, qualityApi } from '@/lib/api';

interface QualityRecord {
  id: number;
  numero_cartellino: string;
  articolo: string;
  reparto: string;
  ora_controllo: string;
  tipo_cq: string;
  numero_eccezioni: number;
}

interface QualityDetails {
  id: number;
  numero_cartellino: string;
  articolo: string;
  reparto: string;
  ora_controllo: string;
  tipo_cq: string;
  note?: string;
  eccezioni: Array<{
    id: number;
    taglia: string;
    tipo_difetto: string;
    descrizione_difetto: string;
    note_operatore?: string;
    fotoPath?: string;
  }>;
}

interface SummaryData {
  data: string;
  summary: {
    totale: number;
    controlli: QualityRecord[];
  };
}

export default function DailySummaryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedControl, setSelectedControl] = useState<QualityDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    loadSummary();
  }, [isAuthenticated, selectedDate]);

  const loadSummary = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const response = await mobileApi.getDailySummary(
        user.id,
        selectedDate,
        'quality'
      );

      if (response.status === 'success') {
        setSummaryData(response.data);
      } else {
        setError('Nessun dato disponibile per questa data');
      }
    } catch (err: any) {
      console.error('Error loading summary:', err);
      setError('Errore nel caricamento del riepilogo');
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadControlDetails = async (controlId: number) => {
    setDetailsLoading(true);
    try {
      const response = await qualityApi.getControlDetails(controlId);
      if (response.status === 'success') {
        setSelectedControl(response.data);
      }
    } catch (err: any) {
      console.error('Error loading control details:', err);
      setError('Errore nel caricamento dei dettagli');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteControl = async () => {
    if (!selectedControl) return;

    setDeleting(true);
    try {
      const response = await qualityApi.deleteControl(selectedControl.id);
      if (response.status === 'success') {
        setSelectedControl(null);
        setDeleteConfirm(false);
        loadSummary(); // Ricarica il riepilogo
      } else {
        setError(response.message || 'Errore nell\'eliminazione del controllo');
      }
    } catch (err: any) {
      console.error('Error deleting control:', err);
      setError(err.response?.data?.message || 'Errore nell\'eliminazione del controllo');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md z-50">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.push('/quality')}
            className="p-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Riepilogo Giornaliero</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-6 px-4">
        {/* Date Picker */}
        <div className="card-mobile p-4 mb-6">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Seleziona Data
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-mobile"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card-mobile p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento riepilogo...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {summaryData && !loading && (
          <>
            <div className="card-mobile p-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Controlli Effettuati</p>
                <p className="text-4xl font-bold text-green-600">{summaryData.summary.totale}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Data: {new Date(selectedDate).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Records List */}
            {summaryData.summary.controlli.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 px-1">Dettaglio Controlli</h3>
                {summaryData.summary.controlli.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => loadControlDetails(record.id)}
                    className="card-mobile p-4 w-full text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-gray-800">
                            Cartellino: {record.numero_cartellino}
                          </span>
                          {record.numero_eccezioni > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                              {record.numero_eccezioni} difetti
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {record.articolo}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700">
                          {record.ora_controllo}
                        </p>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex items-center justify-end text-sm">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        {record.tipo_cq}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="card-mobile p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600 mb-2">Nessun controllo effettuato</p>
                <p className="text-sm text-gray-500">
                  Non ci sono controlli per questa data
                </p>
              </div>
            )}
          </>
        )}

      </div>

      {/* Modal Dettagli Controllo */}
      {(selectedControl || detailsLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg max-h-[90vh] flex flex-col overflow-hidden">
            {detailsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Caricamento dettagli...</p>
              </div>
            ) : selectedControl && (
              <>
                {/* Header Modal - Fisso in alto */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-lg font-semibold">Dettagli Controllo</h2>
                  <button
                    onClick={() => {
                      setSelectedControl(null);
                      setDeleteConfirm(false);
                    }}
                    className="p-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenuto Modal - Scrollabile */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Informazioni Controllo */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cartellino</p>
                        <p className="font-semibold text-gray-800">{selectedControl.numero_cartellino}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ora Controllo</p>
                        <p className="font-semibold text-gray-800">{selectedControl.ora_controllo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Articolo</p>
                        <p className="font-semibold text-gray-800">{selectedControl.articolo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Reparto</p>
                        <p className="font-semibold text-gray-800">{selectedControl.reparto}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Tipo Controllo</p>
                        <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          {selectedControl.tipo_cq}
                        </span>
                      </div>
                    </div>
                    {selectedControl.note && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Note</p>
                        <p className="text-sm text-gray-700">{selectedControl.note}</p>
                      </div>
                    )}
                  </div>

                  {/* Lista Eccezioni */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">
                        Eccezioni ({selectedControl.eccezioni.length})
                      </h3>
                      {selectedControl.eccezioni.length > 0 && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                          {selectedControl.eccezioni.length} difetti
                        </span>
                      )}
                    </div>

                    {selectedControl.eccezioni.length > 0 ? (
                      <div className="space-y-3">
                        {selectedControl.eccezioni.map((eccezione) => (
                          <div key={eccezione.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
                                Taglia {eccezione.taglia}
                              </span>
                              <span className="text-xs text-red-700 font-medium">
                                {eccezione.tipo_difetto}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {eccezione.descrizione_difetto}
                            </p>
                            {eccezione.note_operatore && (
                              <div className="bg-white rounded p-2 text-xs text-gray-600">
                                <span className="font-medium">Note: </span>
                                {eccezione.note_operatore}
                              </div>
                            )}
                            {eccezione.fotoPath && (
                              <div className="mt-2">
                                <img
                                  src={eccezione.fotoPath}
                                  alt="Foto difetto"
                                  className="w-full rounded-lg"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-green-50 rounded-lg">
                        <svg className="w-12 h-12 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-700 font-medium">Nessun difetto rilevato</p>
                        <p className="text-xs text-green-600 mt-1">Controllo OK</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Modal - Fisso in basso */}
                <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
                  {!deleteConfirm ? (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="w-full bg-red-50 text-red-700 border-2 border-red-200 rounded-lg px-4 py-3 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Elimina Controllo
                    </button>
                  ) : (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <p className="text-red-800 font-medium mb-3 text-center">
                        Sei sicuro di voler eliminare questo controllo?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(false)}
                          disabled={deleting}
                          className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={handleDeleteControl}
                          disabled={deleting}
                          className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {deleting ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Eliminazione...
                            </>
                          ) : (
                            'Conferma Eliminazione'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer con azioni rapide */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex justify-center gap-2">
          <button
            onClick={() => router.push('/quality/insert')}
            className="bg-white rounded-lg shadow-sm px-4 py-2 hover:shadow-md transition-shadow flex items-center gap-2"
          >
            <div className="bg-blue-100 text-blue-600 rounded-full p-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Nuovo Controllo</span>
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            disabled={selectedDate === new Date().toISOString().split('T')[0]}
            className="bg-white rounded-lg shadow-sm px-4 py-2 hover:shadow-md transition-shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="bg-green-100 text-green-600 rounded-full p-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Oggi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
