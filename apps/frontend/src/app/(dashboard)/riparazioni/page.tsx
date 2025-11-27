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
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
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
};

type Stats = {
  totale?: number;
  aperte?: number;
  completate?: number;
  recent?: Riparazione[];
};

export default function RiparazioniPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totale: 0,
    aperte: 0,
    completate: 0,
    recent: [],
  });
  const [laboratori, setLaboratori] = useState<any[]>([]);
  const [reparti, setReparti] = useState<any[]>([]);
  const [numerate, setNumerate] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [data, labs, reps, nums] = await Promise.all([
        riparazioniApi.getStats(),
        riparazioniApi.getLaboratori(),
        riparazioniApi.getReparti(),
        riparazioniApi.getNumerate(),
      ]);
      setStats({
        totale: data?.totale || 0,
        aperte: data?.aperte || 0,
        completate: data?.completate || 0,
        recent: data?.recent || [],
      });
      setLaboratori(labs || []);
      setReparti(reps || []);
      setNumerate(nums || []);
    } catch (error) {
      showError("Errore nel caricamento delle statistiche");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader title="Riparazioni" subtitle="Gestione riparazioni esterne" />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Riparazioni" },
        ]}
      />

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
              <i className="fas fa-wrench text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Riparazioni Totali
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totale?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
              <i className="fas fa-folder-open text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Aperte
              </p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                {stats.aperte?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800/20 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg">
              <i className="fas fa-check-circle text-white"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                Completate
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-300">
                {stats.completate?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation + Support layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonna 1-2 top: Nuova / Archivio */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2">
          <motion.div variants={itemVariants}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-60 dark:from-blue-900/10 dark:to-indigo-800/10" />
              <div className="relative p-8">
                <Link href="/riparazioni/create" className="mb-4 block">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <i className="fas fa-plus-circle text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Nuova Riparazione
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Crea una nuova riparazione e compila la griglia taglie.
                  </p>
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Archivio
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Consulta e filtra tutte le riparazioni registrate.
                  </p>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Colonna 3: stack support cards (clickable) */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-4 lg:row-span-2"
        >
          <Link
            href="/riparazioni/laboratori"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-800/10"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <i className="fas fa-industry text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Laboratori
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Gestisci laboratori ({laboratori.length || 0})
                  </p>
                </div>
              </div>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                Apri <i className="fas fa-arrow-right ml-2"></i>
              </div>
            </div>
          </Link>

          <Link
            href="/riparazioni/reparti"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-800/10"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <i className="fas fa-sitemap text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Reparti
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Gestisci reparti ({reparti.length || 0})
                  </p>
                </div>
              </div>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                Apri <i className="fas fa-arrow-right ml-2"></i>
              </div>
            </div>
          </Link>

          <Link
            href="/riparazioni/numerate"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-800/10"></div>
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <i className="fas fa-tags text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Numerate
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Gestisci numerate ({numerate.length || 0})
                  </p>
                </div>
              </div>
              <div className="flex items-center text-amber-600 dark:text-amber-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                Apri <i className="fas fa-arrow-right ml-2"></i>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Riga successiva: recent sotto Nuovo/Archivio */}
        <motion.div
          variants={itemVariants}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm lg:col-span-2"
        >
          <div className="border-b border-gray-100 px-6 py-4 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
            Riparazioni Recenti
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recent && stats.recent.length > 0 ? (
              stats.recent.map((item) => (
                <Link
                  key={item.id}
                  href={`/riparazioni/${item.id}`}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-700/60"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      #{item.idRiparazione}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.cartellino || "Cartellino N/D"} ·{" "}
                      {item.laboratorio?.nome || "Lab N/D"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge completa={item.completa} />
                    <i className="fas fa-chevron-right text-gray-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                Nessuna riparazione recente.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
