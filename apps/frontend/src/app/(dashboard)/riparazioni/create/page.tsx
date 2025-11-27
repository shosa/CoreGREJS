"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import TaglieGrid from "@/components/riparazioni/TaglieGrid";
import { riparazioniApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";

type Numerata = { id: number; n01?: string; n02?: string; [key: string]: any };
type Option = { id: number; nome: string };

export default function RiparazioniCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [cartellino, setCartellino] = useState("");
  const [nextId, setNextId] = useState<string>("");
  const [numerate, setNumerate] = useState<Numerata[]>([]);
  const [laboratori, setLaboratori] = useState<Option[]>([]);
  const [reparti, setReparti] = useState<Option[]>([]);
  const [linee, setLinee] = useState<Option[]>([]);
  const [selectedNumerata, setSelectedNumerata] = useState<number | null>(null);
  const [form, setForm] = useState<any>({
    laboratorioId: null,
    repartoId: null,
    lineaId: null,
    causale: "",
  });
  const [taglie, setTaglie] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) initial[`p${String(i).padStart(2, "0")}`] = 0;
    return initial;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSupport();
  }, []);

  const loadSupport = async () => {
    try {
      const [idData, numerateData, labData, repData, lineeData] = await Promise.all([
        riparazioniApi.getNextId(),
        riparazioniApi.getNumerate(),
        riparazioniApi.getLaboratori(),
        riparazioniApi.getReparti(),
        riparazioniApi.getLinee(),
      ]);
      setNextId(idData?.nextId || idData?.idRiparazione || "");
      setNumerate(numerateData || []);
      setLaboratori(labData || []);
      setReparti(repData || []);
      setLinee(lineeData || []);
    } catch (error) {
      console.error("Errore caricamento dati supporto", error);
      showError("Errore caricamento dati supporto");
    }
  };

  const totalPairs = useMemo(() => {
    return Object.values(taglie).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [taglie]);

  const handleNext = () => {
    if (!cartellino.trim()) {
      showError("Inserisci il cartellino");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedNumerata) {
      showError("Seleziona una numerata");
      return;
    }
    if (!form.laboratorioId || !form.repartoId) {
      showError("Seleziona laboratorio e reparto");
      return;
    }
    if (totalPairs === 0) {
      showError("Inserisci almeno una quantità");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        idRiparazione: nextId,
        cartellino,
        numerataId: selectedNumerata,
        laboratorioId: form.laboratorioId,
        repartoId: form.repartoId,
        lineaId: form.lineaId,
        causale: form.causale,
        ...taglie,
      };
      const result = await riparazioniApi.createRiparazione(payload);
      showSuccess("Riparazione creata");
      router.push(`/riparazioni/${result.id}`);
    } catch (error) {
      console.error("Errore creazione riparazione", error);
      showError("Errore creazione riparazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10 dark:bg-gray-900">
      <PageHeader title="Nuova Riparazione" subtitle="Workflow a 2 step" />
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Riparazioni", href: "/riparazioni" },
          { label: "Nuova" },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
            1. Cartellino
          </span>
          <span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
            2. Dettagli
          </span>
        </div>

        {step === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Cartellino
            </label>
            <input
              value={cartellino}
              onChange={(e) => setCartellino(e.target.value)}
              placeholder="Inserisci numero cartellino"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-lg font-semibold tracking-widest text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleNext}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                Continua
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    ID Riparazione
                  </label>
                  <input
                    value={nextId}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Cartellino
                  </label>
                  <input
                    value={cartellino}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Numerata
                  </label>
                  <select
                    value={selectedNumerata || ""}
                    onChange={(e) => setSelectedNumerata(e.target.value ? Number(e.target.value) : null)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Seleziona</option>
                    {numerate.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} - {n.n01 || "Numerata"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Laboratorio
                  </label>
                  <select
                    value={form.laboratorioId || ""}
                    onChange={(e) =>
                      setForm({ ...form, laboratorioId: e.target.value ? Number(e.target.value) : null })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Seleziona</option>
                    {laboratori.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Reparto
                  </label>
                  <select
                    value={form.repartoId || ""}
                    onChange={(e) =>
                      setForm({ ...form, repartoId: e.target.value ? Number(e.target.value) : null })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Seleziona</option>
                    {reparti.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Linea
                  </label>
                  <select
                    value={form.lineaId || ""}
                    onChange={(e) =>
                      setForm({ ...form, lineaId: e.target.value ? Number(e.target.value) : null })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Seleziona</option>
                    {linee.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Causale
                </label>
                <textarea
                  value={form.causale}
                  onChange={(e) => setForm({ ...form, causale: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Taglie</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Totale paia: <span className="font-semibold">{totalPairs}</span>
                  </p>
                </div>
              </div>
              <TaglieGrid
                numerata={numerate.find((n) => n.id === selectedNumerata)}
                values={taglie}
                onChange={(field, value) => setTaglie({ ...taglie, [field]: value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Indietro
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
              >
                {loading ? "Salvataggio..." : "Salva riparazione"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
