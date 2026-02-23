"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import StatusBadge from "@/components/riparazioni/StatusBadge";
import { riparazioniApi } from "@/lib/api";
import { showError } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

type Riparazione = {
  id: number;
  idRiparazione: string;
  cartellino?: string;
  completa: boolean;
  laboratorio?: { nome?: string };
  reparto?: { nome?: string };
  createdAt?: string;
  data?: string;
};

type ByLab = { laboratorioId: number; _count: number };
type ByRep = { repartoId: number; _count: number };

type Stats = {
  totale: number;
  aperte: number;
  completate: number;
  byLaboratorio: ByLab[];
  byReparto: ByRep[];
  recent: Riparazione[];
};

export default function RiparazioniPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totale: 0,
    aperte: 0,
    completate: 0,
    byLaboratorio: [],
    byReparto: [],
    recent: [],
  });
  const [laboratori, setLaboratori] = useState<{ id: number; nome: string }[]>([]);
  const [reparti, setReparti] = useState<{ id: number; nome: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [data, labs, reps] = await Promise.all([
          riparazioniApi.getStats(),
          riparazioniApi.getLaboratori(),
          riparazioniApi.getReparti(),
        ]);
        setStats({
          totale: data?.totale ?? 0,
          aperte: data?.aperte ?? 0,
          completate: data?.completate ?? 0,
          byLaboratorio: data?.byLaboratorio ?? [],
          byReparto: data?.byReparto ?? [],
          recent: data?.recent ?? [],
        });
        setLaboratori(labs ?? []);
        setReparti(reps ?? []);
      } catch {
        showError("Errore nel caricamento delle statistiche");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  // Risolvi nomi da ID
  const labNome = (id: number) => laboratori.find((l) => l.id === id)?.nome ?? `Lab #${id}`;
  const repNome = (id: number) => reparti.find((r) => r.id === id)?.nome ?? `Rep #${id}`;

  const maxLab = stats.byLaboratorio.reduce((m, r) => Math.max(m, r._count), 1);
  const maxRep = stats.byReparto.reduce((m, r) => Math.max(m, r._count), 1);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader title="Riparazioni" subtitle="Gestione riparazioni esterne" />
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Riparazioni" },
        ]}
      />

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        <motion.div variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
              <i className="fas fa-wrench text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Riparazioni Totali</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totale.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}
          className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
              <i className="fas fa-folder-open text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Aperte</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.aperte.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/20 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg">
              <i className="fas fa-check-circle text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Completate</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-300">{stats.completate.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Widget: Tasso Completamento */}
      {stats.totale > 0 && (() => {
        const completatePct = Math.round((stats.completate / stats.totale) * 100);
        const apertePct = Math.round((stats.aperte / stats.totale) * 100);
        const altrePct = 100 - completatePct - apertePct;
        return (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-6 shadow-xl text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Tasso completamento - grande */}
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Performance</p>
                  <h3 className="text-2xl font-extrabold mb-4">Tasso di Completamento</h3>
                  <div className="flex items-end gap-4 mb-4">
                    <span className="text-5xl font-black">{completatePct}%</span>
                    <span className="text-white/60 text-sm mb-2">completate su {stats.totale.toLocaleString()} totali</span>
                  </div>
                  {/* Barra composita */}
                  <div className="w-full bg-white/20 rounded-full h-4 flex overflow-hidden">
                    <div className="bg-white h-4 transition-all duration-700" style={{ width: `${completatePct}%` }} title={`Completate: ${completatePct}%`} />
                    <div className="bg-white/40 h-4 transition-all duration-700" style={{ width: `${apertePct}%` }} title={`Aperte: ${apertePct}%`} />
                    {altrePct > 0 && <div className="bg-white/10 h-4 transition-all duration-700" style={{ width: `${altrePct}%` }} />}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white inline-block"></span>Completate</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/40 inline-block"></span>Aperte</span>
                  </div>
                </div>
                {/* Breakdown numerico */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black">{stats.completate.toLocaleString()}</p>
                    <p className="text-white/60 text-xs mt-1 uppercase tracking-wide">Completate</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black">{stats.aperte.toLocaleString()}</p>
                    <p className="text-white/60 text-xs mt-1 uppercase tracking-wide">Aperte</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 text-center col-span-2">
                    <p className="text-3xl font-black">{stats.totale.toLocaleString()}</p>
                    <p className="text-white/60 text-xs mt-1 uppercase tracking-wide">Totale Riparazioni</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── COLONNA SINISTRA (2/3) ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Azioni rapide */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <motion.div variants={itemVariants}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-60 dark:from-blue-900/10 dark:to-indigo-800/10" />
                <div className="relative p-8">
                  <Link href="/riparazioni/create" className="mb-4 block">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <i className="fas fa-plus-circle text-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nuova Riparazione</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Crea una nuova riparazione e compila la griglia taglie.</p>
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-60 dark:from-emerald-900/10 dark:to-green-800/10" />
                <div className="relative p-8">
                  <Link href="/riparazioni/list" className="mb-4 block">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <i className="fas fa-archive text-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Archivio</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Consulta e filtra tutte le riparazioni registrate.</p>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Riparazioni recenti */}
          <motion.div variants={itemVariants} className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Riparazioni recenti</p>
              <Link href="/riparazioni/list" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Vedi tutte →</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {stats.recent.length > 0 ? stats.recent.map((item) => (
                <Link key={item.id} href={`/riparazioni/${item.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition group">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <i className="fas fa-wrench text-blue-500 text-xs"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">#{item.idRiparazione}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.cartellino ? `Cart. ${item.cartellino}` : "—"}
                      {item.laboratorio?.nome ? ` · ${item.laboratorio.nome}` : ""}
                      {item.reparto?.nome ? ` · ${item.reparto.nome}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge completa={item.completa} />
                    <i className="fas fa-chevron-right text-gray-300 dark:text-gray-600 text-xs group-hover:text-gray-400 transition"></i>
                  </div>
                </Link>
              )) : (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  <i className="fas fa-inbox text-3xl mb-2 block opacity-30"></i>
                  Nessuna riparazione registrata
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── COLONNA DESTRA (1/3) ── */}
        <div className="flex flex-col gap-6">

          {/* Aperte per laboratorio */}
          <motion.div variants={itemVariants} className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Aperte per laboratorio</p>
            </div>
            <div className="p-5">
              {stats.byLaboratorio.length > 0 ? (
                <div className="space-y-3">
                  {stats.byLaboratorio.map((row) => (
                    <div key={row.laboratorioId}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{labNome(row.laboratorioId)}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white ml-2">{row._count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.round((row._count / maxLab) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">
                  <i className="fas fa-flask text-2xl mb-2 block opacity-30"></i>
                  Nessuna aperta
                </div>
              )}
            </div>
          </motion.div>

          {/* Aperte per reparto */}
          <motion.div variants={itemVariants} className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Aperte per reparto</p>
            </div>
            <div className="p-5">
              {stats.byReparto.length > 0 ? (
                <div className="space-y-3">
                  {stats.byReparto.map((row) => (
                    <div key={row.repartoId}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{repNome(row.repartoId)}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white ml-2">{row._count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.round((row._count / maxRep) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">
                  <i className="fas fa-industry text-2xl mb-2 block opacity-30"></i>
                  Nessuna aperta
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
