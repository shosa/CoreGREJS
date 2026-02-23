"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { trackingApi } from "@/lib/api";
import { showSuccess, showError } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ArchiveRecord {
  id: number;
  cartel: number;
  typeId: number;
  typeName: string;
  lot: string;
  note?: string | null;
  timestamp: string;
  archivedAt: string;
  // campi denormalizzati da CoreData
  commessa?: string | null;
  articolo?: string | null;
  descrizione?: string | null;
  ragioneSoc?: string | null;
  ordine?: number | null;
  // da TrackLotInfo
  lotDoc?: string | null;
  lotDate?: string | null;
  // da TrackOrderInfo
  orderDate?: string | null;
  // da TrackSku
  sku?: string | null;
}

interface ArchivePage {
  data: ArchiveRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TrackingArchivePage() {
  // Form compattamento
  const [compactDa, setCompactDa] = useState("");
  const [compactA, setCompactA] = useState("");
  const [compacting, setCompacting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form mastrino PDF
  const [pdfDa, setPdfDa] = useState("");
  const [pdfA, setPdfA] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // Archivio tabella
  const [archive, setArchive] = useState<ArchivePage | null>(null);
  const [archivePage, setArchivePage] = useState(1);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    loadArchive();
  }, [archivePage]);

  const loadArchive = async () => {
    try {
      setArchiveLoading(true);
      const data = await trackingApi.getArchive(archivePage, 50, archiveSearch || undefined);
      setArchive(data);
    } catch {
      showError("Errore nel caricamento dell'archivio");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleSearch = () => {
    setArchivePage(1);
    loadArchive();
  };

  const handleCompact = async () => {
    if (!compactDa || !compactA) {
      showError("Seleziona entrambe le date");
      return;
    }
    if (compactDa > compactA) {
      showError("La data iniziale deve essere precedente alla data finale");
      return;
    }
    setShowConfirm(true);
  };

  const confirmCompact = async () => {
    setShowConfirm(false);
    try {
      setCompacting(true);
      const result = await trackingApi.compact(compactDa, compactA);
      const o = result.orphanStats;
      const orphanMsg = o
        ? ` — Orfani rimossi: ${o.deletedLots} lotti, ${o.deletedOrders} ordini, ${o.deletedSku} SKU, ${o.deletedTypes} tipi`
        : '';
      showSuccess(`Compattamento completato: ${result.archivedCount} collegamenti archiviati${orphanMsg}`);
      setCompactDa("");
      setCompactA("");
      setArchivePage(1);
      loadArchive();
    } catch {
      showError("Errore durante il compattamento");
    } finally {
      setCompacting(false);
    }
  };

  const handlePdfReport = async () => {
    if (!pdfDa || !pdfA) {
      showError("Seleziona entrambe le date per il mastrino");
      return;
    }
    if (pdfDa > pdfA) {
      showError("La data iniziale deve essere precedente alla data finale");
      return;
    }
    try {
      setPdfLoading(true);
      await trackingApi.compactReportPdf(pdfDa, pdfA);
      showSuccess("Mastrino PDF in coda — controlla i file generati nella sezione job");
    } catch {
      showError("Errore nell'invio del job PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Archivio & Compattamento"
        subtitle="Storicizzazione dati tracking e generazione mastrino PDF"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Tracking", href: "/tracking" },
          { label: "Archivio" },
        ]}
      />

      {/* Top 2 card affiancate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Card Compattamento */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-amber-200 bg-white shadow-lg dark:border-amber-800 dark:bg-gray-800/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 shadow-md">
                  <i className="fas fa-compress-alt text-white"></i>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Compatta Dati</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sposta i collegamenti di un periodo nell'archivio storico</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Data Da
                  </label>
                  <input
                    type="date"
                    value={compactDa}
                    onChange={e => setCompactDa(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Data A
                  </label>
                  <input
                    type="date"
                    value={compactA}
                    onChange={e => setCompactA(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
                <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-sm flex-shrink-0"></i>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  I collegamenti del periodo verranno spostati nell'archivio e rimossi dalla tabella attiva. L'operazione non è reversibile.
                </p>
              </div>
              <button
                onClick={handleCompact}
                disabled={compacting || !compactDa || !compactA}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {compacting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Compattamento in corso...</>
                ) : (
                  <><i className="fas fa-compress-alt"></i> Compatta Periodo</>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Card Mastrino PDF */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-pink-200 bg-white shadow-lg dark:border-pink-800 dark:bg-gray-800/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-pink-100 dark:border-pink-800/60 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 shadow-md">
                  <i className="fas fa-file-alt text-white"></i>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Mastrino PDF</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Genera il mastrino ASCII storicizzato per un periodo</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Data Da
                  </label>
                  <input
                    type="date"
                    value={pdfDa}
                    onChange={e => setPdfDa(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Data A
                  </label>
                  <input
                    type="date"
                    value={pdfA}
                    onChange={e => setPdfA(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 mb-4">
                <i className="fas fa-terminal text-pink-600 dark:text-pink-400 text-sm flex-shrink-0"></i>
                <p className="text-xs text-pink-700 dark:text-pink-300">
                  Il PDF viene generato in background via job queue. Il report usa font monospace stile terminale ASCII.
                </p>
              </div>
              <button
                onClick={handlePdfReport}
                disabled={pdfLoading || !pdfDa || !pdfA}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pdfLoading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Invio in coda...</>
                ) : (
                  <><i className="fas fa-file-pdf"></i> Genera Mastrino PDF</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabella archivio */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Archivio Storico</h2>
            {archive && (
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300">
                {archive.total.toLocaleString()} record
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cerca lotto o cartellino..."
              value={archiveSearch}
              onChange={e => setArchiveSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors"
            >
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>

        {archiveLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
          </div>
        ) : !archive || archive.data.length === 0 ? (
          <div className="py-16 text-center">
            <i className="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-3 block"></i>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nessun record in archivio</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Usa il form "Compatta Dati" per spostare i collegamenti storici qui
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cartel</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Commessa</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Articolo</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tipo Materiale</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Lotto</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">DDT</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Data Orig.</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Archiviato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {archive.data.map((rec, i) => (
                    <tr
                      key={rec.id}
                      className={`hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-700/20"}`}
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{rec.cartel}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {rec.commessa || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 max-w-[130px] truncate" title={rec.ragioneSoc || ""}>
                        {rec.ragioneSoc || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{rec.articolo || "—"}</div>
                        {rec.descrizione && <div className="text-[11px] text-gray-400 truncate max-w-[140px]" title={rec.descrizione}>{rec.descrizione}</div>}
                        {rec.sku && <div className="text-[10px] text-indigo-500 font-mono">SKU: {rec.sku}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-medium">
                          {rec.typeName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{rec.lot}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                        {rec.lotDoc ? (
                          <div>
                            <div className="font-medium">{rec.lotDoc}</div>
                            {rec.lotDate && <div className="text-gray-400">{formatDate(rec.lotDate)}</div>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(rec.timestamp)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                        {formatDateTime(rec.archivedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {archive.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pagina {archive.page} di {archive.totalPages} · {archive.total.toLocaleString()} record totali
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setArchivePage(p => Math.max(1, p - 1))}
                    disabled={archive.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fas fa-chevron-left mr-1"></i> Prev
                  </button>
                  <button
                    onClick={() => setArchivePage(p => Math.min(archive.totalPages, p + 1))}
                    disabled={archive.page >= archive.totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <i className="fas fa-chevron-right ml-1"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Dialog conferma compattamento */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conferma Compattamento</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Periodo: {compactDa} → {compactA}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Tutti i collegamenti nel periodo selezionato verranno spostati nell'archivio storico e rimossi dalla tabella attiva.
              <strong className="block mt-2 text-amber-600 dark:text-amber-400">Questa operazione non è reversibile.</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmCompact}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <i className="fas fa-compress-alt mr-2"></i>Conferma
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
