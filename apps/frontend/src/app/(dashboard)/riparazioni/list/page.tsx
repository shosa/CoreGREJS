"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import StatusBadge from "@/components/riparazioni/StatusBadge";
import { riparazioniApi } from "@/lib/api";

type RiparazioneRow = {
  id: number;
  idRiparazione: string;
  cartellino?: string;
  completa: boolean;
  laboratorio?: { nome?: string };
  reparto?: { nome?: string };
  createdAt?: string;
};

export default function RiparazioniListPage() {
  const [rows, setRows] = useState<RiparazioneRow[]>([]);
  const [pagination, setPagination] = useState<{ page?: number; totalPages?: number }>({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    search: string;
    completa?: boolean;
    laboratorioId?: number;
    repartoId?: number;
  }>({
    search: "",
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, pagination } = await riparazioniApi.getRiparazioni({
        page: 1,
        limit: 50,
        ...filters,
      });
      setRows(data || []);
      setPagination(pagination || {});
    } catch (error) {
      console.error("Errore caricamento riparazioni", error);
    } finally {
      setLoading(false);
    }
  };

  const columnHelper = createColumnHelper<RiparazioneRow>();
  const columns = useMemo<ColumnDef<RiparazioneRow, any>[]>(
    () => [
      columnHelper.accessor("idRiparazione", {
        header: "ID",
        cell: ({ row }) => (
          <a
            href={`/riparazioni/${row.original.id}`}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            #{row.original.idRiparazione}
          </a>
        ),
      }),
      columnHelper.accessor("cartellino", {
        header: "Cartellino",
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("laboratorio", {
        header: "Laboratorio",
        cell: ({ row }) => row.original.laboratorio?.nome || "-",
      }),
      columnHelper.accessor("reparto", {
        header: "Reparto",
        cell: ({ row }) => row.original.reparto?.nome || "-",
      }),
      columnHelper.accessor("createdAt", {
        header: "Data",
        cell: ({ getValue }) =>
          getValue()
            ? new Date(getValue() as string).toLocaleDateString("it-IT")
            : "-",
      }),
      columnHelper.accessor("completa", {
        header: "Stato",
        cell: ({ getValue }) => <StatusBadge completa={!!getValue()} />,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-10 dark:bg-gray-900">
      <PageHeader title="Archivio Riparazioni" subtitle="Elenco riparazioni esterne" />
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Riparazioni", href: "/riparazioni" },
          { label: "Archivio" },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4">
        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Cerca per cartellino o ID..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <select
            value={filters.completa === undefined ? "" : filters.completa ? "1" : "0"}
            onChange={(e) =>
              setFilters({
                ...filters,
                completa: e.target.value === "" ? undefined : e.target.value === "1",
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Tutte</option>
            <option value="0">Aperte</option>
            <option value="1">Completate</option>
          </select>
          <button
            onClick={() => loadData()}
            className="flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
          >
            <i className="fas fa-sync-alt mr-2" />
            Aggiorna
          </button>
          <button
            onClick={() =>
              setFilters({
                search: "",
                completa: undefined,
                laboratorioId: undefined,
                repartoId: undefined,
              })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Reset filtri
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={columns.length}>
                      Caricamento...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={columns.length}>
                      Nessuna riparazione trovata.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-right text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            Pagina {pagination.page || 1} di {pagination.totalPages || 1}
          </div>
        </div>
      </div>
    </div>
  );
}
