"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { inworkApi } from "@/lib/api";
import { showError, showSuccess } from "@/store/notifications";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
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

export default function InWorkPage() {
  const [activeTab, setActiveTab] = useState<"operators" | "modules">("operators");
  const [operators, setOperators] = useState<InworkOperator[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<InworkOperator | null>(null);
  const [editingModule, setEditingModule] = useState<AvailableModule | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [formData, setFormData] = useState({
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
  });

  const [moduleFormData, setModuleFormData] = useState({
    moduleId: "",
    moduleName: "",
    descrizione: "",
    ordine: 0,
  });

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

  const handleCreateOrUpdate = async () => {
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
      await fetchData();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il salvataggio");
    }
  };

  const handleDelete = async (id: number) => {
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

  const handleToggleModule = async (id: number) => {
    try {
      await inworkApi.toggleModule(id);
      await fetchData();
      showSuccess("Stato modulo aggiornato");
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il cambio stato");
    }
  };

  const handleCreateOrUpdateModule = async () => {
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
      await fetchData();
      setShowModuleModal(false);
      resetModuleForm();
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante il salvataggio");
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingOperator(null);
    setShowModal(true);
  };

  const openEditModal = (operator: InworkOperator) => {
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
    setShowModal(true);
  };

  const openCreateModuleModal = () => {
    resetModuleForm();
    setEditingModule(null);
    setShowModuleModal(true);
  };

  const openEditModuleModal = (module: AvailableModule) => {
    setEditingModule(module);
    setModuleFormData({
      moduleId: module.moduleId,
      moduleName: module.moduleName,
      descrizione: module.descrizione || "",
      ordine: module.ordine,
    });
    setShowModuleModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      cognome: "",
      matricola: "",
      pin: "",
      password: "",
      email: "",
      reparto: "",
      ruolo: "",
      attivo: true,
      modulePermissions: [],
    });
  };

  const resetModuleForm = () => {
    setModuleFormData({
      moduleId: "",
      moduleName: "",
      descrizione: "",
      ordine: 0,
    });
  };

  const toggleModulePermission = (moduleId: string) => {
    setFormData((prev) => ({
      ...prev,
      modulePermissions: prev.modulePermissions.includes(moduleId)
        ? prev.modulePermissions.filter((m) => m !== moduleId)
        : [...prev.modulePermissions, moduleId],
    }));
  };

  const filteredOperators = operators.filter((op) => {
    const matchesSearch =
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

  const activeCount = operators.filter((o) => o.attivo).length;
  const inactiveCount = operators.filter((o) => !o.attivo).length;
  const activeModulesCount = availableModules.filter((m) => m.attivo).length;

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
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader title="Gestione Operatori InWork" subtitle="Configurazione operatori app mobile" />

      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/", icon: "fa-home" },
          { label: "Operatori InWork" },
        ]}
      />

      {/* Tabs */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("operators")}
            className={`px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "operators"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <i className="fas fa-users mr-2"></i>
            Operatori
          </button>
          <button
            onClick={() => setActiveTab("modules")}
            className={`px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "modules"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <i className="fas fa-th-large mr-2"></i>
            Moduli Disponibili
          </button>
        </div>
      </motion.div>

      {/* Operators Tab */}
      {activeTab === "operators" && (
        <>
          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
                  <i className="fas fa-users text-xl text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Totale Operatori
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{operators.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm"
            >
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600">
                  <i className="fas fa-check-circle text-xl text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                    Operatori Attivi
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">{activeCount}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-600">
                  <i className="fas fa-times-circle text-xl text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Operatori Inattivi
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{inactiveCount}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Actions Bar */}
          <motion.div
            variants={itemVariants}
            className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Cerca operatore..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Tutti</option>
                <option value="active">Attivi</option>
                <option value="inactive">Inattivi</option>
              </select>
            </div>

            <button
              onClick={openCreateModal}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
            >
              <i className="fas fa-plus"></i>
              Nuovo Operatore
            </button>
          </motion.div>

          {/* Table */}
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Operatore
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Matricola
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Reparto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Ruolo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Moduli
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Stato
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOperators.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-users-slash text-4xl mb-2"></i>
                        <p>Nessun operatore trovato</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOperators.map((operator) => (
                      <tr
                        key={operator.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {operator.nome} {operator.cognome}
                            </div>
                            {operator.email && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {operator.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {operator.matricola ? (
                            <span className="inline-flex rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-mono text-gray-800 dark:text-gray-200">
                              {operator.matricola}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {operator.reparto || "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {operator.ruolo || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {operator.modulePermissions.map((perm) => (
                              <span
                                key={perm.id}
                                className="inline-flex rounded-md bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs text-blue-800 dark:text-blue-300"
                              >
                                {perm.module}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(operator.id)}
                            className={`inline-flex rounded-md px-3 py-1 text-xs font-semibold ${
                              operator.attivo
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            }`}
                          >
                            {operator.attivo ? "Attivo" : "Inattivo"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(operator)}
                              className="rounded-lg bg-blue-50 px-3 py-2 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                              title="Modifica"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(operator.id)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                              title="Elimina"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* Modules Tab */}
      {activeTab === "modules" && (
        <>
          {/* Stats Card */}
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
            >
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600">
                  <i className="fas fa-th-large text-xl text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Totale Moduli
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {availableModules.length}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg dark:border-green-800 dark:bg-green-900/20 backdrop-blur-sm"
            >
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600">
                  <i className="fas fa-check-circle text-xl text-white"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                    Moduli Attivi
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                    {activeModulesCount}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Add Module Button */}
          <motion.div variants={itemVariants} className="mb-6 flex justify-end">
            <button
              onClick={openCreateModuleModal}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Nuovo Modulo
            </button>
          </motion.div>

          {/* Modules Table */}
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      ID Modulo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Nome
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Descrizione
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Ordine
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Stato
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {availableModules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-box-open text-4xl mb-2"></i>
                        <p>Nessun modulo disponibile</p>
                      </td>
                    </tr>
                  ) : (
                    availableModules.map((module) => (
                      <tr
                        key={module.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-md bg-purple-100 dark:bg-purple-900/30 px-2 py-1 text-xs font-mono text-purple-800 dark:text-purple-300">
                            {module.moduleId}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {module.moduleName}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {module.descrizione || "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{module.ordine}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleModule(module.id)}
                            className={`inline-flex rounded-md px-3 py-1 text-xs font-semibold ${
                              module.attivo
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                            }`}
                          >
                            {module.attivo ? "Attivo" : "Inattivo"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openEditModuleModal(module)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                            title="Modifica"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* Operator Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-800"
          >
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingOperator ? "Modifica Operatore" : "Nuovo Operatore"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Matricola
                  </label>
                  <input
                    type="text"
                    value={formData.matricola}
                    onChange={(e) => setFormData({ ...formData, matricola: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    PIN
                  </label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Password {editingOperator && "(vuoto = non modificare)"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Reparto
                  </label>
                  <input
                    type="text"
                    value={formData.reparto}
                    onChange={(e) => setFormData({ ...formData, reparto: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ruolo
                  </label>
                  <input
                    type="text"
                    value={formData.ruolo}
                    onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Moduli Abilitati
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {modules.map((module) => (
                    <label
                      key={module.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 p-3 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
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

              <div className="mt-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.attivo}
                    onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Operatore Attivo
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={!formData.nome}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-save mr-2"></i>
                {editingOperator ? "Salva Modifiche" : "Crea Operatore"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-800"
          >
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingModule ? "Modifica Modulo" : "Nuovo Modulo"}
                </h2>
                <button
                  onClick={() => setShowModuleModal(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ID Modulo *
                  </label>
                  <input
                    type="text"
                    value={moduleFormData.moduleId}
                    onChange={(e) =>
                      setModuleFormData({ ...moduleFormData, moduleId: e.target.value })
                    }
                    disabled={!!editingModule}
                    placeholder="es: produzione, tracking"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nome Modulo *
                  </label>
                  <input
                    type="text"
                    value={moduleFormData.moduleName}
                    onChange={(e) =>
                      setModuleFormData({ ...moduleFormData, moduleName: e.target.value })
                    }
                    placeholder="es: Produzione, Tracking"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Descrizione
                  </label>
                  <textarea
                    value={moduleFormData.descrizione}
                    onChange={(e) =>
                      setModuleFormData({ ...moduleFormData, descrizione: e.target.value })
                    }
                    rows={3}
                    placeholder="Breve descrizione del modulo..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ordine
                  </label>
                  <input
                    type="number"
                    value={moduleFormData.ordine}
                    onChange={(e) =>
                      setModuleFormData({ ...moduleFormData, ordine: parseInt(e.target.value) })
                    }
                    min={0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModuleModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateOrUpdateModule}
                disabled={!moduleFormData.moduleId || !moduleFormData.moduleName}
                className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-save mr-2"></i>
                {editingModule ? "Salva Modifiche" : "Crea Modulo"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
