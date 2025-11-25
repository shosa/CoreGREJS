'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from '@tanstack/react-table';
import { exportApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import EditableCell from '@/components/export/EditableCell';

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
  const [savingField, setSavingField] = useState<string | null>(null); // "itemId-field" es: "123-descrizione"

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddMissingModal, setShowAddMissingModal] = useState(false);
  const [showAddLaunchModal, setShowAddLaunchModal] = useState(false);
  const [showEditFooterModal, setShowEditFooterModal] = useState(false);

  // Upload states
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; lancio: string; qty: string; uploadedAt: Date; processed?: boolean }>>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Modal form states
  const [excelFormData, setExcelFormData] = useState({
    lancio: '',
    qty: 1,
    modello: '',
  });
  const [selectedTaglioRows, setSelectedTaglioRows] = useState<Set<number>>(new Set());
  const [selectedOrlaturaRows, setSelectedOrlaturaRows] = useState<Set<number>>(new Set());

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

  const handleUpdateItemField = async (itemId: number, field: string, value: any, tipoRiga: string) => {
    const fieldKey = `${itemId}-${field}`;

    try {
      // Imposta il loading per questo campo
      setSavingField(fieldKey);

      const updateData: any = {};

      // Sostituisci virgola con punto per i numeri
      if (field === 'qtaReale' || field === 'prezzo') {
        value = value.replace(',', '.');
      }

      // Map field names to API field names
      if (field === 'descrizione') {
        // Per articoli master, aggiorna il campo "descrizione" del master
        // Per righe libere, aggiorna il campo "descrizioneLibera"
        if (tipoRiga === 'libera') {
          updateData.descrizioneLibera = value;
        } else {
          updateData.descrizione = value;
        }
      } else if (field === 'qtaReale') {
        // Forza 2 decimali - qtaReale può essere modificato per tutti i tipi
        updateData.qtaReale = parseFloat(parseFloat(value).toFixed(2)) || 0;
      } else if (field === 'prezzo') {
        // Forza 2 decimali
        const prezzo = parseFloat(parseFloat(value).toFixed(2)) || 0;
        if (tipoRiga === 'libera') {
          updateData.prezzoLibero = prezzo;
        } else {
          updateData.prezzoUnitario = prezzo;
        }
      } else if (field === 'voceDoganale') {
        if (tipoRiga === 'libera') {
          updateData.voceLibera = value;
        } else {
          updateData.voceDoganale = value;
        }
      }

      // Aggiorna lo stato locale per riflettere le modifiche immediatamente
      if (document) {
        setDocument({
          ...document,
          righe: document.righe.map(item => {
            if (item.id === itemId) {
              // Crea una copia dell'item con i dati aggiornati
              const updatedItem = { ...item };

              if (field === 'qtaReale') {
                updatedItem.qtaReale = updateData.qtaReale;
              } else if (field === 'prezzo') {
                if (tipoRiga === 'libera') {
                  updatedItem.prezzoLibero = updateData.prezzoLibero;
                } else if (item.article) {
                  updatedItem.article = { ...item.article, prezzoUnitario: updateData.prezzoUnitario };
                }
              } else if (field === 'descrizione') {
                if (tipoRiga === 'libera') {
                  updatedItem.descrizioneLibera = updateData.descrizioneLibera;
                } else if (item.article) {
                  updatedItem.article = { ...item.article, descrizione: updateData.descrizione };
                }
              } else if (field === 'voceDoganale') {
                if (tipoRiga === 'libera') {
                  updatedItem.voceLibera = updateData.voceLibera;
                } else if (item.article) {
                  updatedItem.article = { ...item.article, voceDoganale: updateData.voceDoganale };
                }
              }

              return updatedItem;
            }
            return item;
          })
        });
      }

      // Salva sul server in background SENZA ricaricare la pagina
      await exportApi.updateDocumentItem(itemId, updateData);

      console.log('Campo aggiornato:', field, value);
    } catch (error) {
      console.error('Errore aggiornamento campo:', error);
      showError('Errore aggiornamento campo');
    } finally {
      // Rimuovi il loading
      setSavingField(null);
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
        setExcelFormData({
          lancio: data.lancio || '',
          qty: parseFloat(data.qty) || 1,
          modello: data.modello || '',
        });
        // Select all rows by default
        setSelectedTaglioRows(new Set(data.rows?.taglio?.map((_: any, idx: number) => idx) || []));
        setSelectedOrlaturaRows(new Set(data.rows?.orlatura?.map((_: any, idx: number) => idx) || []));
        setShowPreviewModal(true);
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

    // Validate lancio
    if (!excelFormData.lancio.trim()) {
      showError('Il campo Lancio è obbligatorio');
      return;
    }

    // Collect selected TAGLIO rows with totals calculated
    const tableTaglio: string[][] = [];
    if (previewData.rows?.taglio) {
      previewData.rows.taglio.forEach((row: string[], idx: number) => {
        if (selectedTaglioRows.has(idx)) {
          const unitValue = parseFloat(row[4]) || 0;
          const total = (unitValue * excelFormData.qty).toFixed(2);
          tableTaglio.push([...row.slice(0, 5), total]);
        }
      });
    }

    // Collect selected ORLATURA rows with totals calculated
    const tableOrlatura: string[][] = [];
    if (previewData.rows?.orlatura) {
      previewData.rows.orlatura.forEach((row: string[], idx: number) => {
        if (selectedOrlaturaRows.has(idx)) {
          const unitValue = parseFloat(row[4]) || 0;
          const total = (unitValue * excelFormData.qty).toFixed(2);
          tableOrlatura.push([...row.slice(0, 5), total]);
        }
      });
    }

    if (tableTaglio.length === 0 && tableOrlatura.length === 0) {
      showError('Seleziona almeno una riga da salvare');
      return;
    }

    try {
      await exportApi.saveExcelData(progressivo, {
        modello: excelFormData.modello,
        lancio: excelFormData.lancio,
        qty: excelFormData.qty,
        tableTaglio,
        tableOrlatura,
        originalFileName: previewFileName,
      });
      showSuccess('Scheda processata e salvata!');

      // Mark file as processed
      setUploadedFiles(prev =>
        prev.map(f => f.name === previewFileName ? { ...f, processed: true, lancio: excelFormData.lancio, qty: String(excelFormData.qty) } : f)
      );

      // Close modal and reset
      setShowPreviewModal(false);
      setPreviewData(null);
      setPreviewFileName('');
      setExcelFormData({ lancio: '', qty: 1, modello: '' });
      setSelectedTaglioRows(new Set());
      setSelectedOrlaturaRows(new Set());

      // Refresh files list
      await fetchUploadedFiles();
    } catch (error) {
      showError('Errore salvataggio dati');
    }
  };

  const handleGenerateDDT = async () => {
    if (!confirm('Generare il DDT? Tutti gli articoli dalle schede elaborate verranno consolidati e inseriti nel documento.')) return;

    try {
      const result = await exportApi.generateDDT(progressivo);
      if (result.success) {
        showSuccess(result.message || 'DDT generato con successo!');
        // Refresh document to show new items
        await fetchDocument();
        // Switch to Righe tab to see results
        setActiveTab('righe');
      } else {
        showError(result.error || 'Errore generazione DDT');
      }
    } catch (error) {
      showError('Errore generazione DDT');
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

  const isOpen = document?.stato === 'Aperto';

  // Definizione colonne per react-table
  const columns = useMemo<ColumnDef<DocumentItem>[]>(
    () => [
      {
        accessorKey: 'codice',
        header: 'Codice Articolo',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="font-mono">
              {item.tipoRiga === 'articolo' && item.article
                ? item.article.codiceArticolo
                : item.codiceLibero || '-'}
            </div>
          );
        },
      },
      {
        accessorKey: 'descrizione',
        header: 'Descrizione',
        cell: ({ row }) => {
          const item = row.original;
          const currentValue = item.tipoRiga === 'articolo' && item.article
            ? item.article.descrizione || ''
            : item.descrizioneLibera || '';

          return (
            <EditableCell
              value={currentValue}
              onChange={(value) => handleUpdateItemField(item.id, 'descrizione', value, item.tipoRiga)}
              isLoading={savingField === `${item.id}-descrizione`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: 'voceDoganale',
        header: 'Voce Doganale',
        size: 150,
        cell: ({ row }) => {
          const item = row.original;
          const currentValue = item.tipoRiga === 'articolo' && item.article
            ? item.article.voceDoganale || ''
            : item.voceLibera || '';

          return (
            <EditableCell
              value={currentValue}
              onChange={(value) => handleUpdateItemField(item.id, 'voceDoganale', value, item.tipoRiga)}
              isLoading={savingField === `${item.id}-voceDoganale`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 80,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="bg-gray-50 dark:bg-gray-700/50">
              {item.tipoRiga === 'articolo' && item.article ? item.article.um || '-' : item.umLibera || '-'}
            </div>
          );
        },
      },
      {
        accessorKey: 'qtaOriginale',
        header: 'QTA',
        size: 100,
        cell: ({ row }) => (
          <div className="bg-gray-50 dark:bg-gray-700/50 text-right">
            {Number(row.original.qtaOriginale).toFixed(3).replace('.', ',')}
          </div>
        ),
      },
      {
        accessorKey: 'qtaReale',
        header: 'QTA Reale',
        size: 100,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <EditableCell
              value={Number(item.qtaReale).toFixed(3).replace('.', ',')}
              onChange={(value) => handleUpdateItemField(item.id, 'qtaReale', value, item.tipoRiga)}
              align="right"
              isLoading={savingField === `${item.id}-qtaReale`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: 'prezzoUnitario',
        header: 'Costo Unit.',
        size: 120,
        cell: ({ row }) => {
          const item = row.original;
          const prezzoUnitario = item.tipoRiga === 'articolo' && item.article
            ? Number(item.article.prezzoUnitario || 0)
            : Number(item.prezzoLibero || 0);

          return (
            <EditableCell
              value={'€' + prezzoUnitario.toFixed(3).replace('.', ',')}
              onChange={(value) => handleUpdateItemField(item.id, 'prezzo', value, item.tipoRiga)}
              align="right"
              isLoading={savingField === `${item.id}-prezzo`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: 'totale',
        header: 'Totale',
        
        cell: ({ row }) => {
          const item = row.original;
          const prezzoUnitario = item.tipoRiga === 'articolo' && item.article
            ? Number(item.article.prezzoUnitario || 0)
            : Number(item.prezzoLibero || 0);
          const totale = item.qtaReale * prezzoUnitario;

          return (
            <div className="font-medium bg-green-50 dark:bg-green-800/20 text-right">
              €{totale.toFixed(2).replace('.', ',')}
            </div>
          );
        },
      },
    ],
    [isOpen, savingField]
  );

  const table = useReactTable({
    data: document?.righe || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800/40">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-2 py-2 text-sm text-gray-900 dark:text-white"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
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
              <>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <i className={`fas fa-file-excel text-2xl ${file.processed ? 'text-green-500' : 'text-blue-500'}`}></i>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                            {file.processed && (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800/20 dark:text-green-300">
                                <i className="fas fa-check mr-1"></i>
                                Elaborato
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {file.lancio && file.lancio !== 'N/A' ? `Lancio: ${file.lancio} | Qty: ${file.qty} | ` : ''}
                            {new Date(file.uploadedAt).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreviewFile(file.name)}
                          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-all hover:bg-blue-600"
                        >
                          <i className="fas fa-eye mr-1"></i>
                          {file.processed ? 'Rielabora' : 'Elabora'}
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

                {/* Generate DDT Button */}
                {uploadedFiles.some(f => f.processed) && isOpen && (
                  <div className="mt-6 rounded-lg border-2 border-green-200 bg-green-50 p-6 dark:border-green-800/50 dark:bg-green-900/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                          <i className="fas fa-check-circle mr-2 text-green-600"></i>
                          Pronto per generare il DDT
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Tutte le schede elaborate verranno consolidate e inserite nel documento
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateDDT}
                        className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
                      >
                        <i className="fas fa-cogs mr-2"></i>
                        Genera DDT
                      </button>
                    </div>
                  </div>
                )}
              </>
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

      {/* MODAL: Excel Preview & Edit */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
          >
            {/* FIXED HEADER */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <i className="fas fa-file-excel mr-2 text-green-500"></i>
                Elabora Scheda Excel
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Form inputs */}
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-tag mr-1 text-blue-500"></i>
                    Modello
                  </label>
                  <input
                    type="text"
                    value={excelFormData.modello}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-rocket mr-1 text-green-500"></i>
                    Lancio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={excelFormData.lancio}
                    onChange={(e) => setExcelFormData({ ...excelFormData, lancio: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Inserisci lancio"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-cubes mr-1 text-orange-500"></i>
                    Quantità (Moltiplicatore)
                  </label>
                  <input
                    type="number"
                    value={excelFormData.qty}
                    onChange={(e) => setExcelFormData({ ...excelFormData, qty: parseFloat(e.target.value) || 1 })}
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* TAGLIO Table */}
              {previewData.rows?.taglio && previewData.rows.taglio.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <i className="fas fa-cut mr-2 text-red-500"></i>
                    TAGLIO ({selectedTaglioRows.size}/{previewData.rows.taglio.length} selezionate)
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedTaglioRows.size === previewData.rows.taglio.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTaglioRows(new Set(previewData.rows.taglio.map((_: any, idx: number) => idx)));
                                } else {
                                  setSelectedTaglioRows(new Set());
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          {previewData.headers?.map((header: string, idx: number) => (
                            <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                              {header}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Totale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {previewData.rows.taglio.map((row: string[], idx: number) => {
                          const unitValue = parseFloat(row[4]) || 0;
                          const total = (unitValue * excelFormData.qty).toFixed(2);
                          return (
                            <tr key={idx} className={!selectedTaglioRows.has(idx) ? 'opacity-40' : ''}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedTaglioRows.has(idx)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedTaglioRows);
                                    if (e.target.checked) {
                                      newSet.add(idx);
                                    } else {
                                      newSet.delete(idx);
                                    }
                                    setSelectedTaglioRows(newSet);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-3 py-2 text-gray-900 dark:text-white">
                                  {cell || '-'}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ORLATURA Table */}
              {previewData.rows?.orlatura && previewData.rows.orlatura.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <i className="fas fa-border-style mr-2 text-blue-500"></i>
                    ORLATURA ({selectedOrlaturaRows.size}/{previewData.rows.orlatura.length} selezionate)
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedOrlaturaRows.size === previewData.rows.orlatura.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrlaturaRows(new Set(previewData.rows.orlatura.map((_: any, idx: number) => idx)));
                                } else {
                                  setSelectedOrlaturaRows(new Set());
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          {previewData.headers?.map((header: string, idx: number) => (
                            <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                              {header}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Totale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                        {previewData.rows.orlatura.map((row: string[], idx: number) => {
                          const unitValue = parseFloat(row[4]) || 0;
                          const total = (unitValue * excelFormData.qty).toFixed(2);
                          return (
                            <tr key={idx} className={!selectedOrlaturaRows.has(idx) ? 'opacity-40' : ''}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedOrlaturaRows.has(idx)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedOrlaturaRows);
                                    if (e.target.checked) {
                                      newSet.add(idx);
                                    } else {
                                      newSet.delete(idx);
                                    }
                                    setSelectedOrlaturaRows(newSet);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-3 py-2 text-gray-900 dark:text-white">
                                  {cell || '-'}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* FIXED FOOTER */}
            <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveExcelData}
                className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                <i className="fas fa-save mr-2"></i>
                Salva Scheda
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
