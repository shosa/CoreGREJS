'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { exportApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

const tabClasses = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
    active
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
  }`;

interface Article {
  id: number;
  codiceArticolo: string;
  descrizione?: string;
  voceDoganale?: string;
  um?: string;
  prezzoUnitario?: number;
}

interface DocumentItem {
  id: number;
  articleId?: number;
  qtaOriginale: number;
  qtaReale: number;
  tipoRiga: string;
  codiceLibero?: string;
  descrizioneLibera?: string;
  voceLibera?: string;
  umLibera?: string;
  prezzoLibero?: number;
  article?: Article;
}

interface DocumentFooter {
  id: number;
  aspettoColli?: string;
  nColli?: number;
  totPesoLordo?: number;
  totPesoNetto?: number;
  trasportatore?: string;
  consegnatoPer?: string;
  vociDoganali?: Array<{ voce: string; peso: number }>;
}

interface MissingData {
  id: number;
  codiceArticolo: string;
  qtaMancante: number;
  descrizione?: string;
}

interface LaunchData {
  id: number;
  lancio: string;
  articolo: string;
  paia: number;
  note?: string;
}

interface Document {
  id: number;
  progressivo: string;
  terzistaId: number;
  data: string;
  stato: string;
  autorizzazione?: string;
  commento?: string;
  terzista: {
    id: number;
    ragioneSociale: string;
    indirizzo1?: string;
    indirizzo2?: string;
    indirizzo3?: string;
    nazione?: string;
    consegna?: string;
  };
  righe: DocumentItem[];
  piede?: DocumentFooter;
  mancanti: MissingData[];
  lanci: LaunchData[];
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const progressivo = params.progressivo as string;

  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<'righe' | 'piede' | 'mancanti' | 'lanci' | 'upload'>('righe');

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddMissingModal, setShowAddMissingModal] = useState(false);
  const [showAddLaunchModal, setShowAddLaunchModal] = useState(false);
  const [showEditFooterModal, setShowEditFooterModal] = useState(false);

  // Upload states
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; lancio: string; qty: string; uploadedAt: Date }>>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Search articoli
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchArticle, setSearchArticle] = useState('');

  // Form states
  const [newItem, setNewItem] = useState({
    articleId: null as number | null,
    tipoRiga: 'articolo' as 'articolo' | 'libera',
    qtaOriginale: 0,
    qtaReale: 0,
    codiceLibero: '',
    descrizioneLibera: '',
    voceLibera: '',
    umLibera: '',
    prezzoLibero: 0,
  });

  const [newMissing, setNewMissing] = useState({
    codiceArticolo: '',
    qtaMancante: 0,
    descrizione: '',
  });

  const [newLaunch, setNewLaunch] = useState({
    lancio: '',
    articolo: '',
    paia: 0,
    note: '',
  });

  const [footer, setFooter] = useState<Partial<DocumentFooter>>({
    aspettoColli: '',
    nColli: 0,
    totPesoLordo: 0,
    totPesoNetto: 0,
    trasportatore: '',
    consegnatoPer: '',
    vociDoganali: [],
  });

  useEffect(() => {
    fetchDocument();
    fetchArticles();
  }, [progressivo]);

  useEffect(() => {
    if (activeTab === 'upload') {
      fetchUploadedFiles();
    }
  }, [activeTab]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const doc = await exportApi.getDocumentByProgressivo(progressivo);
      setDocument(doc);
      if (doc.piede) {
        setFooter(doc.piede);
      }
    } catch (error) {
      showError('Errore nel caricamento del documento');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const data = await exportApi.getArticlesMaster();
      setArticles(data);
    } catch (error) {
      console.error('Errore nel caricamento articoli', error);
    }
  };

  const handleAddItem = async () => {
    if (!document) return;

    try {
      await exportApi.addDocumentItem({
        documentoId: document.id,
        ...newItem,
      });
      showSuccess('Riga aggiunta');
      setShowAddItemModal(false);
      setNewItem({
        articleId: null,
        tipoRiga: 'articolo',
        qtaOriginale: 0,
        qtaReale: 0,
        codiceLibero: '',
        descrizioneLibera: '',
        voceLibera: '',
        umLibera: '',
        prezzoLibero: 0,
      });
      fetchDocument();
    } catch (error) {
      showError('Errore aggiunta riga');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Eliminare questa riga?')) return;

    try {
      await exportApi.deleteDocumentItem(id);
      showSuccess('Riga eliminata');
      fetchDocument();
    } catch (error) {
      showError('Errore eliminazione riga');
    }
  };

  const handleSaveFooter = async () => {
    if (!document) return;

    try {
      await exportApi.upsertDocumentFooter(document.id, footer);
      showSuccess('Piede documento salvato');
      setShowEditFooterModal(false);
      fetchDocument();
    } catch (error) {
      showError('Errore salvataggio piede');
    }
  };

  const handleAddMissing = async () => {
    if (!document) return;

    try {
      await exportApi.addMissingData(document.id, newMissing);
      showSuccess('Mancante aggiunto');
      setShowAddMissingModal(false);
      setNewMissing({ codiceArticolo: '', qtaMancante: 0, descrizione: '' });
      fetchDocument();
    } catch (error) {
      showError('Errore aggiunta mancante');
    }
  };

  const handleDeleteMissing = async (id: number) => {
    if (!confirm('Eliminare questo mancante?')) return;

    try {
      await exportApi.deleteMissingData(id);
      showSuccess('Mancante eliminato');
      fetchDocument();
    } catch (error) {
      showError('Errore eliminazione mancante');
    }
  };

  const handleAddLaunch = async () => {
    if (!document) return;

    try {
      await exportApi.addLaunchData(document.id, newLaunch);
      showSuccess('Lancio aggiunto');
      setShowAddLaunchModal(false);
      setNewLaunch({ lancio: '', articolo: '', paia: 0, note: '' });
      fetchDocument();
    } catch (error) {
      showError('Errore aggiunta lancio');
    }
  };

  const handleDeleteLaunch = async (id: number) => {
    if (!confirm('Eliminare questo lancio?')) return;

    try {
      await exportApi.deleteLaunchData(id);
      showSuccess('Lancio eliminato');
      fetchDocument();
    } catch (error) {
      showError('Errore eliminazione lancio');
    }
  };

  // Upload handlers
  const fetchUploadedFiles = async () => {
    try {
      const files = await exportApi.getUploadedFiles(progressivo);
      setUploadedFiles(files);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await exportApi.uploadExcelFile(progressivo, formData);
      showSuccess('File caricato con successo');
      await fetchUploadedFiles();
      e.target.value = ''; // Reset input
    } catch (error) {
      showError('Errore caricamento file');
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewFile = async (fileName: string) => {
    try {
      const data = await exportApi.processExcelFile(progressivo, fileName);
      if (data.success) {
        setPreviewData(data);
        setPreviewFileName(fileName);
      } else {
        showError(data.error || 'Errore processamento file');
      }
    } catch (error) {
      showError('Errore preview file');
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm('Eliminare questo file?')) return;

    try {
      await exportApi.deleteUploadedFile(progressivo, fileName);
      showSuccess('File eliminato');
      await fetchUploadedFiles();
      if (previewFileName === fileName) {
        setPreviewData(null);
        setPreviewFileName('');
      }
    } catch (error) {
      showError('Errore eliminazione file');
    }
  };

  const handleSaveExcelData = async () => {
    if (!previewData || !previewFileName) return;

    const rows: Array<{ tipo: string; data: string[] }> = [];

    // Add TAGLIO rows
    if (previewData.rows?.taglio) {
      previewData.rows.taglio.forEach((row: string[]) => {
        rows.push({ tipo: 'TAGLIO', data: row });
      });
    }

    // Add ORLATURA rows
    if (previewData.rows?.orlatura) {
      previewData.rows.orlatura.forEach((row: string[]) => {
        rows.push({ tipo: 'ORLATURA', data: row });
      });
    }

    if (rows.length === 0) {
      showError('Nessun dato da salvare');
      return;
    }

    try {
      await exportApi.saveExcelDataAsItems(progressivo, previewFileName, rows);
      showSuccess(`${rows.length} righe salvate nel documento`);
      setPreviewData(null);
      setPreviewFileName('');
      fetchDocument();
    } catch (error) {
      showError('Errore salvataggio dati');
    }
  };

  const handleCloseDocument = async () => {
    if (!confirm('Chiudere il documento? Non sarà più modificabile.')) return;

    try {
      await exportApi.closeDocument(progressivo);
      showSuccess('Documento chiuso');
      fetchDocument();
    } catch (error) {
      showError('Errore chiusura documento');
    }
  };

  const handleReopenDocument = async () => {
    if (!confirm('Riaprire il documento?')) return;

    try {
      await exportApi.reopenDocument(progressivo);
      showSuccess('Documento riaperto');
      fetchDocument();
    } catch (error) {
      showError('Errore riapertura documento');
    }
  };

  const handleGeneratePDF = async (type: 'griglia' | 'segnacolli') => {
    if (!document) return;

    try {
      if (type === 'griglia') {
        await exportApi.requestGrigliaMaterialiPdf(progressivo);
      } else {
        await exportApi.requestSegnacolliPdf(progressivo);
      }
      showSuccess(`Generazione PDF ${type === 'griglia' ? 'Griglia Materiali' : 'Segnacolli'} avviata. Controlla la sezione Lavori.`);
    } catch (error) {
      showError('Errore generazione PDF');
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.codiceArticolo.toLowerCase().includes(searchArticle.toLowerCase()) ||
      (a.descrizione && a.descrizione.toLowerCase().includes(searchArticle.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!document) {
    return <div className="text-center py-12 text-red-500">Documento non trovato</div>;
  }

  const isOpen = document.stato === 'Aperto';

  return (
    <div>
      <PageHeader
        title={`DDT ${document.progressivo}`}
        subtitle={`${document.terzista.ragioneSociale} - ${new Date(document.data).toLocaleDateString('it-IT')}`}
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Export', href: '/export' },
          { label: 'Archivio', href: '/export/archive' },
          { label: document.progressivo },
        ]}
      />

      {/* Status Badge & Actions */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40">
        <div className="flex items-center gap-4">
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              isOpen
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {document.stato}
          </span>
          {document.autorizzazione && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <i className="fas fa-key mr-2"></i>
              {document.autorizzazione}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {isOpen ? (
            <button
              onClick={handleCloseDocument}
              className="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-600"
            >
              <i className="fas fa-lock mr-2"></i>
              Chiudi
            </button>
          ) : (
            <button
              onClick={handleReopenDocument}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-yellow-600"
            >
              <i className="fas fa-lock-open mr-2"></i>
              Riapri
            </button>
          )}

          <button
            onClick={() => handleGeneratePDF('griglia')}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            Griglia Materiali
          </button>

          <button
            onClick={() => handleGeneratePDF('segnacolli')}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            Segnacolli
          </button>
        </div>
      </div>

      {/* Terzista Info */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40">
        <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
          <i className="fas fa-building mr-2 text-blue-500"></i>
          Destinatario
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">{document.terzista.ragioneSociale}</p>
            {document.terzista.indirizzo1 && (
              <p className="text-gray-600 dark:text-gray-400">{document.terzista.indirizzo1}</p>
            )}
            {document.terzista.indirizzo2 && (
              <p className="text-gray-600 dark:text-gray-400">{document.terzista.indirizzo2}</p>
            )}
            {document.terzista.indirizzo3 && (
              <p className="text-gray-600 dark:text-gray-400">{document.terzista.indirizzo3}</p>
            )}
            {document.terzista.nazione && (
              <p className="mt-1 font-semibold text-gray-700 dark:text-gray-300">{document.terzista.nazione}</p>
            )}
          </div>
          {document.terzista.consegna && (
            <div>
              <p className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Consegna:</p>
              <p className="whitespace-pre-line text-gray-600 dark:text-gray-400">{document.terzista.consegna}</p>
            </div>
          )}
        </div>
        {document.commento && (
          <div className="mt-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <i className="fas fa-comment mr-2"></i>
              {document.commento}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button onClick={() => setActiveTab('righe')} className={tabClasses(activeTab === 'righe')}>
          <i className="fas fa-list mr-2"></i>
          Righe ({document.righe.length})
        </button>
        <button onClick={() => setActiveTab('piede')} className={tabClasses(activeTab === 'piede')}>
          <i className="fas fa-truck mr-2"></i>
          Piede Documento
        </button>
        <button onClick={() => setActiveTab('mancanti')} className={tabClasses(activeTab === 'mancanti')}>
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Mancanti ({document.mancanti.length})
        </button>
        <button onClick={() => setActiveTab('lanci')} className={tabClasses(activeTab === 'lanci')}>
          <i className="fas fa-play mr-2"></i>
          Lanci ({document.lanci.length})
        </button>
        <button onClick={() => setActiveTab('upload')} className={tabClasses(activeTab === 'upload')}>
          <i className="fas fa-file-excel mr-2"></i>
          Schede Excel
        </button>
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40">
        {/* RIGHE TAB */}
        {activeTab === 'righe' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Righe Documento</h3>
              {isOpen && (
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Aggiungi Riga
                </button>
              )}
            </div>

            {document.righe.length === 0 ? (
              <p className="py-12 text-center text-gray-500">Nessuna riga inserita</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Codice</th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Descrizione</th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Voce Doganale</th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">Qta Orig.</th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">Qta Reale</th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">UM</th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">Prezzo</th>
                      {isOpen && <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {document.righe.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 text-gray-900 dark:text-white">
                          {item.tipoRiga === 'articolo' && item.article
                            ? item.article.codiceArticolo
                            : item.codiceLibero || '-'}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {item.tipoRiga === 'articolo' && item.article
                            ? item.article.descrizione || '-'
                            : item.descrizioneLibera || '-'}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {item.tipoRiga === 'articolo' && item.article
                            ? item.article.voceDoganale || '-'
                            : item.voceLibera || '-'}
                        </td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">{item.qtaOriginale}</td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">{item.qtaReale}</td>
                        <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                          {item.tipoRiga === 'articolo' && item.article ? item.article.um || '-' : item.umLibera || '-'}
                        </td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">
                          {item.tipoRiga === 'articolo' && item.article
                            ? item.article.prezzoUnitario?.toFixed(2) || '-'
                            : item.prezzoLibero?.toFixed(2) || '-'}
                        </td>
                        {isOpen && (
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PIEDE TAB */}
        {activeTab === 'piede' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Piede Documento</h3>
              {isOpen && (
                <button
                  onClick={() => setShowEditFooterModal(true)}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
                >
                  <i className="fas fa-edit mr-2"></i>
                  Modifica
                </button>
              )}
            </div>

            {!document.piede ? (
              <p className="py-12 text-center text-gray-500">Piede documento non compilato</p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Aspetto Colli</p>
                  <p className="text-gray-900 dark:text-white">{document.piede.aspettoColli || '-'}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">N. Colli</p>
                  <p className="text-gray-900 dark:text-white">{document.piede.nColli || '-'}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Peso Lordo</p>
                  <p className="text-gray-900 dark:text-white">
                    {document.piede.totPesoLordo ? `${document.piede.totPesoLordo} kg` : '-'}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Peso Netto</p>
                  <p className="text-gray-900 dark:text-white">
                    {document.piede.totPesoNetto ? `${document.piede.totPesoNetto} kg` : '-'}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Trasportatore</p>
                  <p className="text-gray-900 dark:text-white">{document.piede.trasportatore || '-'}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Consegnato Per</p>
                  <p className="whitespace-pre-line text-gray-900 dark:text-white">
                    {document.piede.consegnatoPer || '-'}
                  </p>
                </div>

                {document.piede.vociDoganali && Array.isArray(document.piede.vociDoganali) && document.piede.vociDoganali.length > 0 && (
                  <div className="col-span-2">
                    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Voci Doganali</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 text-left font-semibold text-gray-700 dark:text-gray-300">Voce</th>
                            <th className="pb-2 text-right font-semibold text-gray-700 dark:text-gray-300">Peso (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {document.piede.vociDoganali.map((v: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                              <td className="py-2 text-gray-900 dark:text-white">{v.voce}</td>
                              <td className="py-2 text-right text-gray-900 dark:text-white">{v.peso}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MANCANTI TAB */}
        {activeTab === 'mancanti' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mancanti</h3>
              {isOpen && (
                <button
                  onClick={() => setShowAddMissingModal(true)}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Aggiungi Mancante
                </button>
              )}
            </div>

            {document.mancanti.length === 0 ? (
              <p className="py-12 text-center text-gray-500">Nessun mancante</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Codice Articolo</th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Descrizione</th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">Qta Mancante</th>
                      {isOpen && <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {document.mancanti.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 text-gray-900 dark:text-white">{item.codiceArticolo}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{item.descrizione || '-'}</td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">{item.qtaMancante}</td>
                        {isOpen && (
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteMissing(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LANCI TAB */}
        {activeTab === 'lanci' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lanci</h3>
              {isOpen && (
                <button
                  onClick={() => setShowAddLaunchModal(true)}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Aggiungi Lancio
                </button>
              )}
            </div>

            {document.lanci.length === 0 ? (
              <p className="py-12 text-center text-gray-500">Nessun lancio</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Lancio</th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Articolo</th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">Paia</th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">Note</th>
                      {isOpen && <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {document.lanci.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 text-gray-900 dark:text-white">{item.lancio}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{item.articolo}</td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">{item.paia}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{item.note || '-'}</td>
                        {isOpen && (
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteLaunch(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schede Excel</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Carica schede Excel per importare dati TAGLIO e ORLATURA nel documento
              </p>
            </div>

            {/* Upload Section */}
            {isOpen && (
              <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/50">
                <i className="fas fa-file-excel mb-3 text-4xl text-blue-500"></i>
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Carica Scheda Excel</h4>
                <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">File .xlsx o .xls</p>
                <label className="inline-block cursor-pointer rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg">
                  <i className="fas fa-upload mr-2"></i>
                  {uploading ? 'Caricamento...' : 'Seleziona File'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length === 0 ? (
              <p className="py-12 text-center text-gray-500">Nessuna scheda caricata</p>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <i className="fas fa-file-excel text-2xl text-green-500"></i>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Lancio: {file.lancio} | Qty: {file.qty} | {new Date(file.uploadedAt).toLocaleString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewFile(file.name)}
                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-all hover:bg-blue-600"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        Preview
                      </button>
                      {isOpen && (
                        <button
                          onClick={() => handleDeleteFile(file.name)}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white transition-all hover:bg-red-600"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Preview Section */}
            {previewData && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-900/20">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Preview: {previewFileName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Modello: {previewData.modello} | Lancio: {previewData.lancio} | Qty: {previewData.qty}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setPreviewFileName('');
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                {/* TAGLIO Section */}
                {previewData.rows?.taglio && previewData.rows.taglio.length > 0 && (
                  <div className="mb-6">
                    <h5 className="mb-3 font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-cut mr-2 text-blue-500"></i>
                      TAGLIO ({previewData.rows.taglio.length} righe)
                    </h5>
                    <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                            {previewData.headers?.map((header: string, idx: number) => (
                              <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.taglio.slice(0, 10).map((row: string[], idx: number) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-3 py-2 text-gray-900 dark:text-white">
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewData.rows.taglio.length > 10 && (
                        <p className="p-2 text-center text-xs text-gray-500">
                          ... e altre {previewData.rows.taglio.length - 10} righe
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ORLATURA Section */}
                {previewData.rows?.orlatura && previewData.rows.orlatura.length > 0 && (
                  <div className="mb-6">
                    <h5 className="mb-3 font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-border-style mr-2 text-green-500"></i>
                      ORLATURA ({previewData.rows.orlatura.length} righe)
                    </h5>
                    <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                            {previewData.headers?.map((header: string, idx: number) => (
                              <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.orlatura.slice(0, 10).map((row: string[], idx: number) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-3 py-2 text-gray-900 dark:text-white">
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewData.rows.orlatura.length > 10 && (
                        <p className="p-2 text-center text-xs text-gray-500">
                          ... e altre {previewData.rows.orlatura.length - 10} righe
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                {isOpen && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveExcelData}
                      className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
                    >
                      <i className="fas fa-save mr-2"></i>
                      Salva nel Documento
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Add Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Aggiungi Riga</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo Riga</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newItem.tipoRiga === 'articolo'}
                    onChange={() => setNewItem({ ...newItem, tipoRiga: 'articolo' })}
                    className="mr-2"
                  />
                  Da Articolo Master
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newItem.tipoRiga === 'libera'}
                    onChange={() => setNewItem({ ...newItem, tipoRiga: 'libera' })}
                    className="mr-2"
                  />
                  Riga Libera
                </label>
              </div>
            </div>

            {newItem.tipoRiga === 'articolo' ? (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Seleziona Articolo
                </label>
                <input
                  type="text"
                  placeholder="Cerca articolo..."
                  value={searchArticle}
                  onChange={(e) => setSearchArticle(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600">
                  {filteredArticles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => setNewItem({ ...newItem, articleId: art.id })}
                      className={`cursor-pointer border-b border-gray-200 p-3 transition-colors hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                        newItem.articleId === art.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{art.codiceArticolo}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{art.descrizione || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Codice</label>
                  <input
                    type="text"
                    value={newItem.codiceLibero}
                    onChange={(e) => setNewItem({ ...newItem, codiceLibero: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrizione</label>
                  <input
                    type="text"
                    value={newItem.descrizioneLibera}
                    onChange={(e) => setNewItem({ ...newItem, descrizioneLibera: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Voce Doganale</label>
                  <input
                    type="text"
                    value={newItem.voceLibera}
                    onChange={(e) => setNewItem({ ...newItem, voceLibera: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">UM</label>
                  <input
                    type="text"
                    value={newItem.umLibera}
                    onChange={(e) => setNewItem({ ...newItem, umLibera: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Prezzo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.prezzoLibero}
                    onChange={(e) => setNewItem({ ...newItem, prezzoLibero: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Qta Originale</label>
                <input
                  type="number"
                  value={newItem.qtaOriginale}
                  onChange={(e) => setNewItem({ ...newItem, qtaOriginale: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Qta Reale</label>
                <input
                  type="number"
                  value={newItem.qtaReale}
                  onChange={(e) => setNewItem({ ...newItem, qtaReale: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={handleAddItem}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                Aggiungi
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Edit Footer */}
      {showEditFooterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Modifica Piede Documento</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Aspetto Colli</label>
                <input
                  type="text"
                  value={footer.aspettoColli || ''}
                  onChange={(e) => setFooter({ ...footer, aspettoColli: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">N. Colli</label>
                <input
                  type="number"
                  value={footer.nColli || 0}
                  onChange={(e) => setFooter({ ...footer, nColli: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Peso Lordo (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={footer.totPesoLordo || 0}
                  onChange={(e) => setFooter({ ...footer, totPesoLordo: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Peso Netto (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={footer.totPesoNetto || 0}
                  onChange={(e) => setFooter({ ...footer, totPesoNetto: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Trasportatore</label>
                <input
                  type="text"
                  value={footer.trasportatore || ''}
                  onChange={(e) => setFooter({ ...footer, trasportatore: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Consegnato Per</label>
                <textarea
                  value={footer.consegnatoPer || ''}
                  onChange={(e) => setFooter({ ...footer, consegnatoPer: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Voci Doganali (JSON)
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Formato: [{`{ "voce": "56031480", "peso": 123.45 }, ...`}]
              </p>
              <textarea
                value={footer.vociDoganali ? JSON.stringify(footer.vociDoganali, null, 2) : '[]'}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setFooter({ ...footer, vociDoganali: parsed });
                  } catch (err) {
                    // Invalid JSON, do nothing
                  }
                }}
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEditFooterModal(false)}
                className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveFooter}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                Salva
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Add Missing */}
      {showAddMissingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Aggiungi Mancante</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Codice Articolo</label>
                <input
                  type="text"
                  value={newMissing.codiceArticolo}
                  onChange={(e) => setNewMissing({ ...newMissing, codiceArticolo: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Qta Mancante</label>
                <input
                  type="number"
                  value={newMissing.qtaMancante}
                  onChange={(e) => setNewMissing({ ...newMissing, qtaMancante: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrizione</label>
                <input
                  type="text"
                  value={newMissing.descrizione}
                  onChange={(e) => setNewMissing({ ...newMissing, descrizione: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddMissingModal(false)}
                className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={handleAddMissing}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                Aggiungi
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Add Launch */}
      {showAddLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Aggiungi Lancio</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Lancio</label>
                <input
                  type="text"
                  value={newLaunch.lancio}
                  onChange={(e) => setNewLaunch({ ...newLaunch, lancio: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Articolo</label>
                <input
                  type="text"
                  value={newLaunch.articolo}
                  onChange={(e) => setNewLaunch({ ...newLaunch, articolo: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Paia</label>
                <input
                  type="number"
                  value={newLaunch.paia}
                  onChange={(e) => setNewLaunch({ ...newLaunch, paia: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Note</label>
                <textarea
                  value={newLaunch.note}
                  onChange={(e) => setNewLaunch({ ...newLaunch, note: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddLaunchModal(false)}
                className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={handleAddLaunch}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                Aggiungi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
