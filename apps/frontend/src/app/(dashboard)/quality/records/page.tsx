"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { qualityApi } from "@/lib/api";
import { showError } from "@/store/notifications";

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
  exceptions?: Array<{
    id: number;
    taglia: string;
    tipoDifetto: string;
    noteOperatore: string | null;
  }>;
};

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    dataInizio: "",
    dataFine: "",
    reparto: "",
    operatore: "",
    tipoCq: "",
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [operators, setOperators] = useState<string[]>([]);

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

  const toggleExpand = (recordId: number) => {
    setExpandedRecord(expandedRecord === recordId ? null : recordId);
  };

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
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Controllo Qualità", href: "/quality" },
          { label: "Consulto Record" },
        ]}
      />

      <PageHeader
        title="Consulto Record CQ"
        description="Visualizza e filtra i controlli qualità effettuati"
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
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nessun record trovato
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <>
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
                        {record.haEccezioni && record.exceptions && (
                          <button
                            onClick={() => toggleExpand(record.id)}
                            className="text-primary hover:text-primary/80"
                          >
                            {expandedRecord === record.id ? "Chiudi" : "Dettagli"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRecord === record.id && record.exceptions && (
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="text-sm">
                            <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                              Eccezioni ({record.exceptions.length})
                            </h4>
                            <div className="space-y-2">
                              {record.exceptions.map((exc) => (
                                <div
                                  key={exc.id}
                                  className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        Taglia: {exc.taglia}
                                      </span>
                                      <span className="mx-2 text-gray-400">|</span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Difetto: {exc.tipoDifetto}
                                      </span>
                                    </div>
                                  </div>
                                  {exc.noteOperatore && (
                                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      Note: {exc.noteOperatore}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
