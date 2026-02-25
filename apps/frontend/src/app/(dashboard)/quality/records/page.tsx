"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Offcanvas from "@/components/ui/Offcanvas";
import Pagination from "@/components/ui/Pagination";
import { qualityApi } from "@/lib/api";
import { showError } from "@/store/notifications";
import Image from "next/image";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

type QualityException = {
  id: number;
  taglia: string;
  tipoDifetto: string;
  noteOperatore: string | null;
  fotoPath: string | null;
};

type QualityRecord = {
  id: number;
  numeroCartellino: string;
  reparto: string | null;
  dataControllo: string;
  operatore: string;
  tipoCq: string;
  paiaTotali: number;
  codArticolo: string;
  articolo: string;
  linea: string;
  note: string | null;
  haEccezioni: boolean;
  exceptions?: QualityException[];
};

/**
 * Helper function to get photo URL from fotoPath
 * Handles both legacy local paths and new MinIO object names
 */
const getPhotoUrl = (fotoPath: string, cartellinoId?: string): string => {
  if (fotoPath.startsWith("http")) return fotoPath;
  if (fotoPath.startsWith("/api/quality/photo/")) return fotoPath;
  if (fotoPath.startsWith("/storage/")) return fotoPath;
  if (fotoPath.startsWith("quality/"))
    return `/api/quality/photo-stream/${encodeURIComponent(fotoPath)}`;
  if (fotoPath.match(/^eccezione_\d+_\d+\./)) {
    const parts = fotoPath.split("_");
    const extractedCartellinoId = parts[1];
    const objectName = `quality/cq_uploads/${extractedCartellinoId}/${fotoPath}`;
    return `/api/quality/photo-stream/${encodeURIComponent(objectName)}`;
  }
  if (cartellinoId) {
    const objectName = `quality/cq_uploads/${cartellinoId}/${fotoPath}`;
    return `/api/quality/photo-stream/${encodeURIComponent(objectName)}`;
  }
  return `/api/quality/photo-stream/${encodeURIComponent(fotoPath)}`;
};

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<QualityRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filters, setFilters] = useState({
    dataInizio: "",
    dataFine: "",
    reparto: "",
    operatore: "",
    tipoCq: "",
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchRecords();
    fetchFilterOptions();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== "")
      );
      const data = await qualityApi.getRecords(cleanFilters);
      setRecords(data);
    } catch {
      showError("Errore nel caricamento dei record");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [depts, ops] = await Promise.all([
        qualityApi.getDepartments(true),
        qualityApi.getUniqueOperators(),
      ]);
      setDepartments(depts.map((d: any) => d.nomeReparto));
      setOperators(ops);
    } catch (error) {
      console.error("Errore nel caricamento delle opzioni filtro", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => fetchRecords();

  const handleReset = () => {
    setFilters({ dataInizio: "", dataFine: "", reparto: "", operatore: "", tipoCq: "" });
    setTimeout(() => fetchRecords(), 100);
  };

  const handleViewDetails = async (record: QualityRecord) => {
    try {
      setDetailsLoading(true);
      setSelectedRecord(record);
      const fullDetails = await qualityApi.getRecordById(record.id);
      setSelectedRecord(fullDetails);
    } catch {
      showError("Errore nel caricamento dei dettagli");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => setSelectedRecord(null);

  // Pagination
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const recordsConEccezioni = records.filter((r) => r.haEccezioni).length;

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="shrink-0">
          <PageHeader
            title="Consulto Record CQ"
            description="Visualizza e filtra i controlli qualità effettuati"
          />
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/", icon: "fa-home" },
              { label: "Controllo Qualità", href: "/quality" },
              { label: "Consulto Record" },
            ]}
          />
        </motion.div>

        {/* Body */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
        >
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-60 shrink-0 flex-col gap-3 overflow-y-auto">
            {/* Stats */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Statistiche
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{records.length}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Record</p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{recordsConEccezioni}</p>
                  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Eccezioni</p>
                </div>
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center col-span-2">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {records.length > 0 ? (((records.length - recordsConEccezioni) / records.length) * 100).toFixed(1) : '0'}%
                  </p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-0.5">Tasso OK</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Filtri
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <i className="fas fa-times mr-1"></i>Reset
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={filters.dataInizio}
                  onChange={(e) => handleFilterChange("dataInizio", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Fine</label>
                <input
                  type="date"
                  value={filters.dataFine}
                  onChange={(e) => handleFilterChange("dataFine", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reparto</label>
                <select
                  value={filters.reparto}
                  onChange={(e) => handleFilterChange("reparto", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Tutti</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Operatore</label>
                <select
                  value={filters.operatore}
                  onChange={(e) => handleFilterChange("operatore", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Tutti</option>
                  {operators.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo CQ</label>
                <select
                  value={filters.tipoCq}
                  onChange={(e) => handleFilterChange("tipoCq", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Tutti</option>
                  <option value="INTERNO">INTERNO</option>
                  <option value="GRIFFE">GRIFFE</option>
                </select>
              </div>

              <button
                onClick={handleSearch}
                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-2 text-xs font-medium text-white hover:shadow-md transition-all"
              >
                <i className="fas fa-search mr-1.5"></i>Cerca
              </button>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
            {/* Toolbar */}
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <i className="fas fa-clipboard-check text-blue-500 text-sm"></i>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Record Trovati
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <motion.i
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="fas fa-spinner"
                    />
                    Caricamento…
                  </span>
                ) : (
                  <><span className="font-semibold text-gray-700 dark:text-gray-200">{records.length}</span> record</>
                )}
              </span>
              <div className="ml-auto">
                <button
                  onClick={fetchRecords}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Aggiorna"
                >
                  <i className="fas fa-sync-alt text-xs"></i>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cartellino</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Articolo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reparto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operatore</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paia</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Eccezioni</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                          <i className="fas fa-inbox text-4xl mb-3 opacity-40"></i>
                          <p className="font-medium text-sm">Nessun record trovato</p>
                          <p className="text-xs mt-1">Prova a modificare i filtri</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {record.numeroCartellino}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(record.dataControllo).toLocaleDateString("it-IT")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[160px] truncate">{record.articolo}</div>
                          <div className="text-xs text-gray-400">{record.codArticolo}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.reparto || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {record.operatore}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            record.tipoCq === "GRIFFE"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}>
                            {record.tipoCq}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                          {record.paiaTotali}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            record.haEccezioni
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          }`}>
                            {record.haEccezioni ? "Sì" : "OK"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewDetails(record)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors ml-auto"
                            title="Visualizza dettagli"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={records.length}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Offcanvas Dettagli */}
      <Offcanvas
        open={!!selectedRecord}
        onClose={handleCloseDetails}
        title="Dettagli Controllo Qualità"
        icon="fa-file-alt"
        iconColor="text-blue-500"
        width="xl"
        loading={detailsLoading}
      >
        {selectedRecord && (
          <div className="space-y-6 px-4">
            {/* Informazioni Generali */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-info-circle text-blue-500"></i>
                Informazioni Generali
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Cartellino:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.numeroCartellino}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Data Controllo:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {new Date(selectedRecord.dataControllo).toLocaleString("it-IT")}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Operatore:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.operatore}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Reparto:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.reparto || "-"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Tipo CQ:</span>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      selectedRecord.tipoCq === "GRIFFE"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {selectedRecord.tipoCq}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Paia Totali:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.paiaTotali}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Articolo:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.articolo}</p>
                  <p className="text-xs text-gray-500">{selectedRecord.codArticolo}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Linea:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.linea}</p>
                </div>
              </div>
              {selectedRecord.note && (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Note:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedRecord.note}</p>
                </div>
              )}
            </div>

            {/* Eccezioni */}
            {selectedRecord.haEccezioni && selectedRecord.exceptions && selectedRecord.exceptions.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-900 dark:text-red-400">
                  <i className="fas fa-exclamation-triangle"></i>
                  Eccezioni ({selectedRecord.exceptions.length})
                </h4>
                <div className="space-y-3">
                  {selectedRecord.exceptions.map((exc, index) => (
                    <div
                      key={exc.id}
                      className="rounded-lg border border-red-300 bg-white p-4 dark:border-red-700 dark:bg-gray-800"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              #{index + 1}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Taglia: {exc.taglia}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Tipo Difetto:</span> {exc.tipoDifetto}
                          </div>
                          {exc.noteOperatore && (
                            <div className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              <i className="fas fa-comment mr-1.5"></i>
                              {exc.noteOperatore}
                            </div>
                          )}
                        </div>
                      </div>

                      {exc.fotoPath && (
                        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <i className="fas fa-image mr-1.5"></i>Foto Difetto:
                          </div>
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                            <Image
                              src={getPhotoUrl(exc.fotoPath, selectedRecord?.numeroCartellino)}
                              alt={`Difetto ${exc.tipoDifetto}`}
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 100vw, 600px"
                              unoptimized
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nessuna Eccezione */}
            {!selectedRecord.haEccezioni && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center gap-3 text-green-800 dark:text-green-400">
                  <i className="fas fa-check-circle text-2xl"></i>
                  <div>
                    <p className="font-semibold">Nessuna Eccezione</p>
                    <p className="text-sm">Il controllo è stato superato senza problemi</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Offcanvas>
    </>
  );
}
