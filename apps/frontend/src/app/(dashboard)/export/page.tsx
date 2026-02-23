"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { exportApi } from "@/lib/api";
import { showError } from "@/store/notifications";
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

interface ExportStats {
  totalDocuments: number;
  openDocuments: number;
  closedDocuments: number;
}

interface RecentDocument {
  id: number;
  progressivo: string;
  data: string;
  stato: string;
  terzista: {
    ragioneSociale: string;
  };
}

interface Terzista {
  id: number;
  ragioneSociale: string;
}

export default function ExportPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExportStats>({
    totalDocuments: 0,
    openDocuments: 0,
    closedDocuments: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [lastUsedTerzista, setLastUsedTerzista] = useState<Terzista | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [allDocs, terzistiData] = await Promise.all([
        exportApi.getDocuments(),
        exportApi.getTerzisti(true),
      ]);

      const openDocs = await exportApi.getDocuments({ stato: "Aperto" });
      const closedDocs = await exportApi.getDocuments({ stato: "Chiuso" });

      // Sort by progressivo descending and take first 5
      const recent = [...allDocs]
        .sort((a: any, b: any) =>
          b.progressivo.localeCompare(a.progressivo, undefined, { numeric: true })
        )
        .slice(0, 5);

      // Get last used terzista from most recent document
      let lastTerzista: Terzista | null = null;
      if (recent.length > 0) {
        const lastDoc = recent[0];
        lastTerzista = terzistiData.find((t: any) => t.id === lastDoc.terzistaId) || null;
      }

      setStats({
        totalDocuments: allDocs.length,
        openDocuments: openDocs.length,
        closedDocuments: closedDocs.length,
      });
      setRecentDocuments(recent);
      setLastUsedTerzista(lastTerzista);
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
      <PageHeader
        title="Export / DDT"
        subtitle="Gestione documenti di trasporto e terzisti"
      />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Export" },
        ]}
      />

      {/* Widget: Distribuzione DDT */}
      {stats.totalDocuments > 0 && (() => {
        const openPct = Math.round((stats.openDocuments / stats.totalDocuments) * 100);
        const closedPct = 100 - openPct;
        // Top terzisti from recent documents
        const terCount: Record<string, number> = {};
        recentDocuments.forEach(d => {
          const n = d.terzista.ragioneSociale;
          terCount[n] = (terCount[n] || 0) + 1;
        });
        const topTer = Object.entries(terCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const maxTer = topTer[0]?.[1] || 1;
        return (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 shadow-xl text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Distribuzione DDT */}
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Distribuzione DDT</p>
                  <h3 className="text-2xl font-extrabold mb-4">Aperti vs Chiusi</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white/80 text-sm font-medium">Aperti</span>
                        <span className="text-white font-bold text-sm">{stats.openDocuments} <span className="text-white/60 font-normal">({openPct}%)</span></span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div className="bg-white h-3 rounded-full transition-all duration-700" style={{ width: `${openPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white/80 text-sm font-medium">Chiusi</span>
                        <span className="text-white font-bold text-sm">{stats.closedDocuments} <span className="text-white/60 font-normal">({closedPct}%)</span></span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div className="bg-white/60 h-3 rounded-full transition-all duration-700" style={{ width: `${closedPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Top terzisti */}
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Terzisti Attivi</p>
                  <h3 className="text-2xl font-extrabold mb-4">Top Fornitori</h3>
                  {topTer.length > 0 ? (
                    <div className="space-y-2">
                      {topTer.map(([nome, cnt]) => (
                        <div key={nome}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white/80 text-xs font-medium truncate max-w-[160px]">{nome}</span>
                            <span className="text-white font-bold text-xs ml-2">{cnt} DDT</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div className="bg-white/80 h-2 rounded-full" style={{ width: `${Math.round((cnt / maxTer) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm">Nessun dato disponibile</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 2. Nuovo DDT */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-800/10"></div>
            <div className="relative p-8">
              <Link href="/export/create" className="block mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-plus-circle text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nuovo DDT
                </h3>
              </Link>

              {/* Widget Ultimo Fornitore */}
              {lastUsedTerzista && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    Ultimo Fornitore
                  </h4>
                  <Link
                    href={`/export/create?terzista=${lastUsedTerzista.id}`}
                    className="block group/terz"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex-shrink-0 shadow-sm">
                          <i className="fas fa-truck text-white text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {lastUsedTerzista.ragioneSociale}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            Crea nuovo DDT
                          </p>
                        </div>
                      </div>
                      <i className="fas fa-arrow-right text-sm text-blue-500 dark:text-blue-400 group-hover/terz:translate-x-1 transition-transform"></i>
                    </div>
                  </Link>
                </div>
              )}

              <Link href="/export/create" className="block mt-4">
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Crea nuovo DDT <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 3. Archivio DDT */}
        <motion.div variants={itemVariants}>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/10 dark:to-slate-800/10"></div>
            <div className="relative p-8">
              <Link href="/export/archive" className="block mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-gray-500 to-slate-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-archive text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Elenco DDT
                </h3>
              </Link>

              {/* Widget Ultimo DDT */}
              {recentDocuments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    DDT Recente
                  </h4>
                  <Link
                    href={`/export/${recentDocuments[0].progressivo}`}
                    className="block group/doc"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                            {recentDocuments[0].progressivo}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              recentDocuments[0].stato === "Aperto"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {recentDocuments[0].stato}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {recentDocuments[0].terzista.ragioneSociale}
                        </p>
                      </div>
                      <i className="fas fa-arrow-right text-sm text-gray-400 group-hover/doc:text-gray-600 dark:group-hover/doc:text-gray-300 transition-colors"></i>
                    </div>
                  </Link>
                </div>
              )}

              <Link href="/export/archive" className="block mt-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Apri archivio completo <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 3. Articoli Master */}
        <motion.div variants={itemVariants}>
          <Link href="/export/articles">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm hover:-translate-y-1 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-800/10"></div>
              <div className="relative p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-box text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Articoli Master
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Anagrafiche articoli, voci doganali, UM e prezzi
                </p>
                <div className="flex items-center text-orange-600 dark:text-orange-400 font-medium mt-4 group-hover:translate-x-2 transition-transform duration-300">
                  Apri <i className="fas fa-arrow-right ml-2"></i>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

      </div>
    </motion.div>
  );
}
