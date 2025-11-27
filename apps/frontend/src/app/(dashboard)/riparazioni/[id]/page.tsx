"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import StatusBadge from "@/components/riparazioni/StatusBadge";
import TaglieGrid from "@/components/riparazioni/TaglieGrid";
import { riparazioniApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";

type Riparazione = {
  id: number;
  idRiparazione: string;
  cartellino?: string;
  completa: boolean;
  laboratorio?: { nome?: string };
  reparto?: { nome?: string };
  linea?: { nome?: string };
  numerata?: any;
  causale?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export default function RiparazioneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [riparazione, setRiparazione] = useState<Riparazione | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadRiparazione();
  }, [id]);

  const loadRiparazione = async () => {
    setLoading(true);
    try {
      const data = await riparazioniApi.getRiparazione(Number(id));
      setRiparazione(data);
    } catch (error) {
      console.error("Errore caricamento riparazione", error);
      showError("Riparazione non trovata");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!riparazione) return;
    setCompleting(true);
    try {
      await riparazioniApi.completeRiparazione(riparazione.id);
      showSuccess("Riparazione completata");
      loadRiparazione();
    } catch (error) {
      console.error("Errore completamento riparazione", error);
      showError("Errore completamento");
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !riparazione) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10 dark:bg-gray-900">
        <PageHeader title="Riparazione" />
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
            Caricamento...
          </div>
        </div>
      </div>
    );
  }

  const taglie: Record<string, number> = {};
  for (let i = 1; i <= 20; i++) {
    const pField = `p${String(i).padStart(2, "0")}`;
    taglie[pField] = riparazione[pField] || 0;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10 dark:bg-gray-900">
      <PageHeader title={`Riparazione #${riparazione.idRiparazione}`} subtitle={riparazione.cartellino || ""} />
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Riparazioni", href: "/riparazioni" },
          { label: riparazione.idRiparazione },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Stato</div>
            <StatusBadge completa={riparazione.completa} />
          </div>
          <div className="flex gap-2">
            {!riparazione.completa && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
              >
                {completing ? "Completamento..." : "Completa"}
              </button>
            )}
            <button
              onClick={() => router.push("/riparazioni/list")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Torna all'archivio
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Info</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoTile label="ID Riparazione" value={riparazione.idRiparazione} />
            <InfoTile label="Cartellino" value={riparazione.cartellino || "-"} />
            <InfoTile label="Laboratorio" value={riparazione.laboratorio?.nome || "-"} />
            <InfoTile label="Reparto" value={riparazione.reparto?.nome || "-"} />
            <InfoTile label="Linea" value={riparazione.linea?.nome || "-"} />
            <InfoTile
              label="Data"
              value={
                riparazione.createdAt
                  ? new Date(riparazione.createdAt).toLocaleDateString("it-IT")
                  : "-"
              }
            />
          </div>
          {riparazione.causale && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Causale</div>
              <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {riparazione.causale}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Taglie</h3>
          </div>
          <TaglieGrid numerata={riparazione.numerata} values={taglie} readonly />
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-800/50">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
