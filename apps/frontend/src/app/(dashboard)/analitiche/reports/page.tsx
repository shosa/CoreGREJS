"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { analiticheApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Reparto {
  id: number;
  nome: string;
  codice: string | null;
  attivo: boolean;
}

interface Filters {
  linee: string[];
  tipiDocumento: string[];
}

export default function AnaliticheReportsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [filters, setFilters] = useState<Filters>({ linee: [], tipiDocumento: [] });

  // Form state
  const [dataFrom, setDataFrom] = useState("");
  const [dataTo, setDataTo] = useState("");
  const [selectedReparto, setSelectedReparto] = useState<number | "">("");
  const [selectedTipoDocumento, setSelectedTipoDocumento] = useState("");
  const [selectedLinea, setSelectedLinea] = useState("");
  const [groupBy, setGroupBy] = useState<"reparto" | "linea" | "tipoDocumento" | "mese">("reparto");
  const [includeDetails, setIncludeDetails] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [repartiData, filtersData] = await Promise.all([
        analiticheApi.getReparti(true),
        analiticheApi.getFilters(),
      ]);
      setReparti(repartiData || []);
      // Map the filter data - backend returns { value, count } objects
      setFilters({
        linee: (filtersData?.linee || []).map((item: any) => item.value || item),
        tipiDocumento: (filtersData?.tipiDocumento || []).map((item: any) => item.value || item),
      });
    } catch (error) {
      showError("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setGenerating(true);
      const result = await analiticheApi.generatePdfReport({
        dataFrom: dataFrom || undefined,
        dataTo: dataTo || undefined,
        repartoId: selectedReparto !== "" ? Number(selectedReparto) : undefined,
        tipoDocumento: selectedTipoDocumento || undefined,
        linea: selectedLinea || undefined,
        groupBy,
      });
      showSuccess(`Report PDF in coda (Job ID: ${result.jobId}). Controlla lo spool per il download.`);
    } catch (error: any) {
      showError(error?.response?.data?.message || "Errore nella generazione del report PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateExcel = async () => {
    try {
      setGenerating(true);
      const result = await analiticheApi.generateExcelReport({
        dataFrom: dataFrom || undefined,
        dataTo: dataTo || undefined,
        repartoId: selectedReparto !== "" ? Number(selectedReparto) : undefined,
        tipoDocumento: selectedTipoDocumento || undefined,
        linea: selectedLinea || undefined,
        includeDetails,
      });
      showSuccess(`Report Excel in coda (Job ID: ${result.jobId}). Controlla lo spool per il download.`);
    } catch (error: any) {
      showError(error?.response?.data?.message || "Errore nella generazione del report Excel");
    } finally {
      setGenerating(false);
    }
  };

  const resetFilters = () => {
    setDataFrom("");
    setDataTo("");
    setSelectedReparto("");
    setSelectedTipoDocumento("");
    setSelectedLinea("");
    setGroupBy("reparto");
    setIncludeDetails(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-solid border-emerald-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Reportistica Analitiche"
        subtitle="Genera report PDF ed Excel dei dati analitici"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Analitiche", href: "/analitiche" },
          { label: "Reportistica" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filtri */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-filter mr-2 text-emerald-500"></i>
                Filtri Report
              </h3>
              <button
                onClick={resetFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="fas fa-undo mr-1"></i>
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Da
                </label>
                <input
                  type="date"
                  value={dataFrom}
                  onChange={(e) => setDataFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data A
                </label>
                <input
                  type="date"
                  value={dataTo}
                  onChange={(e) => setDataTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Reparto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reparto
                </label>
                <select
                  value={selectedReparto}
                  onChange={(e) => setSelectedReparto(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Tutti i reparti</option>
                  {reparti.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} {r.codice ? `(${r.codice})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo Documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo Documento
                </label>
                <select
                  value={selectedTipoDocumento}
                  onChange={(e) => setSelectedTipoDocumento(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Tutti i tipi</option>
                  {filters.tipiDocumento.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Linea
                </label>
                <select
                  value={selectedLinea}
                  onChange={(e) => setSelectedLinea(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Tutte le linee</option>
                  {filters.linee.map((linea) => (
                    <option key={linea} value={linea}>
                      {linea}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group By (solo PDF) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Raggruppa per (PDF)
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="reparto">Reparto</option>
                  <option value="linea">Linea</option>
                  <option value="tipoDocumento">Tipo Documento</option>
                  <option value="mese">Mese</option>
                </select>
              </div>
            </div>

            {/* Include Details (solo Excel) */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Includi dettaglio record (solo Excel)
                </span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Azioni Report */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              <i className="fas fa-file-export mr-2 text-blue-500"></i>
              Genera Report
            </h3>

            <div className="space-y-4">
              {/* PDF Button */}
              <button
                onClick={handleGeneratePdf}
                disabled={generating}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-file-pdf text-xl"></i>
                )}
                <span>Genera Report PDF</span>
              </button>

              {/* Excel Button */}
              <button
                onClick={handleGenerateExcel}
                disabled={generating}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-file-excel text-xl"></i>
                )}
                <span>Genera Report Excel</span>
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Come funziona</p>
                  <p>
                    I report vengono generati in background. Una volta pronti,
                    potrai scaricarli dallo <strong>Spool lavori</strong> (icona
                    stampante in alto a destra).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <motion.div
            variants={itemVariants}
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-chart-pie mr-2 text-purple-500"></i>
              Tipi di Report
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <i className="fas fa-file-pdf text-red-600 dark:text-red-400"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Report PDF
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Riepilogo costi, analisi per gruppo, grafici riassuntivi
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <i className="fas fa-file-excel text-emerald-600 dark:text-emerald-400"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Report Excel
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Dati tabellari, export dettagliato, analisi per mese/reparto
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
