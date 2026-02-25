"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import Offcanvas from "@/components/ui/Offcanvas";
import { inworkApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface InworkOperator {
  id: number;
  nome: string;
  cognome?: string;
  matricola?: string;
  pin?: string;
  email?: string;
  reparto?: string;
  ruolo?: string;
  attivo: boolean;
  lastLogin?: string;
  modulePermissions: { id: number; module: string; enabled: boolean }[];
}

interface Module {
  id: string;
  name: string;
  description?: string;
}

interface AvailableModule {
  id: number;
  moduleId: string;
  moduleName: string;
  descrizione?: string;
  attivo: boolean;
  ordine: number;
}

const defaultFormData = {
  nome: "",
  cognome: "",
  matricola: "",
  pin: "",
  password: "",
  email: "",
  reparto: "",
  ruolo: "",
  attivo: true,
  modulePermissions: [] as string[],
};

const defaultModuleFormData = {
  moduleId: "",
  moduleName: "",
  descrizione: "",
  ordine: 0,
};

export default function InWorkPage() {
  const [activeTab, setActiveTab] = useState<"operators" | "modules">("operators");
  const [operators, setOperators] = useState<InworkOperator[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);
  const [loading, setLoading] = useState(true);

  // Offcanvas operator
  const [operatorOffcanvasOpen, setOperatorOffcanvasOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<InworkOperator | null>(null);
  const [formData, setFormData] = useState({ ...defaultFormData });

  // Offcanvas module
  const [moduleOffcanvasOpen, setModuleOffcanvasOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<AvailableModule | null>(null);
  const [moduleFormData, setModuleFormData] = useState({ ...defaultModuleFormData });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "operators") {
        const [operatorsData, modulesData] = await Promise.all([
          inworkApi.getAllOperators(),
          inworkApi.getAvailableModules(),
        ]);
        setOperators(operatorsData);
        setModules(modulesData);
      } else {
        const modulesData = await inworkApi.getAllModules();
        setAvailableModules(modulesData);
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  // ── Operator handlers ────────────────────────────────────────────────────────

  const openCreateOperator = () => {
    setEditingOperator(null);
    setFormData({ ...defaultFormData });
    setOperatorOffcanvasOpen(true);
  };

  const openEditOperator = (operator: InworkOperator) => {
    setEditingOperator(operator);
    setFormData({
      nome: operator.nome,
      cognome: operator.cognome || "",
      matricola: operator.matricola || "",
      pin: operator.pin || "",
      password: "",
      email: operator.email || "",
      reparto: operator.reparto || "",
      ruolo: operator.ruolo || "",
      attivo: operator.attivo,
      modulePermissions: operator.modulePermissions.map((m) => m.module),
    });
    setOperatorOffcanvasOpen(true);
  };

  const handleSaveOperator = async () => {
    if (!formData.nome.trim()) {
      showError("Il nome è obbligatorio");
      return;
    }
    try {
      if (editingOperator) {
        await inworkApi.updateOperator(editingOperator.id, formData);
        showSuccess("Operatore aggiornato con successo");
      } else {
        await inworkApi.createOperator(formData);
        showSuccess("Operatore creato con successo");
      }
      setOperatorOffcanvasOpen(false);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il salvataggio");
    }
  };

  const handleDeleteOperator = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo operatore?")) return;
    try {
      await inworkApi.deleteOperator(id);
      showSuccess("Operatore eliminato con successo");
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante l'eliminazione");
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await inworkApi.toggleOperatorStatus(id);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il cambio stato");
    }
  };

  const toggleModulePermission = (moduleId: string) => {
    setFormData((prev) => ({
      ...prev,
      modulePermissions: prev.modulePermissions.includes(moduleId)
        ? prev.modulePermissions.filter((m) => m !== moduleId)
        : [...prev.modulePermissions, moduleId],
    }));
  };

  // ── Module handlers ──────────────────────────────────────────────────────────

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleFormData({ ...defaultModuleFormData });
    setModuleOffcanvasOpen(true);
  };

  const openEditModule = (module: AvailableModule) => {
    setEditingModule(module);
    setModuleFormData({
      moduleId: module.moduleId,
      moduleName: module.moduleName,
      descrizione: module.descrizione || "",
      ordine: module.ordine,
    });
    setModuleOffcanvasOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleFormData.moduleId.trim() || !moduleFormData.moduleName.trim()) {
      showError("ID e Nome modulo sono obbligatori");
      return;
    }
    try {
      if (editingModule) {
        await inworkApi.updateModule(editingModule.id, moduleFormData);
        showSuccess("Modulo aggiornato con successo");
      } else {
        await inworkApi.createModule(moduleFormData);
        showSuccess("Modulo creato con successo");
      }
      setModuleOffcanvasOpen(false);
      await fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il salvataggio");
    }
  };

  const handleToggleModule = async (id: number) => {
    try {
      await inworkApi.toggleModule(id);
      await fetchData();
      showSuccess("Stato modulo aggiornato");
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il cambio stato");
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const activeCount = operators.filter((o) => o.attivo).length;
  const inactiveCount = operators.filter((o) => !o.attivo).length;
  const activeModulesCount = availableModules.filter((m) => m.attivo).length;

  const filteredOperators = operators.filter((op) => {
    const matchesSearch =
      !searchQuery ||
      op.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.cognome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.matricola?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && op.attivo) ||
      (filterStatus === "inactive" && !op.attivo);
    return matchesSearch && matchesStatus;
  });

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
            title="Gestione Operatori InWork"
            subtitle="Configurazione operatori app mobile"
          />
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/", icon: "fa-home" },
              { label: "Operatori InWork" },
            ]}
          />
        </motion.div>

        {/* Body: sidebar + main */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
        >
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-60 shrink-0 flex-col gap-3 overflow-y-auto">
            {/* Tabs navigation */}
            <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
              <button
                onClick={() => setActiveTab("operators")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-gray-100 dark:border-gray-700/50 ${
                  activeTab === "operators"
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <i className={`fas fa-users text-xs w-4 text-center ${activeTab === "operators" ? "text-blue-500" : "text-gray-400"}`}></i>
                Operatori
              </button>
              <button
                onClick={() => setActiveTab("modules")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "modules"
                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <i className={`fas fa-th-large text-xs w-4 text-center ${activeTab === "modules" ? "text-purple-500" : "text-gray-400"}`}></i>
                Moduli Disponibili
              </button>
            </div>

            {/* Stats */}
            {activeTab === "operators" && (
              <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Statistiche
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <i className="fas fa-users text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Totale</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{operators.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                    <i className="fas fa-check-circle text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Attivi</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400 leading-tight">{activeCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                    <i className="fas fa-times-circle text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Inattivi</p>
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-400 leading-tight">{inactiveCount}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "modules" && (
              <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Statistiche
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                    <i className="fas fa-th-large text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Totale moduli</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{availableModules.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                    <i className="fas fa-check-circle text-white text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Moduli attivi</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400 leading-tight">{activeModulesCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters (operators only) */}
            {activeTab === "operators" && (
              <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Filtri
                </p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Stato</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tutti</option>
                    <option value="active">Attivi</option>
                    <option value="inactive">Inattivi</option>
                  </select>
                </div>
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
            {/* Toolbar */}
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {activeTab === "operators" && (
                  <div className="relative flex-1 max-w-xs">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Cerca operatore…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {activeTab === "operators" && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {loading ? "Caricamento…" : `${filteredOperators.length} operatori`}
                  </span>
                )}
                {activeTab === "modules" && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {loading ? "Caricamento…" : `${availableModules.length} moduli`}
                  </span>
                )}
              </div>

              {activeTab === "operators" && (
                <button
                  onClick={openCreateOperator}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all whitespace-nowrap"
                >
                  <i className="fas fa-plus text-xs"></i>
                  Nuovo Operatore
                </button>
              )}
              {activeTab === "modules" && (
                <button
                  onClick={openCreateModule}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all whitespace-nowrap"
                >
                  <i className="fas fa-plus text-xs"></i>
                  Nuovo Modulo
                </button>
              )}
            </div>

            {/* Table area */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center py-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent"
                  />
                </div>
              ) : activeTab === "operators" ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Operatore</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Matricola</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Reparto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ruolo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Moduli</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Stato</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {filteredOperators.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          <i className="fas fa-users-slash text-3xl mb-2 block opacity-40"></i>
                          Nessun operatore trovato
                        </td>
                      </tr>
                    ) : (
                      filteredOperators.map((operator) => (
                        <tr
                          key={operator.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {operator.nome} {operator.cognome}
                            </div>
                            {operator.email && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{operator.email}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {operator.matricola ? (
                              <span className="inline-flex rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-mono text-gray-800 dark:text-gray-200">
                                {operator.matricola}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {operator.reparto || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {operator.ruolo || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {operator.modulePermissions.length === 0 ? (
                                <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                              ) : (
                                operator.modulePermissions.map((perm) => (
                                  <span
                                    key={perm.id}
                                    className="inline-flex rounded-md bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-800 dark:text-blue-300"
                                  >
                                    {perm.module}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleStatus(operator.id)}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                                operator.attivo
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                              }`}
                            >
                              <i className={`fas ${operator.attivo ? "fa-check-circle" : "fa-times-circle"} mr-1 text-xs`}></i>
                              {operator.attivo ? "Attivo" : "Inattivo"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditOperator(operator)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                title="Modifica"
                              >
                                <i className="fas fa-edit text-xs"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteOperator(operator.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                title="Elimina"
                              >
                                <i className="fas fa-trash text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">ID Modulo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Descrizione</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ordine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Stato</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {availableModules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          <i className="fas fa-box-open text-3xl mb-2 block opacity-40"></i>
                          Nessun modulo disponibile
                        </td>
                      </tr>
                    ) : (
                      availableModules.map((module) => (
                        <tr
                          key={module.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-md bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-mono text-purple-800 dark:text-purple-300">
                              {module.moduleId}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {module.moduleName}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[220px] truncate">
                            {module.descrizione || <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{module.ordine}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleModule(module.id)}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                                module.attivo
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                              }`}
                            >
                              <i className={`fas ${module.attivo ? "fa-check-circle" : "fa-times-circle"} mr-1 text-xs`}></i>
                              {module.attivo ? "Attivo" : "Inattivo"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => openEditModule(module)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                title="Modifica"
                              >
                                <i className="fas fa-edit text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Offcanvas: Operator create/edit */}
      <Offcanvas
        open={operatorOffcanvasOpen}
        onClose={() => setOperatorOffcanvasOpen(false)}
        title={editingOperator ? "Modifica Operatore" : "Nuovo Operatore"}
        icon={editingOperator ? "fa-user-edit" : "fa-user-plus"}
        iconColor="text-blue-500"
        width="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setOperatorOffcanvasOpen(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSaveOperator}
              disabled={!formData.nome}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-save mr-2"></i>
              {editingOperator ? "Salva Modifiche" : "Crea Operatore"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Cognome</label>
              <input
                type="text"
                value={formData.cognome}
                onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Matricola</label>
              <input
                type="text"
                value={formData.matricola}
                onChange={(e) => setFormData({ ...formData, matricola: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">PIN</label>
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                maxLength={10}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Password {editingOperator && <span className="font-normal text-gray-400">(vuoto = non modificare)</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Reparto</label>
              <input
                type="text"
                value={formData.reparto}
                onChange={(e) => setFormData({ ...formData, reparto: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Ruolo</label>
              <input
                type="text"
                value={formData.ruolo}
                onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Module permissions */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Moduli Abilitati
            </label>
            <div className="grid grid-cols-2 gap-2">
              {modules.map((module) => (
                <label
                  key={module.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.modulePermissions.includes(module.id)}
                    onChange={() => toggleModulePermission(module.id)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{module.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={formData.attivo}
              onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Operatore Attivo</span>
          </label>
        </div>
      </Offcanvas>

      {/* Offcanvas: Module create/edit */}
      <Offcanvas
        open={moduleOffcanvasOpen}
        onClose={() => setModuleOffcanvasOpen(false)}
        title={editingModule ? "Modifica Modulo" : "Nuovo Modulo"}
        icon={editingModule ? "fa-edit" : "fa-plus-circle"}
        iconColor="text-purple-500"
        width="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setModuleOffcanvasOpen(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSaveModule}
              disabled={!moduleFormData.moduleId || !moduleFormData.moduleName}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-save mr-2"></i>
              {editingModule ? "Salva Modifiche" : "Crea Modulo"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 px-4 pb-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">ID Modulo *</label>
            <input
              type="text"
              value={moduleFormData.moduleId}
              onChange={(e) => setModuleFormData({ ...moduleFormData, moduleId: e.target.value })}
              disabled={!!editingModule}
              placeholder="es: produzione, tracking"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Nome Modulo *</label>
            <input
              type="text"
              value={moduleFormData.moduleName}
              onChange={(e) => setModuleFormData({ ...moduleFormData, moduleName: e.target.value })}
              placeholder="es: Produzione, Tracking"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Descrizione</label>
            <textarea
              value={moduleFormData.descrizione}
              onChange={(e) => setModuleFormData({ ...moduleFormData, descrizione: e.target.value })}
              rows={3}
              placeholder="Breve descrizione del modulo…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Ordine</label>
            <input
              type="number"
              value={moduleFormData.ordine}
              onChange={(e) => setModuleFormData({ ...moduleFormData, ordine: parseInt(e.target.value) || 0 })}
              min={0}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </Offcanvas>
    </>
  );
}
