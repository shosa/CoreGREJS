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

  /**
   * Helper function to get photo URL from fotoPath
   * Handles both legacy local paths and new MinIO object names
   */
  const getPhotoUrl = (fotoPath: string, cartellinoId?: string): string => {
    // If it's already a full URL, return as-is
    if (fotoPath.startsWith('http')) {
      return fotoPath;
    }

    // If it starts with /api/quality/photo/, it's already a proxy URL
    if (fotoPath.startsWith('/api/quality/photo/')) {
      return fotoPath;
    }

    // If it starts with /storage/, it's a legacy local path - serve via static assets
    if (fotoPath.startsWith('/storage/')) {
      return fotoPath;
    }

    // If it starts with "quality/", it's already a MinIO object name
    if (fotoPath.startsWith('quality/')) {
      return `/api/quality/photo/${encodeURIComponent(fotoPath)}`;
    }

    // If it's just a filename (e.g., "eccezione_92064_xxx.png"), reconstruct the object name
    // Extract cartellino ID from filename pattern: eccezione_{cartellinoId}_{timestamp}.{ext}
    if (fotoPath.match(/^eccezione_\d+_\d+\./)) {
      const parts = fotoPath.split('_');
      const extractedCartellinoId = parts[1]; // eccezione_{THIS}_timestamp.ext
      const objectName = `quality/cq_uploads/${extractedCartellinoId}/${fotoPath}`;
      return `/api/quality/photo/${encodeURIComponent(objectName)}`;
    }

    // Fallback: if we have cartellinoId parameter, use it to reconstruct
    if (cartellinoId) {
      const objectName = `quality/cq_uploads/${cartellinoId}/${fotoPath}`;
      return `/api/quality/photo/${encodeURIComponent(objectName)}`;
    }

    // Last resort: assume it's a MinIO object name and try as-is
    return `/api/quality/photo/${encodeURIComponent(fotoPath)}`;
  };

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
    } catch (error) {
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

  const handleSearch = () => {
    fetchRecords();
  };

  const handleReset = () => {
    setFilters({
      dataInizio: "",
      dataFine: "",
      reparto: "",
      operatore: "",
      tipoCq: "",
    });
    setTimeout(() => fetchRecords(), 100);
  };

  const handleViewDetails = async (record: QualityRecord) => {
    try {
      setDetailsLoading(true);
      setSelectedRecord(record);

      // Carica i dettagli completi del record se necessario
      const fullDetails = await qualityApi.getRecordById(record.id);
      setSelectedRecord(fullDetails);
    } catch (error) {
      showError("Errore nel caricamento dei dettagli");
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedRecord(null);
  };

  // Pagination
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Filtri di Ricerca
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Inizio
            </label>
            <input
              type="date"
              value={filters.dataInizio}
              onChange={(e) => handleFilterChange("dataInizio", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Fine
            </label>
            <input
              type="date"
              value={filters.dataFine}
              onChange={(e) => handleFilterChange("dataFine", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reparto
            </label>
            <select
              value={filters.reparto}
              onChange={(e) => handleFilterChange("reparto", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Operatore
            </label>
            <select
              value={filters.operatore}
              onChange={(e) => handleFilterChange("operatore", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti</option>
              {operators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo CQ
            </label>
            <select
              value={filters.tipoCq}
              onChange={(e) => handleFilterChange("tipoCq", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tutti</option>
              <option value="INTERNO">INTERNO</option>
              <option value="GRIFFE">GRIFFE</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSearch}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Cerca
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Record Trovati: {records.length}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cartellino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Articolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Reparto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Operatore
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Paia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Eccezioni
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nessun record trovato
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {record.numeroCartellino}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(record.dataControllo).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate">{record.articolo}</div>
                      <div className="text-xs text-gray-500">{record.codArticolo}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {record.reparto || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {record.operatore}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          record.tipoCq === "GRIFFE"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {record.tipoCq}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {record.paiaTotali}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          record.haEccezioni
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {record.haEccezioni ? "Sì" : "OK"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                        title="Visualizza dettagli"
                      >
                        <i className="fas fa-eye text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={records.length}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

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
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Cartellino:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.numeroCartellino}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Data Controllo:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {new Date(selectedRecord.dataControllo).toLocaleString("it-IT")}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Operatore:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.operatore}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Reparto:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.reparto || "-"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Tipo CQ:
                  </span>
                  <p className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        selectedRecord.tipoCq === "GRIFFE"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {selectedRecord.tipoCq}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Paia Totali:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.paiaTotali}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Articolo:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.articolo}
                  </p>
                  <p className="text-xs text-gray-500">{selectedRecord.codArticolo}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Linea:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.linea}
                  </p>
                </div>
              </div>
              {selectedRecord.note && (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Note:
                  </span>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {selectedRecord.note}
                  </p>
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
                            <span className="font-medium">Tipo Difetto:</span>{" "}
                            {exc.tipoDifetto}
                          </div>
                          {exc.noteOperatore && (
                            <div className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              <i className="fas fa-comment mr-1.5"></i>
                              {exc.noteOperatore}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Foto Eccezione */}
                      {exc.fotoPath && (
                        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <i className="fas fa-image mr-1.5"></i>
                            Foto Difetto:
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
    </div>
  );
}
