"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { analiticheApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface Reparto {
  id: number;
  nome: string;
  codice: string | null;
}

interface AnaliticaRecord {
  id: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  dataDocumento: string | null;
  linea: string | null;
  articolo: string | null;
  descrizioneArt: string | null;
  tipologiaOrdine: string | null;
  quantita: string | number | null;
  prezzoUnitario: string | number | null;
  prodottoEstero: boolean | null;
  repartoId: number | null;
  repartoFinaleId: number | null;
  costoTaglio: string | number | null;
  costoOrlatura: string | number | null;
  costoStrobel: string | number | null;
  altriCosti: string | number | null;
  costoMontaggio: string | number | null;
  reparto: Reparto | null;
  repartoFinale: Reparto | null;
  import?: { id: number; fileName: string } | null;
}

interface DistinctFilters {
  tipiDocumento: Array<{ value: string; count: number }>;
  linee: Array<{ value: string; count: number }>;
  mesi: Array<{ value: string; count: number }>;
}

interface Filters {
  search: string;
  tipoDocumento: string;
  linea: string;
  mese: string;
  prodottoEstero: string;
  repartoId: string;
}

// Colonne disponibili
const ALL_COLUMNS = [
  { key: "dataDocumento", label: "Data", width: 90 },
  { key: "tipoDocumento", label: "Tipo Doc", width: 80 },
  { key: "numeroDocumento", label: "N. Doc", width: 80 },
  { key: "articolo", label: "Articolo", width: 120 },
  { key: "descrizioneArt", label: "Descrizione", width: 180 },
  { key: "linea", label: "Linea", width: 100 },
  { key: "tipologiaOrdine", label: "Tip. Ordine", width: 100 },
  { key: "quantita", label: "Qtà", width: 70, align: "right" as const },
  { key: "prezzoUnitario", label: "Prezzo", width: 80, align: "right" as const },
  { key: "prodottoEstero", label: "Origine", width: 70, align: "center" as const },
  { key: "reparto", label: "Reparto", width: 100 },
  { key: "repartoFinale", label: "Rep.Finale", width: 100 },
  { key: "costoTaglio", label: "C.Taglio", width: 80, align: "right" as const },
  { key: "costoOrlatura", label: "C.Orlatura", width: 80, align: "right" as const },
  { key: "costoStrobel", label: "C.Strobel", width: 80, align: "right" as const },
  { key: "altriCosti", label: "Altri", width: 70, align: "right" as const },
  { key: "costoMontaggio", label: "C.Montaggio", width: 90, align: "right" as const },
];

type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

// Colonne visibili di default
const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "dataDocumento", "tipoDocumento", "numeroDocumento", "articolo", "descrizioneArt",
  "quantita", "prezzoUnitario", "prodottoEstero", "reparto", "repartoFinale",
  "costoTaglio", "costoOrlatura", "costoStrobel", "altriCosti", "costoMontaggio"
];

