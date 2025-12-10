"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from "@tanstack/react-table";
import { exportApi } from "@/lib/api";
import { showSuccess, showError } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Footer from "@/components/layout/Footer";
import EditableCell from "@/components/export/EditableCell";
import Offcanvas from "@/components/ui/Offcanvas";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const tabClasses = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
    active
      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
  isMancante?: boolean;
  rifMancante?: string;
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
  const [activeTab, setActiveTab] = useState<
    "righe" | "piede" | "mancanti" | "lanci" | "upload"
  >("righe");
  const [savingField, setSavingField] = useState<string | null>(null); // "itemId-field" es: "123-descrizione"

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddRowPopup, setShowAddRowPopup] = useState(false); // Dropdown per tipo riga
  const [showCommentoModal, setShowCommentoModal] = useState(false); // Modal commento
  const [showAddLaunchModal, setShowAddLaunchModal] = useState(false);
  const [showEditFooterModal, setShowEditFooterModal] = useState(false);
  const [showGenerateDDTModal, setShowGenerateDDTModal] = useState(false);
  const [showCloseDocumentModal, setShowCloseDocumentModal] = useState(false);
  const [showReopenDocumentModal, setShowReopenDocumentModal] = useState(false);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [showDeleteLaunchModal, setShowDeleteLaunchModal] = useState(false);
  const [showVociDoganaliOffcanvas, setShowVociDoganaliOffcanvas] =
    useState(false);
  const [showMancantiOffcanvas, setShowMancantiOffcanvas] = useState(false); // Offcanvas mancanti da altri DDT
  const [showActionsPopup, setShowActionsPopup] = useState(false); // Popup azioni nel footer
  const [showGrigliaModal, setShowGrigliaModal] = useState(false);
  const [availableArticles, setAvailableArticles] = useState<any[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<any[]>([]);
  const [mancantiFromClosed, setMancantiFromClosed] = useState<any[]>([]);
  const [selectedMancanti, setSelectedMancanti] = useState<Set<number>>(new Set());
  const [loadingMancanti, setLoadingMancanti] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [launchToDelete, setLaunchToDelete] = useState<number | null>(null);
  const [commentoText, setCommentoText] = useState("");

  // Upload states
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      name: string;
      lancio: string;
      qty: string;
      uploadedAt: Date;
      processed?: boolean;
    }>
  >([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Modal form states
  const [excelFormData, setExcelFormData] = useState({
    lancio: "",
    qty: 1,
    modello: "",
  });
  const [selectedTaglioRows, setSelectedTaglioRows] = useState<Set<number>>(
    new Set()
  );
  const [selectedOrlaturaRows, setSelectedOrlaturaRows] = useState<Set<number>>(
    new Set()
  );

  // Search articoli
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchArticle, setSearchArticle] = useState("");

  // Form states
  const [newItem, setNewItem] = useState({
    articleId: null as number | null,
    tipoRiga: "articolo" as "articolo" | "libera",
    qtaOriginale: 0,
    qtaReale: 0,
    codiceLibero: "",
    descrizioneLibera: "",
    voceLibera: "",
    umLibera: "",
    prezzoLibero: 0,
  });
  const [newItemInputs, setNewItemInputs] = useState({
    qtaOriginale: "",
    qtaReale: "",
    prezzoLibero: "",
  });

  const [newLaunch, setNewLaunch] = useState({
    lancio: "",
    articolo: "",
    paia: 0,
    note: "",
  });

  const [footer, setFooter] = useState<Partial<DocumentFooter>>({
    aspettoColli: "",
    nColli: 0,
    totPesoLordo: 0,
    totPesoNetto: 0,
    trasportatore: "",
    consegnatoPer: "",
    vociDoganali: [],
  });

  const [vociDoganaliEdit, setVociDoganaliEdit] = useState<
    Array<{ voce: string; peso: number; }>
  >([]);

  useEffect(() => {
    fetchDocument();
    fetchArticles();
  }, [progressivo]);

  useEffect(() => {
    if (activeTab === "upload") {
      fetchUploadedFiles();
    }
  }, [activeTab]);

  // Carica mancanti da DDT chiusi quando si apre l'offcanvas
  useEffect(() => {
    const loadMancantiFromClosed = async () => {
      if (showMancantiOffcanvas && document) {
        setLoadingMancanti(true);
        try {
          const mancanti = await exportApi.getMissingDataFromClosedDocuments(document.terzistaId);
          setMancantiFromClosed(mancanti);
        } catch (error) {
          showError('Errore nel caricamento dei mancanti da DDT chiusi');
        } finally {
          setLoadingMancanti(false);
        }
      }
    };
    loadMancantiFromClosed();
  }, [showMancantiOffcanvas, document]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const doc = await exportApi.getDocumentByProgressivo(progressivo);
      const sortedRighe = [...doc.righe].sort((a, b) => {
        const voceA =
          a.tipoRiga === "articolo"
            ? a.article?.voceDoganale || ""
            : a.voceLibera || "";
        const voceB =
          b.tipoRiga === "articolo"
            ? b.article?.voceDoganale || ""
            : b.voceLibera || "";
        return voceA.localeCompare(voceB, undefined, { numeric: true });
      });
      const sortedFooterVoci = Array.isArray(doc.piede?.vociDoganali)
        ? [...(doc.piede?.vociDoganali || [])].sort((a, b) =>
            (a.voce || "").localeCompare(b.voce || "", undefined, { numeric: true })
          )
        : doc.piede?.vociDoganali;
      setDocument({
        ...doc,
        righe: sortedRighe,
        piede: doc.piede
          ? {
              ...doc.piede,
              vociDoganali: sortedFooterVoci,
            }
          : doc.piede,
      });
      if (doc.piede) {
        setFooter({
          ...doc.piede,
          vociDoganali: sortedFooterVoci,
        });
      }
    } catch (error) {
      showError("Errore nel caricamento del documento");
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const data = await exportApi.getArticlesMaster();
      setArticles(data);
    } catch (error) {
      console.error("Errore nel caricamento articoli", error);
    }
  };

  const handleAddItem = async () => {
    if (!document) return;

    try {
      await exportApi.addDocumentItem({
        documentoId: document.id,
        ...newItem,
        articleId: newItem.articleId ?? undefined,
      });
      showSuccess("Riga aggiunta");
      setShowAddItemModal(false);
      setNewItem({
        articleId: null,
        tipoRiga: "articolo",
        qtaOriginale: 0,
        qtaReale: 0,
        codiceLibero: "",
        descrizioneLibera: "",
        voceLibera: "",
        umLibera: "",
        prezzoLibero: 0,
      });
      fetchDocument();
    } catch (error) {
      showError("Errore aggiunta riga");
    }
  };

  const handleDeleteItemClick = (id: number) => {
    setItemToDelete(id);
    setShowDeleteItemModal(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    setShowDeleteItemModal(false);

    try {
      await exportApi.deleteDocumentItem(itemToDelete);
      showSuccess("Riga eliminata");
      fetchDocument();
      setItemToDelete(null);
    } catch (error) {
      showError("Errore eliminazione riga");
    }
  };

  const handleUpdateItemField = async (
    itemId: number,
    field: string,
    value: any,
    tipoRiga: string
  ) => {
    const fieldKey = `${itemId}-${field}`;

    try {
      // Imposta il loading per questo campo
      setSavingField(fieldKey);

      const updateData: any = {};

      // Sostituisci virgola con punto per i numeri e rimuovi simboli
      if (field === "qtaReale" || field === "prezzo") {
        // Rimuovi €, spazi e sostituisci virgola con punto
        value = value.replace(/[€\s]/g, "").replace(",", ".");
      }

      // Map field names to API field names
      if (field === "descrizione") {
        // Per articoli master, aggiorna il campo "descrizione" del master
        // Per righe libere, aggiorna il campo "descrizioneLibera"
        if (tipoRiga === "libera") {
          updateData.descrizioneLibera = value;
        } else {
          updateData.descrizione = value;
        }
      } else if (field === "qtaReale") {
        // Forza 2 decimali - qtaReale può essere modificato per tutti i tipi
        updateData.qtaReale = parseFloat(parseFloat(value).toFixed(2)) || 0;
      } else if (field === "prezzo") {
        // Forza 2 decimali
        const prezzo = parseFloat(parseFloat(value).toFixed(2)) || 0;
        if (tipoRiga === "libera") {
          updateData.prezzoLibero = prezzo;
        } else {
          updateData.prezzoUnitario = prezzo;
        }
      } else if (field === "voceDoganale") {
        if (tipoRiga === "libera") {
          updateData.voceLibera = value;
        } else {
          updateData.voceDoganale = value;
        }
      }

      // Aggiorna lo stato locale per riflettere le modifiche immediatamente
      if (document) {
        const updatedRighe = document.righe.map((item) => {
          if (item.id === itemId) {
            // Crea una copia dell'item con i dati aggiornati
            const updatedItem = { ...item };

            if (field === "qtaReale") {
              updatedItem.qtaReale = updateData.qtaReale;
            } else if (field === "prezzo") {
              if (tipoRiga === "libera") {
                updatedItem.prezzoLibero = updateData.prezzoLibero;
              } else if (item.article) {
                updatedItem.article = {
                  ...item.article,
                  prezzoUnitario: updateData.prezzoUnitario,
                };
              }
            } else if (field === "descrizione") {
              if (tipoRiga === "libera") {
                updatedItem.descrizioneLibera = updateData.descrizioneLibera;
              } else if (item.article) {
                updatedItem.article = {
                  ...item.article,
                  descrizione: updateData.descrizione,
                };
              }
            } else if (field === "voceDoganale") {
              if (tipoRiga === "libera") {
                updatedItem.voceLibera = updateData.voceLibera;
              } else if (item.article) {
                updatedItem.article = {
                  ...item.article,
                  voceDoganale: updateData.voceDoganale,
                };
              }
            }

            return updatedItem;
          }
          return item;
        });

        // Ricalcola i mancanti se è stato modificato qtaReale
        let updatedMancanti = document.mancanti;
        if (field === "qtaReale") {
          updatedMancanti = updatedRighe
            .filter((item) => item.qtaReale < item.qtaOriginale)
            .map((item) => ({
              id: item.id,
              codiceArticolo: item.tipoRiga === "articolo" && item.article ? item.article.codiceArticolo : item.codiceLibero || "",
              descrizione: item.tipoRiga === "articolo" && item.article ? item.article.descrizione || "" : item.descrizioneLibera || "",
              qtaMancante: item.qtaOriginale - item.qtaReale,
            }));
        }

        setDocument({
          ...document,
          righe: updatedRighe,
          mancanti: updatedMancanti,
        });
      }

      // Salva sul server
      await exportApi.updateDocumentItem(itemId, updateData);
    } catch (error) {
      showError("Errore aggiornamento campo");
    } finally {
      // Rimuovi il loading
      setSavingField(null);
    }
  };

  const handleUpdateFooterField = async (field: string, value: any) => {
    if (!document) return;

    try {
      const updateData = {
        documentoId: document.id,
        ...document.piede,
        [field]: value,
      };
      const updatedFooter = await exportApi.upsertDocumentFooter(updateData);
      const mergedFooter = updatedFooter || {
        ...(document.piede || {}),
        [field]: value,
      };
      setFooter(mergedFooter);
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              piede: mergedFooter,
            }
          : prev
      );
      showSuccess("Campo aggiornato");
    } catch (error) {
      showError("Errore aggiornamento campo");
    }
  };

  const handleOpenVociDoganali = () => {
    if (!document) return;

    // Ottieni le voci doganali uniche dalle righe del documento e calcola somme per UM
    const vociData = new Map<string, { peso: number;}>();

    document.righe.forEach((riga) => {
      const voce =
        riga.tipoRiga === "articolo" && riga.article?.voceDoganale
          ? riga.article.voceDoganale
          : riga.voceLibera;

      if (voce) {
        if (!vociData.has(voce)) {
          vociData.set(voce, { peso: 0});
        }

        const data = vociData.get(voce)!;
        const um = riga.tipoRiga === "articolo" ? (riga.article?.um || "PZ") : "PZ";
        const qtaReale = riga.qtaReale || 0;

        
      }
    });

    // Inizializza con le voci esistenti o crea nuove entry
    const existingVoci = document.piede?.vociDoganali || [];
    const vociMap = new Map(existingVoci.map((v: any) => [v.voce, v.peso]));

    // Crea array con le voci dalle righe
    const inizializzate = Array.from(vociData.entries()).map(([voce, data]) => ({
      voce,
      peso: vociMap.get(voce) || 0,
      
    }));

    // Aggiungi voci salvate che non sono nelle righe (es. SOTTOPIEDI)
    for (const existingVoce of existingVoci) {
      if (!vociData.has(existingVoce.voce)) {
        inizializzate.push({
          voce: existingVoce.voce,
          peso: existingVoce.peso || 0,
         
        });
      }
    }

    const sorted = inizializzate.sort((a, b) =>
      (a.voce || "").localeCompare(b.voce || "", undefined, { numeric: true })
    );
    setVociDoganaliEdit(sorted);
    setShowVociDoganaliOffcanvas(true);
  };

  const handleSaveVociDoganali = async () => {
    if (!document) return;

    try {
      const updateData = {
        documentoId: document.id,
        ...document.piede,
        vociDoganali: vociDoganaliEdit,
      };
      const updatedFooter = await exportApi.upsertDocumentFooter(updateData);
      const mergedFooter = updatedFooter || {
        ...(document.piede || {}),
        vociDoganali: [...vociDoganaliEdit].sort((a, b) =>
          (a.voce || "").localeCompare(b.voce || "", undefined, { numeric: true })
        ),
      };
      setFooter(mergedFooter);
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              piede: mergedFooter,
            }
          : prev
      );
      showSuccess("Voci doganali aggiornate");
      setShowVociDoganaliOffcanvas(false);
    } catch (error) {
      showError("Errore aggiornamento voci doganali");
    }
  };

  const handleSaveFooter = async () => {
    if (!document) return;

    try {
      // Valida e pulisci i dati prima dell'invio
      const cleanFooter: any = {
        documentoId: document.id,
      };

      if (footer.aspettoColli) cleanFooter.aspettoColli = footer.aspettoColli;
      if (footer.nColli) cleanFooter.nColli = footer.nColli;
      if (footer.totPesoLordo) cleanFooter.totPesoLordo = footer.totPesoLordo;
      if (footer.totPesoNetto) cleanFooter.totPesoNetto = footer.totPesoNetto;
      if (footer.trasportatore)
        cleanFooter.trasportatore = footer.trasportatore;
      if (footer.consegnatoPer)
        cleanFooter.consegnatoPer = footer.consegnatoPer;
      if (Array.isArray(footer.vociDoganali))
        cleanFooter.vociDoganali = footer.vociDoganali;

      const updatedFooter = await exportApi.upsertDocumentFooter(cleanFooter);
      const mergedFooter =
        updatedFooter || { ...(document.piede || {}), ...footer };
      setFooter(mergedFooter);
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              piede: mergedFooter,
            }
          : prev
      );
      showSuccess("Piede documento salvato");
      setShowEditFooterModal(false);
    } catch (error) {
      console.error("Errore salvataggio piede:", error);
      showError("Errore salvataggio piede");
    }
  };

  const handleAddLaunch = async () => {
    if (!document) return;

    try {
      await exportApi.addLaunchData({
        documentoId: document.id,
        ...newLaunch,
      });
      showSuccess("Lancio aggiunto");
      setShowAddLaunchModal(false);
      setNewLaunch({ lancio: "", articolo: "", paia: 0, note: "" });
      fetchDocument();
    } catch (error) {
      showError("Errore aggiunta lancio");
    }
  };

  const handleDeleteLaunchClick = (id: number) => {
    setLaunchToDelete(id);
    setShowDeleteLaunchModal(true);
  };

  const handleDeleteLaunch = async () => {
    if (!launchToDelete) return;

    setShowDeleteLaunchModal(false);

    try {
      await exportApi.deleteLaunchData(launchToDelete);
      showSuccess("Lancio eliminato");
      fetchDocument();
      setLaunchToDelete(null);
    } catch (error) {
      showError("Errore eliminazione lancio");
    }
  };

  // Upload handlers
  const fetchUploadedFiles = async () => {
    try {
      const files = await exportApi.getUploadedFiles(progressivo);
      setUploadedFiles(files);
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      // Upload each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const formData = new FormData();
        formData.append("file", file);

        try {
          await exportApi.uploadExcelFile(progressivo, formData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Errore caricamento ${file.name}:`, error);
        }
      }

      if (successCount > 0) {
        showSuccess(
          `${successCount} file caricati con successo${errorCount > 0 ? `, ${errorCount} errori` : ""}`
        );
      }
      if (errorCount > 0 && successCount === 0) {
        showError(`Errore caricamento di ${errorCount} file`);
      }

      await fetchUploadedFiles();
      e.target.value = ""; // Reset input
    } catch (error) {
      showError("Errore caricamento file");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handlePreviewFile = async (fileName: string) => {
    try {
      const data = await exportApi.processExcelFile(progressivo, fileName);
      if (data.success) {
        setPreviewData(data);
        setPreviewFileName(fileName);
        setExcelFormData({
          lancio: data.lancio || "",
          qty: parseFloat(data.qty) || 1,
          modello: data.modello || "",
        });
        // Select all rows by default
        setSelectedTaglioRows(
          new Set(data.rows?.taglio?.map((_: any, idx: number) => idx) || [])
        );
        setSelectedOrlaturaRows(
          new Set(data.rows?.orlatura?.map((_: any, idx: number) => idx) || [])
        );
        setShowPreviewModal(true);
      } else {
        showError(data.error || "Errore processamento file");
      }
    } catch (error) {
      showError("Errore preview file");
    }
  };

  const handleDeleteFileClick = (fileName: string) => {
    setFileToDelete(fileName);
    setShowDeleteFileModal(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    setShowDeleteFileModal(false);

    try {
      await exportApi.deleteUploadedFile(progressivo, fileToDelete);
      showSuccess("File eliminato");
      await fetchUploadedFiles();
      if (previewFileName === fileToDelete) {
        setPreviewData(null);
        setPreviewFileName("");
      }
      setFileToDelete(null);
    } catch (error) {
      showError("Errore eliminazione file");
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    try {
      await exportApi.requestDownloadExcel(progressivo, fileName);
      showSuccess(`Il lavoro è stato messo in coda.`);
    } catch (error) {
      showError("Errore richiesta download");
    }
  };

  const handleSaveExcelData = async () => {
    if (!previewData || !previewFileName) return;

    // Validate lancio
    if (!excelFormData.lancio.trim()) {
      showError("Il campo Lancio è obbligatorio");
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
      showError("Seleziona almeno una riga da salvare");
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
      showSuccess("Scheda processata e salvata!");

      // Mark file as processed
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.name === previewFileName
            ? {
                ...f,
                processed: true,
                lancio: excelFormData.lancio,
                qty: String(excelFormData.qty),
              }
            : f
        )
      );

      // Close modal and reset
      setShowPreviewModal(false);
      setPreviewData(null);
      setPreviewFileName("");
      setExcelFormData({ lancio: "", qty: 1, modello: "" });
      setSelectedTaglioRows(new Set());
      setSelectedOrlaturaRows(new Set());

      // Refresh files list
      await fetchUploadedFiles();
    } catch (error) {
      showError("Errore salvataggio dati");
    }
  };

  const handleGenerateDDT = async () => {
    setShowGenerateDDTModal(false);

    try {
      const result = await exportApi.generateDDT(progressivo);
      if (result.success) {
        showSuccess("Il lavoro è stato messo in coda.");
        // Refresh document to show new items and lanci
        await fetchDocument();
        // Switch to Righe tab to see results
        setActiveTab("righe");
      } else {
        showError(result.error || "Errore generazione DDT");
      }
    } catch (error) {
      showError("Errore generazione DDT");
    }
  };

  const handleCloseDocument = async () => {
    setShowCloseDocumentModal(false);

    try {
      await exportApi.closeDocument(progressivo);
      showSuccess("Documento chiuso");
      fetchDocument();
    } catch (error) {
      showError("Errore chiusura documento");
    }
  };

  const handleReopenDocument = async () => {
    setShowReopenDocumentModal(false);

    try {
      await exportApi.reopenDocument(progressivo);
      showSuccess("Documento riaperto");
      fetchDocument();
    } catch (error) {
      showError("Errore riapertura documento");
    }
  };

  const handleSaveCommento = async () => {
    if (!document) return;

    try {
      await exportApi.updateDocument(progressivo, { commento: commentoText });
      showSuccess("Commento salvato");
      setShowCommentoModal(false);
      fetchDocument();
    } catch (error) {
      showError("Errore salvataggio commento");
    }
  };

  const handleGeneratePDF = async (
    type: "griglia" | "segnacolli" | "ddt-completo"
  ) => {
    if (!document) return;

    try {
      if (type === "griglia") {
        // Apri modale di selezione invece di generare subito
        handleOpenGrigliaModal();
        return;
      } else if (type === "segnacolli") {
        await exportApi.requestSegnacolliPdf(progressivo);
      } else {
        await exportApi.requestDdtCompletoPdf(progressivo);
      }
      const labels = {
        griglia: "Griglia Materiali",
        segnacolli: "Segnacolli",
        "ddt-completo": "DDT Completo",
      };
      showSuccess(
        `Il lavoro è stato messo in coda.`
      );
    } catch (error) {
      showError("Errore generazione PDF");
    }
  };

  const handleGenerateXLSX = async (type: "ddt-completo") => {
    if (!document) return;

    try {
      await exportApi.requestDdtExcel(progressivo);
      showSuccess("Il lavoro è stato messo in coda.");
    } catch (error) {
      showError("Errore generazione Excel");
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.codiceArticolo.toLowerCase().includes(searchArticle.toLowerCase()) ||
      (a.descrizione &&
        a.descrizione.toLowerCase().includes(searchArticle.toLowerCase()))
  );

  const sanitizeDecimalInput = (value: string) =>
    value.replace(/[^0-9.,]/g, "");

  const parseDecimalInput = (value: string) => {
    const normalized = value.replace(",", ".");
    const num = parseFloat(normalized);
    if (Number.isNaN(num)) return 0;
    return Math.round(num * 100) / 100;
  };

  const handleDecimalChange = (
    field: "qtaOriginale" | "qtaReale" | "prezzoLibero",
    value: string
  ) => {
    const sanitized = sanitizeDecimalInput(value);
    const parsed = parseDecimalInput(sanitized);
    setNewItem((prev) => ({
      ...prev,
      [field]: parsed,
    }));
    setNewItemInputs((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  };

  // Integra mancanti selezionati nel documento corrente
  const handleOpenGrigliaModal = () => {
    if (!document) return;

    // Estrai articoli unici dal documento (solo tipo 'articolo')
    const uniqueArticles = new Map();
    document.righe.forEach(riga => {
      if (riga.tipoRiga === 'articolo' && riga.article) {
        const key = riga.article.codiceArticolo;
        if (!uniqueArticles.has(key)) {
          uniqueArticles.set(key, {
            codiceArticolo: riga.article.codiceArticolo,
            descrizione: riga.article.descrizione,
          });
        }
      }
    });

    setAvailableArticles(Array.from(uniqueArticles.values()));
    setSelectedArticles([]);
    setShowGrigliaModal(true);
  };

  const handleConfirmGriglia = async () => {
    if (selectedArticles.length === 0) {
      showError('Seleziona almeno un articolo');
      return;
    }

    try {
      await exportApi.requestGrigliaMaterialiPdf(progressivo, selectedArticles);
      showSuccess('Etichette Materiali in generazione...');
      setShowGrigliaModal(false);
    } catch (error) {
      showError('Errore nella generazione delle etichette');
    }
  };

  const handleIntegrateMancanti = async () => {
    if (!document || selectedMancanti.size === 0) return;

    try {
      const mancantiDaIntegrare = mancantiFromClosed.filter(m => selectedMancanti.has(m.id));
      
      // Aggiungi ogni mancante come riga del documento
      for (const mancante of mancantiDaIntegrare) {
        await exportApi.addDocumentItem({
          documentoId: document.id,
          articleId: mancante.articleId,
          qtaOriginale: Number(mancante.qtaMancante),
          qtaReale: Number(mancante.qtaMancante),
          isMancante: true,
          rifMancante: `DDT ${mancante.documento.progressivo}`,
          missingDataId: mancante.id,
        });
      }

      showSuccess('Mancanti integrati con successo');
      setShowMancantiOffcanvas(false);
      setSelectedMancanti(new Set());
      await fetchDocument();
    } catch (error) {
      showError('Errore durante integrazione dei mancanti');
    }
  };

  const isOpen = document?.stato === "Aperto";

  // Definizione colonne per react-table
  const columns = useMemo<ColumnDef<DocumentItem>[]>(
    () => [
      {
        accessorKey: "codice",
        header: "Codice Articolo",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="font-mono">
              {item.tipoRiga === "articolo" && item.article
                ? item.article.codiceArticolo
                : item.codiceLibero || "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "descrizione",
        header: "Descrizione",
        cell: ({ row }) => {
          const item = row.original;
          const currentValue =
            item.tipoRiga === "articolo" && item.article
              ? item.article.descrizione || ""
              : item.descrizioneLibera || "";

          return (
            <EditableCell
              value={currentValue}
              onChange={(value) =>
                handleUpdateItemField(
                  item.id,
                  "descrizione",
                  value,
                  item.tipoRiga
                )
              }
              isLoading={savingField === `${item.id}-descrizione`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: "voceDoganale",
        header: "Voce Doganale",
        size: 150,
        cell: ({ row }) => {
          const item = row.original;
          const currentValue =
            item.tipoRiga === "articolo" && item.article
              ? item.article.voceDoganale || ""
              : item.voceLibera || "";

          return (
            <EditableCell
              value={currentValue}
              onChange={(value) =>
                handleUpdateItemField(
                  item.id,
                  "voceDoganale",
                  value,
                  item.tipoRiga
                )
              }
              isLoading={savingField === `${item.id}-voceDoganale`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: "um",
        header: "UM",
        size: 80,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              {item.tipoRiga === "articolo" && item.article
                ? item.article.um || "-"
                : item.umLibera || "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "qtaOriginale",
        header: "QTA",
        size: 100,
        cell: ({ row }) => (
          <div className="text-right">
            {Number(row.original.qtaOriginale).toFixed(3).replace(".", ",")}
          </div>
        ),
      },
      {
        accessorKey: "qtaReale",
        header: "QTA Reale",
        size: 100,
        cell: ({ row }) => {
          const item = row.original;
          const isMissing = item.qtaReale < item.qtaOriginale;
          return (
            <EditableCell
              value={Number(item.qtaReale).toFixed(3).replace(".", ",")}
              onChange={(value) =>
                handleUpdateItemField(item.id, "qtaReale", value, item.tipoRiga)
              }
              align="right"
              isLoading={savingField === `${item.id}-qtaReale`}
              readOnly={!isOpen}
              highlight={isMissing}
              maxValue={item.qtaOriginale}
            />
          );
        },
      },
      {
        accessorKey: "prezzoUnitario",
        header: "Costo Unit.",
        size: 120,
        cell: ({ row }) => {
          const item = row.original;
          const prezzoUnitario =
            item.tipoRiga === "articolo" && item.article
              ? Number(item.article.prezzoUnitario || 0)
              : Number(item.prezzoLibero || 0);

          return (
            <EditableCell
              value={"€" + prezzoUnitario.toFixed(3).replace(".", ",")}
              onChange={(value) =>
                handleUpdateItemField(item.id, "prezzo", value, item.tipoRiga)
              }
              align="right"
              isLoading={savingField === `${item.id}-prezzo`}
              readOnly={!isOpen}
            />
          );
        },
      },
      {
        accessorKey: "totale",
        header: "Totale",
        meta: {
          className: "bg-green-50 dark:bg-green-900/20",
        },
        cell: ({ row }) => {
          const item = row.original;
          const prezzoUnitario =
            item.tipoRiga === "articolo" && item.article
              ? Number(item.article.prezzoUnitario || 0)
              : Number(item.prezzoLibero || 0);
          const totale = item.qtaReale * prezzoUnitario;

          return (
            <div className="font-medium text-right">
              €{totale.toFixed(2).replace(".", ",")}
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

  // Calcola statistiche per il footer
  const footerStats = useMemo(() => {
    if (!document) return null;

    const totalRighe = document.righe.length;
    const totaleMateriali = document.righe.reduce((sum, riga) => {
      const prezzoUnitario =
        riga.tipoRiga === "articolo" && riga.article
          ? Number(riga.article.prezzoUnitario || 0)
          : Number(riga.prezzoLibero || 0);
      const totale = (riga.qtaReale || 0) * prezzoUnitario;
      return sum + totale;
    }, 0);

    return {
      totalRighe,
      totaleMateriali,
      totaleLanci: document.lanci.length,
      totaleMancanti: document.mancanti.length,
      totaleColli: document.piede?.nColli || 0,
      totalePesoNetto: document.piede?.totPesoNetto || 0,
    };
  }, [document]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12 text-red-500">
        Documento non trovato
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`DDT ${document.progressivo}`}
        subtitle={`${document.terzista.ragioneSociale} - ${new Date(document.data).toLocaleDateString("it-IT")}`}
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Export", href: "/export" },
          { label: "Archivio", href: "/export/archive" },
          { label: document.progressivo },
        ]}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Terzista Info */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40"
      >
        <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
          <i className="fas fa-building mr-2 text-blue-500"></i>
          Destinatario
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {document.terzista.ragioneSociale}
            </p>
            {document.terzista.indirizzo1 && (
              <p className="text-gray-600 dark:text-gray-400">
                {document.terzista.indirizzo1}
              </p>
            )}
            {document.terzista.indirizzo2 && (
              <p className="text-gray-600 dark:text-gray-400">
                {document.terzista.indirizzo2}
              </p>
            )}
            {document.terzista.indirizzo3 && (
              <p className="text-gray-600 dark:text-gray-400">
                {document.terzista.indirizzo3}
              </p>
            )}
            {document.terzista.nazione && (
              <p className="mt-1 font-semibold text-gray-700 dark:text-gray-300">
                {document.terzista.nazione}
              </p>
            )}
          </div>
          {document.terzista.consegna && (
            <div>
              <p className="mb-1 font-semibold text-gray-700 dark:text-gray-300">
                Consegna:
              </p>
              <p className="whitespace-pre-line text-gray-600 dark:text-gray-400">
                {document.terzista.consegna}
              </p>
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
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={itemVariants}
        className="mb-6 flex items-center justify-between gap-2"
      >
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("righe")}
            className={tabClasses(activeTab === "righe")}
          >
            <i className="fas fa-list mr-2"></i>
            Righe ({document.righe.length})
          </button>
          <button
            onClick={() => setActiveTab("piede")}
            className={tabClasses(activeTab === "piede")}
          >
            <i className="fas fa-truck mr-2"></i>
            Piede Documento
          </button>
          <button
            onClick={() => setActiveTab("mancanti")}
            className={tabClasses(activeTab === "mancanti")}
          >
            <i className="fas fa-exclamation-triangle mr-2"></i>
            Mancanti ({document.mancanti.length})
          </button>
          <button
            onClick={() => setActiveTab("lanci")}
            className={tabClasses(activeTab === "lanci")}
          >
            <i className="fas fa-play mr-2"></i>
            Lanci ({document.lanci.length})
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={tabClasses(activeTab === "upload")}
          >
            <i className="fas fa-file-excel mr-2"></i>
            Schede Excel
          </button>
        </div>

        {/* Aggiungi Riga - Dropdown */}
        {isOpen && (
          <div className="relative">
            <button
              onClick={() => setShowAddRowPopup(!showAddRowPopup)}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
            >
              <i className="fas fa-plus mr-2"></i>
              Aggiungi Riga
            </button>

            {/* Dropdown Popup */}
            {showAddRowPopup && (
              <>
                {/* Backdrop per chiudere il popup */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAddRowPopup(false)}
                ></div>

                {/* Menu Dropdown */}
                <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <div className="p-2">
                    {/* RIGA LIBERA - solo se NON ci sono lanci */}
                    {document.lanci.length === 0 && (
                      <button
                        onClick={() => {
                          setNewItem({
                            ...newItem,
                            tipoRiga: "libera",
                            articleId: null,
                          });
                          setShowAddRowPopup(false);
                          setShowAddItemModal(true);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <i className="fas fa-edit text-blue-500"></i>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            Riga Libera
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Inserimento manuale articolo
                          </div>
                        </div>
                      </button>
                    )}

                    {/* SCHEDA - solo se NON ci sono lanci E NON ci sono righe libere */}
                    {document.lanci.length === 0 &&
                      document.righe.filter((r) => r.tipoRiga === "libera")
                        .length === 0 && (
                        <button
                          onClick={() => {
                            setShowAddRowPopup(false);
                            setActiveTab("upload");
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <i className="fas fa-file-excel text-green-500"></i>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              Scheda Excel
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Carica file Excel
                            </div>
                          </div>
                        </button>
                      )}

                    {/* MANCANTI - sempre disponibile */}
                    <button
                      onClick={() => {
                        setShowAddRowPopup(false);
                        setShowMancantiOffcanvas(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    >
                      <i className="fas fa-exclamation-triangle text-yellow-500"></i>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Mancanti
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Integra da DDT chiusi
                        </div>
                      </div>
                    </button>

                    {/* COMMENTO - sempre disponibile */}
                    <button
                      onClick={() => {
                        setCommentoText(document.commento || "");
                        setShowAddRowPopup(false);
                        setShowCommentoModal(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <i className="fas fa-comment text-gray-500"></i>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Commento
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Aggiungi nota al documento
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Tab Content */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40"
      >
        {/* Tab Content con AnimatePresence */}
        <AnimatePresence mode="wait">
          {activeTab === "righe" && (
            <motion.div
              key="righe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Righe Documento
                </h3>
              </div>

              {document.righe.length === 0 ? (
                <div className="py-12 text-center">
                  <i className="fas fa-inbox mb-4 text-5xl text-gray-400"></i>
                  <p className="text-gray-500">Nessuna riga inserita</p>
                </div>
              ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
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
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {table.getRowModel().rows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/60 ${
                          rowIndex % 2 === 0
                            ? "bg-white dark:bg-gray-800/40"
                            : "bg-gray-50/50 dark:bg-gray-800/20"
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const columnMeta = cell.column.columnDef.meta as any;
                          return (
                            <td
                              key={cell.id}
                              className={`px-4 py-2 text-sm text-gray-900 dark:text-white ${
                                columnMeta?.className || ""
                              }`}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </motion.div>
          )}

          {activeTab === "piede" && (
            <motion.div
              key="piede"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Piede Documento
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Informazioni sul trasporto e colli
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Aspetto Colli */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Aspetto Colli
                </label>
                <EditableCell
                  value={document.piede?.aspettoColli || ""}
                  onChange={(value) =>
                    handleUpdateFooterField("aspettoColli", value)
                  }
                  readOnly={!isOpen}
                />
              </div>

              {/* N. Colli */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  N. Colli
                </label>
                <EditableCell
                  value={document.piede?.nColli || 0}
                  onChange={(value) =>
                    handleUpdateFooterField("nColli", parseFloat(value) || 0)
                  }
                  readOnly={!isOpen}
                  align="right"
                />
              </div>

              {/* Peso Lordo */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Peso Lordo (kg)
                </label>
                <EditableCell
                  value={document.piede?.totPesoLordo || 0}
                  onChange={(value) =>
                    handleUpdateFooterField(
                      "totPesoLordo",
                      parseFloat(value) || 0
                    )
                  }
                  readOnly={!isOpen}
                  align="right"
                />
              </div>

              {/* Peso Netto */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Peso Netto (kg)
                </label>
                <EditableCell
                  value={document.piede?.totPesoNetto || 0}
                  onChange={(value) =>
                    handleUpdateFooterField(
                      "totPesoNetto",
                      parseFloat(value) || 0
                    )
                  }
                  readOnly={!isOpen}
                  align="right"
                />
              </div>

              {/* Trasportatore */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Trasportatore
                </label>
                <EditableCell
                  value={document.piede?.trasportatore || ""}
                  onChange={(value) =>
                    handleUpdateFooterField("trasportatore", value)
                  }
                  readOnly={!isOpen}
                />
              </div>

              {/* Consegnato Per */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Consegnato Per
                </label>
                <EditableCell
                  value={document.piede?.consegnatoPer || ""}
                  onChange={(value) =>
                    handleUpdateFooterField("consegnatoPer", value)
                  }
                  readOnly={!isOpen}
                />
              </div>

              {/* Voci Doganali */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Voci Doganali
                  </label>
                  {isOpen && (
                    <button
                      onClick={handleOpenVociDoganali}
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-all hover:bg-blue-600"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Gestisci
                    </button>
                  )}
                </div>
                {document.piede?.vociDoganali &&
                Array.isArray(document.piede.vociDoganali) &&
                document.piede.vociDoganali.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                            Voce
                          </th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                            Peso (kg)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...document.piede.vociDoganali]
                          .sort((a: any, b: any) =>
                            (a.voce || "").localeCompare(b.voce || "", undefined, {
                              numeric: true,
                            })
                          )
                          .map((v: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-t border-gray-100 dark:border-gray-700"
                            >
                              <td className="px-4 py-2 text-gray-900 dark:text-white">
                                {v.voce}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                                {v.peso}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Nessuna voce doganale configurata
                  </p>
                )}
              </div>
            </div>
            </motion.div>
          )}

          {activeTab === "mancanti" && (
            <motion.div
              key="mancanti"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Mancanti
              </h3>
            </div>

            {document.mancanti.length === 0 ? (
              <p className="py-12 text-center text-gray-500">Nessun mancante</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Codice Articolo
                      </th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Descrizione
                      </th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                        Qta Mancante
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.mancanti.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="py-3 text-gray-900 dark:text-white">
                          {item.codiceArticolo || '-'}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {item.descrizione || "-"}
                        </td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">
                          {item.qtaMancante}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <i className="fas fa-info-circle mr-2"></i>I mancanti
                    vengono gestiti automaticamente quando si modifica la QTA
                    Reale nelle righe del documento.
                  </p>
                </div>
              </div>
            )}
            </motion.div>
          )}

          {activeTab === "lanci" && (
            <motion.div
              key="lanci"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Lanci
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                I lanci vengono generati automaticamente dalle schede Excel
              </p>
            </div>

            {document.lanci.length === 0 ? (
              <p className="py-12 text-center text-gray-500">Nessun lancio</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Lancio
                      </th>
                      <th className="pb-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Articolo
                      </th>
                      <th className="pb-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                        Paia
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.lanci.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="py-3 text-gray-900 dark:text-white">
                          {item.lancio}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {item.articolo}
                        </td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">
                          {item.paia}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </motion.div>
          )}

          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
            {/* Determina se il DDT è stato generato controllando se ci sono lanci creati da Excel */}
            {(() => {
              const ddtGenerated = document && document.lanci.length > 0;

              return (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {ddtGenerated ? "Allegati" : "Schede Excel"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {ddtGenerated
                        ? "Schede Excel caricate - scaricale come allegati"
                        : "Carica schede Excel per importare dati TAGLIO e ORLATURA nel documento"}
                    </p>
                  </div>

                  {/* Upload Section - Visibile finché il DDT non è stato generato */}
                  {isOpen && !ddtGenerated && (
                    <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/50">
                      <i className="fas fa-file-excel mb-3 text-4xl text-blue-500"></i>
                      <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                        Carica Schede Excel
                      </h4>
                      <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
                        Puoi selezionare più file contemporaneamente (.xlsx o
                        .xls)
                      </p>
                      <label className="inline-block cursor-pointer rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg">
                        <i className="fas fa-upload mr-2"></i>
                        {uploading ? "Caricamento..." : "Seleziona File"}
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          multiple
                          className="hidden"
                          disabled={uploading}
                          onChange={handleFileUpload}
                        />
                      </label>
                      {uploadProgress && (
                        <div className="mt-4">
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                            <span>
                              Caricamento {uploadProgress.current} di{" "}
                              {uploadProgress.total}...
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                              style={{
                                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedFiles.length === 0 ? (
                    <p className="py-12 text-center text-gray-500">
                      Nessuna scheda caricata
                    </p>
                  ) : ddtGenerated ? (
                    // Modalità Allegati - Solo download
                    <>
                      <div className="space-y-3">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60"
                          >
                            <div className="flex items-center gap-3">
                              <i className="fas fa-file-excel text-2xl text-green-500"></i>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {file.name}
                                  </p>
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800/20 dark:text-green-300">
                                    <i className="fas fa-check mr-1"></i>
                                    Allegato
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {file.lancio && file.lancio !== "N/A"
                                    ? `Lancio: ${file.lancio} | Qty: ${file.qty} | `
                                    : ""}
                                  Caricato il{" "}
                                  {new Date(file.uploadedAt).toLocaleString(
                                    "it-IT"
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownloadFile(file.name)}
                                className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-all hover:bg-blue-600"
                              >
                                <i className="fas fa-download mr-1"></i>
                                Scarica
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <i className="fas fa-info-circle mr-2"></i>
                          Le schede Excel sono state elaborate e i dati sono già
                          stati inseriti nel documento. Puoi scaricare i file
                          originali come allegati.
                        </p>
                      </div>
                    </>
                  ) : (
                    // Modalità Elaborazione - Con pulsanti Elabora e Genera DDT
                    <>
                      <div className="space-y-3">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.name}
                            className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                              file.processed
                                ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                                : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <i
                                className={`fas fa-file-excel text-2xl ${file.processed ? "text-green-500" : "text-blue-500"}`}
                              ></i>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {file.name}
                                  </p>
                                  {file.processed && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800/20 dark:text-green-300">
                                      <i className="fas fa-check mr-1"></i>
                                      Elaborato
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {file.lancio && file.lancio !== "N/A"
                                    ? `Lancio: ${file.lancio} | Qty: ${file.qty} | `
                                    : ""}
                                  Caricato il{" "}
                                  {new Date(file.uploadedAt).toLocaleString(
                                    "it-IT"
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {isOpen && (
                                <>
                                  {!file.processed && (
                                    <button
                                      onClick={() =>
                                        handlePreviewFile(file.name)
                                      }
                                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-all hover:bg-blue-600"
                                    >
                                      <i className="fas fa-play mr-1"></i>
                                      Elabora
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDeleteFileClick(file.name)
                                    }
                                    className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {isOpen && uploadedFiles.length > 0 && (
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={() => setShowGenerateDDTModal(true)}
                            className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                          >
                            <i className="fas fa-file-invoice mr-2"></i>
                            Genera DDT
                          </button>
                        </div>
                      )}

                      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <i className="fas fa-info-circle mr-2"></i>
                          Elabora ogni scheda per verificare i dati, poi premi
                          "Genera DDT" per consolidare tutti gli articoli nel
                          documento.
                        </p>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      </motion.div>

      {/* MODAL: Add Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Aggiungi Riga
            </h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo Riga
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newItem.tipoRiga === "articolo"}
                    onChange={() =>
                      setNewItem({ ...newItem, tipoRiga: "articolo" })
                    }
                    className="mr-2"
                  />
                  Da Articolo Master
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newItem.tipoRiga === "libera"}
                    onChange={() =>
                      setNewItem({ ...newItem, tipoRiga: "libera" })
                    }
                    className="mr-2"
                  />
                  Riga Libera
                </label>
              </div>
            </div>

            {newItem.tipoRiga === "articolo" ? (
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
                      onClick={() =>
                        setNewItem({ ...newItem, articleId: art.id })
                      }
                      className={`cursor-pointer border-b border-gray-200 p-3 transition-colors hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                        newItem.articleId === art.id
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : ""
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {art.codiceArticolo}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {art.descrizione || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Codice
                  </label>
                  <input
                    type="text"
                    value={newItem.codiceLibero}
                    onChange={(e) =>
                      setNewItem({ ...newItem, codiceLibero: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={newItem.descrizioneLibera}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        descrizioneLibera: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Voce Doganale
                  </label>
                  <input
                    type="text"
                    value={newItem.voceLibera}
                    onChange={(e) =>
                      setNewItem({ ...newItem, voceLibera: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    UM
                  </label>
                  <input
                    type="text"
                    value={newItem.umLibera}
                    onChange={(e) =>
                      setNewItem({ ...newItem, umLibera: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prezzo
                  </label>
                  <input
                    type="text"
                  
                    value={newItemInputs.prezzoLibero}
                    onChange={(e) => handleDecimalChange("prezzoLibero", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Qta Originale
                </label>
                <input
                  type="text"
                 
                  value={newItemInputs.qtaOriginale}
                  onChange={(e) => handleDecimalChange("qtaOriginale", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Qta Reale
                </label>
                <input
                  type="text"
                 
                  value={newItemInputs.qtaReale}
                  onChange={(e) => handleDecimalChange("qtaReale", e.target.value)}
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
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Modifica Piede Documento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Aspetto Colli
                </label>
                <input
                  type="text"
                  value={footer.aspettoColli || ""}
                  onChange={(e) =>
                    setFooter({ ...footer, aspettoColli: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  N. Colli
                </label>
                <input
                  type="number"
                  value={footer.nColli || 0}
                  onChange={(e) =>
                    setFooter({
                      ...footer,
                      nColli: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Peso Lordo (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={footer.totPesoLordo || 0}
                  onChange={(e) =>
                    setFooter({
                      ...footer,
                      totPesoLordo: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Peso Netto (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={footer.totPesoNetto || 0}
                  onChange={(e) =>
                    setFooter({
                      ...footer,
                      totPesoNetto: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trasportatore
                </label>
                <input
                  type="text"
                  value={footer.trasportatore || ""}
                  onChange={(e) =>
                    setFooter({ ...footer, trasportatore: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Consegnato Per
                </label>
                <textarea
                  value={footer.consegnatoPer || ""}
                  onChange={(e) =>
                    setFooter({ ...footer, consegnatoPer: e.target.value })
                  }
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
                value={
                  footer.vociDoganali
                    ? JSON.stringify(footer.vociDoganali, null, 2)
                    : "[]"
                }
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

      {/* MODAL: Add Launch */}
      {showAddLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Aggiungi Lancio
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lancio
                </label>
                <input
                  type="text"
                  value={newLaunch.lancio}
                  onChange={(e) =>
                    setNewLaunch({ ...newLaunch, lancio: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Articolo
                </label>
                <input
                  type="text"
                  value={newLaunch.articolo}
                  onChange={(e) =>
                    setNewLaunch({ ...newLaunch, articolo: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paia
                </label>
                <input
                  type="number"
                  value={newLaunch.paia}
                  onChange={(e) =>
                    setNewLaunch({
                      ...newLaunch,
                      paia: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Note
                </label>
                <textarea
                  value={newLaunch.note}
                  onChange={(e) =>
                    setNewLaunch({ ...newLaunch, note: e.target.value })
                  }
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
                    onChange={(e) =>
                      setExcelFormData({
                        ...excelFormData,
                        lancio: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setExcelFormData({
                        ...excelFormData,
                        qty: parseFloat(e.target.value) || 1,
                      })
                    }
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* TAGLIO Table */}
              {previewData.rows?.taglio &&
                previewData.rows.taglio.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-cut mr-2 text-red-500"></i>
                      TAGLIO ({selectedTaglioRows.size}/
                      {previewData.rows.taglio.length} selezionate)
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={
                                  selectedTaglioRows.size ===
                                  previewData.rows.taglio.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTaglioRows(
                                      new Set(
                                        previewData.rows.taglio.map(
                                          (_: any, idx: number) => idx
                                        )
                                      )
                                    );
                                  } else {
                                    setSelectedTaglioRows(new Set());
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                            {previewData.headers?.map(
                              (header: string, idx: number) => (
                                <th
                                  key={idx}
                                  className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300"
                                >
                                  {header}
                                </th>
                              )
                            )}
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                              Totale
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                          {previewData.rows.taglio.map(
                            (row: string[], idx: number) => {
                              const unitValue = parseFloat(row[4]) || 0;
                              const total = (
                                unitValue * excelFormData.qty
                              ).toFixed(2);
                              return (
                                <tr
                                  key={idx}
                                  className={
                                    !selectedTaglioRows.has(idx)
                                      ? "opacity-40"
                                      : ""
                                  }
                                >
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedTaglioRows.has(idx)}
                                      onChange={(e) => {
                                        const newSet = new Set(
                                          selectedTaglioRows
                                        );
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
                                    <td
                                      key={cellIdx}
                                      className="px-3 py-2 text-gray-900 dark:text-white"
                                    >
                                      {cell || "-"}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                                    {total}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* ORLATURA Table */}
              {previewData.rows?.orlatura &&
                previewData.rows.orlatura.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                      <i className="fas fa-border-style mr-2 text-blue-500"></i>
                      ORLATURA ({selectedOrlaturaRows.size}/
                      {previewData.rows.orlatura.length} selezionate)
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={
                                  selectedOrlaturaRows.size ===
                                  previewData.rows.orlatura.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrlaturaRows(
                                      new Set(
                                        previewData.rows.orlatura.map(
                                          (_: any, idx: number) => idx
                                        )
                                      )
                                    );
                                  } else {
                                    setSelectedOrlaturaRows(new Set());
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                            {previewData.headers?.map(
                              (header: string, idx: number) => (
                                <th
                                  key={idx}
                                  className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300"
                                >
                                  {header}
                                </th>
                              )
                            )}
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                              Totale
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                          {previewData.rows.orlatura.map(
                            (row: string[], idx: number) => {
                              const unitValue = parseFloat(row[4]) || 0;
                              const total = (
                                unitValue * excelFormData.qty
                              ).toFixed(2);
                              return (
                                <tr
                                  key={idx}
                                  className={
                                    !selectedOrlaturaRows.has(idx)
                                      ? "opacity-40"
                                      : ""
                                  }
                                >
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedOrlaturaRows.has(idx)}
                                      onChange={(e) => {
                                        const newSet = new Set(
                                          selectedOrlaturaRows
                                        );
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
                                    <td
                                      key={cellIdx}
                                      className="px-3 py-2 text-gray-900 dark:text-white"
                                    >
                                      {cell || "-"}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                                    {total}
                                  </td>
                                </tr>
                              );
                            }
                          )}
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

      {/* MODAL: Conferma Genera DDT */}
      {showGenerateDDTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <i className="fas fa-file-invoice text-xl text-green-600 dark:text-green-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Genera DDT
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Conferma l'operazione
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Tutti gli articoli dalle schede elaborate verranno consolidati e
              inseriti nel documento. Questa operazione non può essere
              annullata.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateDDTModal(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleGenerateDDT}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <i className="fas fa-check mr-2"></i>
                Genera
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Conferma Chiudi Documento */}
      {showCloseDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <i className="fas fa-lock text-xl text-yellow-600 dark:text-yellow-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Chiudi Documento
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Questa azione è irreversibile
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Il documento verrà chiuso e non sarà più modificabile. Vuoi
              continuare?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseDocumentModal(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleCloseDocument}
                className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                <i className="fas fa-lock mr-2"></i>
                Chiudi
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Conferma Elimina File */}
      {showDeleteFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <i className="fas fa-exclamation-triangle text-xl text-red-600 dark:text-red-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Elimina File
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Questa azione è irreversibile
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Sei sicuro di voler eliminare il file{" "}
              <strong>{fileToDelete}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteFileModal(false);
                  setFileToDelete(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteFile}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <i className="fas fa-trash mr-2"></i>
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Conferma Riapri Documento */}
      {showReopenDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <i className="fas fa-lock-open text-xl text-yellow-600 dark:text-yellow-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Riapri Documento
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Conferma l'operazione
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Il documento verrà riaperto e sarà nuovamente modificabile. Vuoi
              continuare?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReopenDocumentModal(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleReopenDocument}
                className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700"
              >
                <i className="fas fa-lock-open mr-2"></i>
                Riapri
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Conferma Elimina Lancio */}
      {showDeleteLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <i className="fas fa-exclamation-triangle text-xl text-red-600 dark:text-red-400"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Elimina Lancio
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Questa azione è irreversibile
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Sei sicuro di voler eliminare questo lancio?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteLaunchModal(false);
                  setLaunchToDelete(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteLaunch}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <i className="fas fa-trash mr-2"></i>
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* OFFCANVAS: Voci Doganali */}
      <Offcanvas
        open={showVociDoganaliOffcanvas}
        onClose={() => setShowVociDoganaliOffcanvas(false)}
        title="Gestisci Voci Doganali"
      
        iconColor="text-blue-500"
        width="xl"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowVociDoganaliOffcanvas(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Annulla
            </button>
            <button
              onClick={handleSaveVociDoganali}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
              disabled={vociDoganaliEdit.length === 0}
            >
              <i className="fas fa-save mr-2"></i>
              Salva
            </button>
          </div>
        }
      >
        <div className="px-6">
          {/* Pulsante per aggiungere SOTTOPIEDI */}
          <div className="mb-4">
            <button
              onClick={() => {
                const hasSottopiedi = vociDoganaliEdit.some(v => v.voce === 'SOTTOPIEDI');
                if (!hasSottopiedi) {
                  setVociDoganaliEdit([...vociDoganaliEdit, { voce: 'SOTTOPIEDI', peso: 0 }]);
                }
              }}
              disabled={vociDoganaliEdit.some(v => v.voce === 'SOTTOPIEDI')}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-plus mr-2"></i>
              Aggiungi SOTTOPIEDI
            </button>
          </div>

          {vociDoganaliEdit.length === 0 ? (
            <div className="py-12 text-center">
              <i className="fas fa-inbox mb-4 text-5xl text-gray-400"></i>
              <p className="text-gray-500">
                Nessuna voce doganale trovata nelle righe del documento
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Voce Doganale
                    </th>

                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Peso (kg)
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[...vociDoganaliEdit]
                    .sort((a, b) => {
                      // SOTTOPIEDI sempre per ultimo
                      if (a.voce === 'SOTTOPIEDI') return 1;
                      if (b.voce === 'SOTTOPIEDI') return -1;
                      return (a.voce || "").localeCompare(b.voce || "", undefined, { numeric: true });
                    })
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-4 py-2 font-mono text-sm font-bold text-gray-900 dark:text-white">
                          {item.voce === 'SOTTOPIEDI' ? (
                            <span className="text-purple-600 dark:text-purple-400">{item.voce}</span>
                          ) : (
                            item.voce
                          )}
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.peso}
                            onChange={(e) => {
                              const newVoci = [...vociDoganaliEdit];
                              const actualIdx = newVoci.findIndex(v => v.voce === item.voce);
                              newVoci[actualIdx].peso = parseFloat(e.target.value) || 0;
                              setVociDoganaliEdit(newVoci);
                            }}
                            className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.voce === 'SOTTOPIEDI' && (
                            <button
                              onClick={() => {
                                setVociDoganaliEdit(vociDoganaliEdit.filter(v => v.voce !== 'SOTTOPIEDI'));
                              }}
                              className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Rimuovi SOTTOPIEDI"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Offcanvas>

      {/* Offcanvas Commento */}
      <Offcanvas
        open={showCommentoModal}
        onClose={() => setShowCommentoModal(false)}
        title="Commento Documento"
        icon="fa-comment"
        iconColor="text-gray-500"
        width="md"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowCommentoModal(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Annulla
            </button>
            <button
              onClick={handleSaveCommento}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
            >
              <i className="fas fa-save mr-2"></i>
              Salva
            </button>
          </div>
        }
      >
        <div className="px-6">
          <textarea
            value={commentoText}
            onChange={(e) => setCommentoText(e.target.value)}
            placeholder="Inserisci un commento..."
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </Offcanvas>

      {/* Offcanvas Mancanti da altri DDT */}
      <Offcanvas
        open={showMancantiOffcanvas}
        onClose={() => setShowMancantiOffcanvas(false)}
        title="Aggiungi Mancanti attivi"
        iconColor="text-yellow-500"
        width="xl"
        loading={loadingMancanti}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowMancantiOffcanvas(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Annulla
            </button>
            <button
              onClick={handleIntegrateMancanti}
              disabled={selectedMancanti.size === 0 || loadingMancanti}
              className="flex-1 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-check mr-2"></i>
              Integra Selezionati ({selectedMancanti.size})
            </button>
          </div>
        }
      >
        <div className="px-6">
          {mancantiFromClosed.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
              <p className="text-gray-500 dark:text-gray-400">
                Nessun mancante trovato in DDT chiusi di questo terzista
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Trovati <span className="font-bold">{mancantiFromClosed.length}</span> mancanti da {new Set(mancantiFromClosed.map(m => m.documento.progressivo)).size} documenti
                </p>
                <button
                  onClick={() => {
                    if (selectedMancanti.size === mancantiFromClosed.length) {
                      setSelectedMancanti(new Set());
                    } else {
                      setSelectedMancanti(new Set(mancantiFromClosed.map(m => m.id)));
                    }
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selectedMancanti.size === mancantiFromClosed.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>

              {mancantiFromClosed.map((mancante) => (
                <label
                  key={mancante.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    selectedMancanti.has(mancante.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMancanti.has(mancante.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedMancanti);
                      if (e.target.checked) {
                        newSet.add(mancante.id);
                      } else {
                        newSet.delete(mancante.id);
                      }
                      setSelectedMancanti(newSet);
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                          {mancante.article.codiceArticolo}
                        </span>
                        {mancante.article.descrizione && (
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            {mancante.article.descrizione}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">
                        {Number(mancante.qtaMancante).toFixed(3).replace('.', ',')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <i className="fas fa-file-alt"></i>
                      <span>DDT {mancante.documento.progressivo}</span>
                      <span>-</span>
                      <i className="fas fa-calendar"></i>
                      <span>{new Date(mancante.documento.data).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </Offcanvas>

      {/* Modal Selezione Articoli per Etichette Materiali */}
      {showGrigliaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="border-b bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Seleziona Articoli per Etichette
                  </h3>
                  <p className="text-sm text-purple-100 mt-1">
                    Scegli gli articoli da includere nelle etichette materiali
                  </p>
                </div>
                <button
                  onClick={() => setShowGrigliaModal(false)}
                  className="rounded-lg p-2 text-white hover:bg-white/20 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Contenuto a due colonne */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 h-[600px]">
                {/* Colonna Sinistra - Articoli Disponibili */}
                <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Articoli Disponibili
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {availableArticles.length} articoli nel documento
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {availableArticles.map((article) => {
                      const isSelected = selectedArticles.some(
                        (a) => a.codiceArticolo === article.codiceArticolo
                      );
                      return (
                        <button
                          key={article.codiceArticolo}
                          onClick={() => {
                            if (!isSelected) {
                              setSelectedArticles([...selectedArticles, article]);
                            }
                          }}
                          disabled={isSelected}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                              isSelected
                                ? 'bg-gray-200 dark:bg-gray-700'
                                : 'bg-purple-100 dark:bg-purple-900/30'
                            }`}>
                              <i className={`fas fa-cube text-sm ${
                                isSelected
                                  ? 'text-gray-400'
                                  : 'text-purple-600 dark:text-purple-400'
                              }`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                isSelected
                                  ? 'text-gray-400 dark:text-gray-500'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {article.descrizione || 'Senza descrizione'}
                              </p>
                              <p className={`text-xs mt-0.5 ${
                                isSelected
                                  ? 'text-gray-400 dark:text-gray-600'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {article.codiceArticolo}
                              </p>
                            </div>
                            {isSelected && (
                              <i className="fas fa-check text-gray-400 text-sm flex-shrink-0"></i>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colonna Destra - Articoli Selezionati */}
                <div className="flex flex-col border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-purple-50/30 dark:bg-purple-900/10">
                  <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-3 border-b border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                      Selezionati per Etichette
                    </h4>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      {selectedArticles.length} {selectedArticles.length === 1 ? 'articolo selezionato' : 'articoli selezionati'}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {selectedArticles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                          <i className="fas fa-arrow-left text-2xl text-purple-400 dark:text-purple-500"></i>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Seleziona articoli dalla colonna a sinistra
                        </p>
                      </div>
                    ) : (
                      selectedArticles.map((article) => (
                        <div
                          key={article.codiceArticolo}
                          className="p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                              <i className="fas fa-tag text-sm text-purple-600 dark:text-purple-400"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {article.descrizione || 'Senza descrizione'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {article.codiceArticolo}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedArticles(
                                  selectedArticles.filter(
                                    (a) => a.codiceArticolo !== article.codiceArticolo
                                  )
                                );
                              }}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                            >
                              <i className="fas fa-times text-sm"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con azioni */}
            <div className="border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedArticles.length > 0 ? (
                    <>
                      Verranno generate{' '}
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {selectedArticles.length}
                      </span>{' '}
                      {selectedArticles.length === 1 ? 'etichetta' : 'etichette'}
                    </>
                  ) : (
                    'Seleziona almeno un articolo per procedere'
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGrigliaModal(false)}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleConfirmGriglia}
                    disabled={selectedArticles.length === 0}
                    className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-file-pdf mr-2"></i>
                    Genera Etichette PDF
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer con statistiche */}
      <Footer show={!!document}>
        <div className="flex items-center justify-between gap-4 text-sm">
          {/* Colli e Peso Netto a sinistra */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <i className="fas fa-box text-purple-600 dark:text-purple-400"></i>
              </div>
              <span className="text-gray-600 dark:text-gray-400">Colli:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {footerStats?.totaleColli || 0}
              </span>
            </div>

            <span className="text-gray-300 dark:text-gray-600">|</span>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <i className="fas fa-weight text-orange-600 dark:text-orange-400"></i>
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Peso Netto:
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {Number(footerStats?.totalePesoNetto || 0).toFixed(2)} kg
              </span>
            </div>
          </div>

          {/* Popup Azioni a destra */}
          <div className="relative">
            <button
              onClick={() => setShowActionsPopup(!showActionsPopup)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
            >
              <i className="fas fa-ellipsis-v"></i>
              Azioni
            </button>

            {/* Popup Menu */}
            {showActionsPopup && (
              <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <div className="p-2 space-y-1">
                  {/* PDF DDT */}
                  <button
                    onClick={() => {
                      handleGeneratePDF("ddt-completo");
                      setShowActionsPopup(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <i className="fas fa-file-pdf text-red-500 w-5"></i>
                    <span>DDT PDF</span>
                  </button>

                  {/* Excel DDT */}
                  <button
                    onClick={() => {
                      handleGenerateXLSX("ddt-completo");
                      setShowActionsPopup(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <i className="fas fa-file-excel text-green-500 w-5"></i>
                    <span>DDT Excel</span>
                  </button>

                  {/* Etichette Materiali */}
                  <button
                    onClick={() => {
                      handleGeneratePDF("griglia");
                      setShowActionsPopup(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <i className="fas fa-tags text-purple-500 w-5"></i>
                    <span>Etichette Materiali</span>
                  </button>

                  {/* Segnacolli */}
                  <button
                    onClick={() => {
                      handleGeneratePDF("segnacolli");
                      setShowActionsPopup(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <i className="fas fa-file-pdf text-indigo-500 w-5"></i>
                    <span>Segnacolli</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                  {/* Chiudi/Riapri */}
                  {isOpen ? (
                    <button
                      onClick={() => {
                        setShowCloseDocumentModal(true);
                        setShowActionsPopup(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <i className="fas fa-lock text-gray-500 w-5"></i>
                      <span>Chiudi Documento</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowReopenDocumentModal(true);
                        setShowActionsPopup(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                    >
                      <i className="fas fa-lock-open text-yellow-500 w-5"></i>
                      <span>Riapri Documento</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Footer>
    </div>
  );
}