type GroupByField = "none" | "articolo" | "linea" | "tipoDocumento" | "reparto";

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AnaliticaRecord[]>([]);
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [distinctFilters, setDistinctFilters] = useState<DistinctFilters | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filtri
  const [filters, setFilters] = useState<Filters>({
    search: "",
    tipoDocumento: "",
    linea: "",
    mese: "",
    prodottoEstero: "all",
    repartoId: "",
  });

  // Selezione multipla
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Raggruppamento
  const [groupBy, setGroupBy] = useState<GroupByField>("none");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Colonne visibili (carica da localStorage se presente)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("analitiche_records_columns");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ColumnKey[];
          return new Set(parsed);
        } catch {
          // ignore
        }
      }
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Salva colonne visibili in localStorage quando cambiano
  useEffect(() => {
    localStorage.setItem("analitiche_records_columns", JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  // Modal edit
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showSingleEditModal, setShowSingleEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AnaliticaRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AnaliticaRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editData, setEditData] = useState({
    prodottoEstero: "",
    repartoId: "",
    repartoFinaleId: "",
    costoTaglio: "",
    costoOrlatura: "",
    costoStrobel: "",
    altriCosti: "",
    costoMontaggio: "",
  });

  // Carica dati iniziali
  useEffect(() => {
    loadInitialData();
  }, []);

  // Carica records quando cambiano i filtri
  useEffect(() => {
    loadRecords();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [repartiData, filtersData] = await Promise.all([
        analiticheApi.getReparti(true),
        analiticheApi.getFilters(),
      ]);
      setReparti(repartiData);
      setDistinctFilters(filtersData);
    } catch (error) {
      showError("Errore nel caricamento dei dati iniziali");
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);

      let dataFrom: string | undefined;
      let dataTo: string | undefined;

      if (filters.mese) {
        const [year, month] = filters.mese.split("-").map(Number);
        dataFrom = `${filters.mese}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        dataTo = `${filters.mese}-${lastDay.toString().padStart(2, "0")}`;
      }

      const result = await analiticheApi.getRecords({
        search: filters.search || undefined,
        tipoDocumento: filters.tipoDocumento || undefined,
        linea: filters.linea || undefined,
        dataFrom,
        dataTo,
        prodottoEstero: filters.prodottoEstero === "all"
          ? undefined
          : filters.prodottoEstero === "null"
            ? "null"
            : filters.prodottoEstero === "true",
        repartoId: filters.repartoId ? parseInt(filters.repartoId) : undefined,
        limit: 10000, // Carica tutti i record senza paginazione
      });

      setRecords(result.data);
      setTotalCount(result.pagination.total);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (error) {
      showError("Errore nel caricamento dei record");
    } finally {
      setLoading(false);
    }
  };

  // Helper per convertire valori numerici (Prisma Decimal arriva come stringa)
  const toNumber = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? null : num;
  };

  // Formatta numero
  const formatNumber = (val: string | number | null | undefined, decimals = 2): string => {
    const num = toNumber(val);
    if (num === null) return "-";
    return num.toLocaleString("it-IT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Formatta data
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("it-IT");
  };

  // Formatta mese per display
  const formatMonth = (meseStr: string): string => {
    const [year, month] = meseStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Raggruppa i record
  const groupedRecords = useMemo(() => {
    if (groupBy === "none") return null;

    const groups: Record<string, AnaliticaRecord[]> = {};

    for (const record of records) {
      let key: string;
      switch (groupBy) {
        case "articolo":
          key = record.articolo || "(Senza articolo)";
          break;
        case "linea":
          key = record.linea || "(Senza linea)";
          break;
        case "tipoDocumento":
          key = record.tipoDocumento || "(Senza tipo)";
          break;
        case "reparto":
          key = record.reparto?.nome || "(Senza reparto)";
          break;
        default:
          key = "Tutti";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    }

    return groups;
  }, [records, groupBy]);

  // Toggle selezione singola
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle seleziona tutto
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
    setSelectAll(!selectAll);
  };

  // Seleziona gruppo
  const selectGroup = (groupRecords: AnaliticaRecord[]) => {
    const newSelected = new Set(selectedIds);
    const allSelected = groupRecords.every(r => selectedIds.has(r.id));

    if (allSelected) {
      groupRecords.forEach(r => newSelected.delete(r.id));
    } else {
      groupRecords.forEach(r => newSelected.add(r.id));
    }
    setSelectedIds(newSelected);
  };

  // Toggle espansione gruppo
  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // Apri modal edit singolo
  const openEditSingleModal = (record: AnaliticaRecord) => {
    setEditingRecord(record);
    setEditData({
      prodottoEstero: record.prodottoEstero === null ? "" : record.prodottoEstero ? "true" : "false",
      repartoId: record.repartoId?.toString() || "",
      repartoFinaleId: record.repartoFinaleId?.toString() || "",
      costoTaglio: toNumber(record.costoTaglio)?.toString() || "",
      costoOrlatura: toNumber(record.costoOrlatura)?.toString() || "",
      costoStrobel: toNumber(record.costoStrobel)?.toString() || "",
      altriCosti: toNumber(record.altriCosti)?.toString() || "",
      costoMontaggio: toNumber(record.costoMontaggio)?.toString() || "",
    });
    setShowSingleEditModal(true);
  };

  // Apri modal edit massivo
  const openBulkEditModal = () => {
    setEditData({
      prodottoEstero: "",
      repartoId: "",
      repartoFinaleId: "",
      costoTaglio: "",
      costoOrlatura: "",
      costoStrobel: "",
      altriCosti: "",
      costoMontaggio: "",
    });
    setShowBulkEditModal(true);
  };

  // Apri modal conferma elimina
  const openDeleteModal = (record: AnaliticaRecord) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  // Elimina singolo record
  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      setDeleting(true);
      await analiticheApi.deleteRecord(recordToDelete.id);
      showSuccess("Record eliminato");
      setShowDeleteModal(false);
      setRecordToDelete(null);
      loadRecords();
    } catch (error: any) {
      showError(error.message || "Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  // Salva singolo record
  const saveSingleEdit = async () => {
    if (!editingRecord) return;

    try {
      setLoading(true);

      const updateData: Record<string, boolean | number | null> = {
        prodottoEstero: editData.prodottoEstero === "" ? null : editData.prodottoEstero === "true",
        repartoId: editData.repartoId ? parseInt(editData.repartoId) : null,
        repartoFinaleId: editData.repartoFinaleId ? parseInt(editData.repartoFinaleId) : null,
        costoTaglio: editData.costoTaglio ? parseFloat(editData.costoTaglio) : null,
        costoOrlatura: editData.costoOrlatura ? parseFloat(editData.costoOrlatura) : null,
        costoStrobel: editData.costoStrobel ? parseFloat(editData.costoStrobel) : null,
        altriCosti: editData.altriCosti ? parseFloat(editData.altriCosti) : null,
        costoMontaggio: editData.costoMontaggio ? parseFloat(editData.costoMontaggio) : null,
      };

      await analiticheApi.updateRecord(editingRecord.id, updateData);
      showSuccess("Record aggiornato");
      setShowSingleEditModal(false);
      setEditingRecord(null);
      loadRecords();
    } catch (error) {
      showError("Errore durante l'aggiornamento");
    } finally {
      setLoading(false);
    }
  };

  // Applica modifica massiva
  const applyBulkEdit = async () => {
    if (selectedIds.size === 0) {
      showError("Seleziona almeno un record");
      return;
    }

    const updateData: Record<string, boolean | number | null> = {};

    if (editData.prodottoEstero !== "") {
      updateData.prodottoEstero = editData.prodottoEstero === "null" ? null : editData.prodottoEstero === "true";
    }
    if (editData.repartoId !== "") {
      updateData.repartoId = editData.repartoId === "null" ? null : parseInt(editData.repartoId);
    }
    if (editData.repartoFinaleId !== "") {
      updateData.repartoFinaleId = editData.repartoFinaleId === "null" ? null : parseInt(editData.repartoFinaleId);
    }
    if (editData.costoTaglio !== "") {
      updateData.costoTaglio = parseFloat(editData.costoTaglio) || null;
    }
    if (editData.costoOrlatura !== "") {
      updateData.costoOrlatura = parseFloat(editData.costoOrlatura) || null;
    }
    if (editData.costoStrobel !== "") {
      updateData.costoStrobel = parseFloat(editData.costoStrobel) || null;
    }
    if (editData.altriCosti !== "") {
      updateData.altriCosti = parseFloat(editData.altriCosti) || null;
    }
    if (editData.costoMontaggio !== "") {
      updateData.costoMontaggio = parseFloat(editData.costoMontaggio) || null;
    }

    if (Object.keys(updateData).length === 0) {
      showError("Nessun campo da aggiornare");
      return;
    }

    try {
      setLoading(true);
      let updated = 0;

      for (const id of Array.from(selectedIds)) {
        await analiticheApi.updateRecord(id, updateData);
        updated++;
      }

      showSuccess(`${updated} record aggiornati`);
      setShowBulkEditModal(false);
      loadRecords();
    } catch (error) {
      showError("Errore durante l'aggiornamento");
    } finally {
      setLoading(false);
    }
  };

  // Calcola totali per gruppo
  const calculateGroupTotals = (groupRecords: AnaliticaRecord[]) => {
    return {
      count: groupRecords.length,
      quantita: groupRecords.reduce((sum, r) => sum + (toNumber(r.quantita) || 0), 0),
      valore: groupRecords.reduce((sum, r) => sum + ((toNumber(r.quantita) || 0) * (toNumber(r.prezzoUnitario) || 0)), 0),
      costoTotale: groupRecords.reduce((sum, r) => {
        const costi = (toNumber(r.costoTaglio) || 0) + (toNumber(r.costoOrlatura) || 0) +
                      (toNumber(r.costoStrobel) || 0) + (toNumber(r.altriCosti) || 0) +
                      (toNumber(r.costoMontaggio) || 0);
        return sum + costi * (toNumber(r.quantita) || 0);
      }, 0),
    };
  };

  // Toggle colonna visibile
  const toggleColumn = (key: ColumnKey) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleColumns(newVisible);
  };

  // Colonne visibili ordinate
  const visibleColumnsList = useMemo(() => {
    return ALL_COLUMNS.filter(col => visibleColumns.has(col.key));
  }, [visibleColumns]);

  // Render cella
  const renderCell = (record: AnaliticaRecord, col: typeof ALL_COLUMNS[number]) => {
    const style = { width: col.width, minWidth: col.width, maxWidth: col.width };

    switch (col.key) {
      case "dataDocumento":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{formatDate(record.dataDocumento)}</td>;
      case "tipoDocumento":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-500 truncate">{record.tipoDocumento || "-"}</td>;
      case "numeroDocumento":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-500 truncate">{record.numeroDocumento || "-"}</td>;
      case "articolo":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs font-mono font-medium text-gray-900 dark:text-white truncate" title={record.articolo || ""}>{record.articolo || "-"}</td>;
      case "descrizioneArt":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate" title={record.descrizioneArt || ""}>{record.descrizioneArt || "-"}</td>;
      case "linea":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{record.linea || "-"}</td>;
      case "tipologiaOrdine":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-500 truncate">{record.tipologiaOrdine || "-"}</td>;
      case "quantita":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right font-medium text-gray-900 dark:text-white">{formatNumber(record.quantita, 0)}</td>;
      case "prezzoUnitario":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right text-gray-600 dark:text-gray-400">€{formatNumber(record.prezzoUnitario, 3)}</td>;
      case "prodottoEstero":
        return (
          <td key={col.key} style={style} className="px-2 py-1.5 text-center">
            {record.prodottoEstero === null ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                N/D
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                record.prodottoEstero
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              }`}>
                {record.prodottoEstero ? 'EST' : 'ITA'}
              </span>
            )}
          </td>
        );
      case "reparto":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{record.reparto?.nome || "-"}</td>;
      case "repartoFinale":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 truncate">{record.repartoFinale?.nome || "-"}</td>;
      case "costoTaglio":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right text-gray-600 dark:text-gray-400">{formatNumber(record.costoTaglio, 3)}</td>;
      case "costoOrlatura":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right text-gray-600 dark:text-gray-400">{formatNumber(record.costoOrlatura, 3)}</td>;
      case "costoStrobel":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right text-gray-600 dark:text-gray-400">{formatNumber(record.costoStrobel, 3)}</td>;
      case "altriCosti":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right text-gray-600 dark:text-gray-400">{formatNumber(record.altriCosti, 3)}</td>;
      case "costoMontaggio":
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-right text-gray-600 dark:text-gray-400">{formatNumber(record.costoMontaggio, 3)}</td>;
      default:
        return <td key={col.key} style={style} className="px-2 py-1.5 text-xs text-gray-500">-</td>;
    }
  };

  // Reset filtri
  const resetFilters = () => {
    setFilters({
      search: "",
      tipoDocumento: "",
      linea: "",
      mese: "",
      prodottoEstero: "all",
      repartoId: "",
    });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-4">
      <PageHeader
        title="Analisi Record"
        subtitle={`${totalCount.toLocaleString()} record totali`}
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Analitiche", href: "/analitiche" },
          { label: "Record" },
        ]}
      />

      {/* Barra Filtri */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/60"
      >
        <div className="flex flex-wrap gap-3 items-end">
          {/* Mese */}
          <div className="w-44">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Mese</label>
            <select
              value={filters.mese}
              onChange={(e) => setFilters({ ...filters, mese: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Tutti i mesi</option>
              {distinctFilters?.mesi.map((m) => (
                <option key={m.value} value={m.value}>{formatMonth(m.value)} ({m.count})</option>
              ))}
            </select>
          </div>

          {/* Tipo Documento */}
          <div className="w-40">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tipo Doc</label>
            <select
              value={filters.tipoDocumento}
              onChange={(e) => setFilters({ ...filters, tipoDocumento: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Tutti</option>
              {distinctFilters?.tipiDocumento.map((t) => (
                <option key={t.value} value={t.value}>{t.value} ({t.count})</option>
              ))}
            </select>
          </div>

          {/* Linea */}
          <div className="w-44">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Linea</label>
            <select
              value={filters.linea}
              onChange={(e) => setFilters({ ...filters, linea: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Tutte</option>
              {distinctFilters?.linee.map((l) => (
                <option key={l.value} value={l.value}>{l.value} ({l.count})</option>
              ))}
            </select>
          </div>

          {/* Origine */}
          <div className="w-28">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Origine</label>
            <select
              value={filters.prodottoEstero}
              onChange={(e) => setFilters({ ...filters, prodottoEstero: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tutti</option>
              <option value="null">Non definito</option>
              <option value="false">Italia</option>
              <option value="true">Estero</option>
            </select>
          </div>

          {/* Reparto */}
          <div className="w-36">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Reparto</label>
            <select
              value={filters.repartoId}
              onChange={(e) => setFilters({ ...filters, repartoId: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Tutti</option>
              {reparti.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>

          {/* Ricerca */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cerca</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && loadRecords()}
              placeholder="Articolo, descrizione..."
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Raggruppa */}
          <div className="w-32">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Raggruppa</label>
            <select
              value={groupBy}
              onChange={(e) => { setGroupBy(e.target.value as GroupByField); setExpandedGroups(new Set()); }}
              className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            >
              <option value="none">Nessuno</option>
              <option value="articolo">Articolo</option>
              <option value="linea">Linea</option>
              <option value="tipoDocumento">Tipo Doc</option>
              <option value="reparto">Reparto</option>
            </select>
          </div>

          {/* Pulsanti */}
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              title="Reset filtri"
            >
              <i className="fas fa-times"></i>
            </button>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={`h-8 px-3 rounded-lg border text-sm ${showColumnSelector ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Seleziona colonne"
            >
              <i className="fas fa-columns"></i>
            </button>
          </div>
        </div>

        {/* Selettore Colonne */}
        {showColumnSelector && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                    visibleColumns.has(col.key)
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="sr-only"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Barra Azioni */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 ? (
            <>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedIds.size} selezionati
              </span>
              <button
                onClick={openBulkEditModal}
                className="h-8 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-md transition-shadow"
              >
                <i className="fas fa-edit mr-1.5"></i>Modifica
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                Deseleziona
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? "Caricamento..." : `${records.length} record caricati`}
            </span>
          )}
        </div>
      </motion.div>

      {/* Tabella */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/60 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 rounded-full border-3 border-emerald-500 border-t-transparent"
            />
          </div>
        ) : groupBy !== "none" && groupedRecords ? (
          /* Vista Raggruppata */
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(groupedRecords).map(([groupName, groupRecords]) => {
              const isExpanded = expandedGroups.has(groupName);
              const totals = calculateGroupTotals(groupRecords);
              const allSelected = groupRecords.every(r => selectedIds.has(r.id));

              return (
                <div key={groupName}>
                  <div
                    className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => toggleGroup(groupName)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => { e.stopPropagation(); selectGroup(groupRecords); }}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                      />
                      <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-gray-400 text-xs w-3`}></i>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{groupName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-medium">
                        {totals.count}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        Qtà: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatNumber(totals.quantita, 0)}</span>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Valore: <span className="font-semibold text-emerald-600 dark:text-emerald-400">€{formatNumber(totals.valore)}</span>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Costi: <span className="font-semibold text-orange-600 dark:text-orange-400">€{formatNumber(totals.costoTotale)}</span>
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {groupRecords.map((record) => (
                            <tr
                              key={record.id}
                              className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selectedIds.has(record.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                            >
                              <td className="px-2 py-1.5 w-10">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(record.id)}
                                  onChange={() => toggleSelect(record.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                                />
                              </td>
                              {visibleColumnsList.map(col => renderCell(record, col))}
                              <td className="px-2 py-1.5 w-24 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => openEditSingleModal(record)}
                                    className="px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                                    title="Modifica"
                                  >
                                    <i className="fas fa-edit text-sm"></i>
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(record)}
                                    className="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                                    title="Elimina"
                                  >
                                    <i className="fas fa-trash text-sm"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Tabella Normale */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-2 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                  </th>
                  {visibleColumnsList.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`px-2 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-24 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selectedIds.has(record.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                  >
                    <td className="px-2 py-1.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelect(record.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                      />
                    </td>
                    {visibleColumnsList.map(col => renderCell(record, col))}
                    <td className="px-2 py-1.5 w-24 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditSingleModal(record)}
                          className="px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                          title="Modifica"
                        >
                          <i className="fas fa-edit text-sm"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(record)}
                          className="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                          title="Elimina"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <i className="fas fa-database text-4xl mb-3 text-gray-300 dark:text-gray-600"></i>
            <p className="text-sm">Nessun record trovato</p>
            <button onClick={resetFilters} className="mt-2 text-emerald-500 hover:underline text-sm">
              Reset filtri
            </button>
          </div>
        )}
      </motion.div>

      {/* Modal Edit Singolo */}
      {showSingleEditModal && editingRecord && (
        <EditModal
          title={`Modifica: ${editingRecord.articolo || "Record"}`}
          subtitle={editingRecord.descrizioneArt}
          record={editingRecord}
          editData={editData}
          setEditData={setEditData}
          reparti={reparti}
          loading={loading}
          onSave={saveSingleEdit}
          onClose={() => { setShowSingleEditModal(false); setEditingRecord(null); }}
          isBulk={false}
          formatNumber={formatNumber}
          formatDate={formatDate}
        />
      )}

      {/* Modal Edit Massivo */}
      {showBulkEditModal && (
        <EditModal
          title={`Modifica ${selectedIds.size} record`}
          subtitle="I campi vuoti non verranno modificati"
          editData={editData}
          setEditData={setEditData}
          reparti={reparti}
          loading={loading}
          onSave={applyBulkEdit}
          onClose={() => setShowBulkEditModal(false)}
          isBulk={true}
          formatNumber={formatNumber}
          formatDate={formatDate}
        />
      )}

      {/* Modal Conferma Eliminazione */}
      {showDeleteModal && recordToDelete && (
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
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conferma Eliminazione</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Questa azione è irreversibile</p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Sei sicuro di voler eliminare questo record?
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Articolo:</span>{" "}
                  <span className="font-mono text-gray-900 dark:text-white">{recordToDelete.articolo || "-"}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Documento:</span>{" "}
                  <span className="text-gray-900 dark:text-white">{recordToDelete.tipoDocumento || ""} {recordToDelete.numeroDocumento || ""}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRecordToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={deleting}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {deleting ? (
                  <span><i className="fas fa-spinner fa-spin mr-2"></i>Eliminazione...</span>
                ) : (
                  <span><i className="fas fa-trash mr-2"></i>Elimina</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Componente Modal Edit
function EditModal({
  title,
  subtitle,
  record,
  editData,
  setEditData,
  reparti,
  loading,
  onSave,
  onClose,
  isBulk,
  formatNumber,
  formatDate,
}: {
  title: string;
  subtitle?: string | null;
  record?: AnaliticaRecord;
  editData: {
    prodottoEstero: string;
    repartoId: string;
    repartoFinaleId: string;
    costoTaglio: string;
    costoOrlatura: string;
    costoStrobel: string;
    altriCosti: string;
    costoMontaggio: string;
  };
  setEditData: (data: typeof editData) => void;
  reparti: Reparto[];
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
  isBulk: boolean;
  formatNumber: (val: string | number | null | undefined, dec?: number) => string;
  formatDate: (d: string | null) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="p-4 space-y-4">
          {/* Info record (solo per edit singolo) */}
          {record && !isBulk && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Data:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">{formatDate(record.dataDocumento)}</span>
              </div>
              <div>
                <span className="text-gray-500">Qtà:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">{formatNumber(record.quantita, 0)}</span>
              </div>
              <div>
                <span className="text-gray-500">Prezzo:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">€{formatNumber(record.prezzoUnitario, 3)}</span>
              </div>
            </div>
          )}

          {/* Origine */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Origine</label>
            <select
              value={editData.prodottoEstero}
              onChange={(e) => setEditData({ ...editData, prodottoEstero: e.target.value })}
              className="w-full h-9 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {isBulk && <option value="">-- Non modificare --</option>}
              {!isBulk && <option value="">Non definito</option>}
              {isBulk && <option value="null">Imposta non definito</option>}
              <option value="false">Italia</option>
              <option value="true">Estero</option>
            </select>
          </div>

          {/* Reparti */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Reparto</label>
              <select
                value={editData.repartoId}
                onChange={(e) => setEditData({ ...editData, repartoId: e.target.value })}
                className="w-full h-9 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {isBulk && <option value="">-- Non modificare --</option>}
                {!isBulk && <option value="">Nessuno</option>}
                {isBulk && <option value="null">Rimuovi</option>}
                {reparti.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Reparto Finale</label>
              <select
                value={editData.repartoFinaleId}
                onChange={(e) => setEditData({ ...editData, repartoFinaleId: e.target.value })}
                className="w-full h-9 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {isBulk && <option value="">-- Non modificare --</option>}
                {!isBulk && <option value="">Nessuno</option>}
                {isBulk && <option value="null">Rimuovi</option>}
                {reparti.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Costi */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Costi di Lavorazione (€)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Taglio</label>
                <input
                  type="number"
                  step="0.001"
                  value={editData.costoTaglio}
                  onChange={(e) => setEditData({ ...editData, costoTaglio: e.target.value })}
                  placeholder={isBulk ? "Non modificare" : "0.000"}
                  className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Orlatura</label>
                <input
                  type="number"
                  step="0.001"
                  value={editData.costoOrlatura}
                  onChange={(e) => setEditData({ ...editData, costoOrlatura: e.target.value })}
                  placeholder={isBulk ? "Non modificare" : "0.000"}
                  className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Strobel</label>
                <input
                  type="number"
                  step="0.001"
                  value={editData.costoStrobel}
                  onChange={(e) => setEditData({ ...editData, costoStrobel: e.target.value })}
                  placeholder={isBulk ? "Non modificare" : "0.000"}
                  className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Altri</label>
                <input
                  type="number"
                  step="0.001"
                  value={editData.altriCosti}
                  onChange={(e) => setEditData({ ...editData, altriCosti: e.target.value })}
                  placeholder={isBulk ? "Non modificare" : "0.000"}
                  className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[10px] text-gray-500 mb-0.5">Montaggio</label>
              <input
                type="number"
                step="0.001"
                value={editData.costoMontaggio}
                onChange={(e) => setEditData({ ...editData, costoMontaggio: e.target.value })}
                placeholder={isBulk ? "Non modificare" : "0.000"}
                className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          >
            Annulla
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="h-9 px-5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium shadow hover:shadow-md disabled:opacity-50"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Salva"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
