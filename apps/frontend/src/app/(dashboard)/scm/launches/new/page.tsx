'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { showError, showSuccess } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Laboratory {
  id: number;
  nome: string;
  attivo: boolean;
}

interface StandardPhase {
  id: number;
  nome: string;
  ordine: number;
  attivo: boolean;
}

export default function NewLaunchPage() {
  const router = useRouter();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [standardPhases, setStandardPhases] = useState<StandardPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    numero: '',
    laboratoryId: '',
    dataLancio: new Date().toISOString().split('T')[0],
    dataConsegna: '',
    note: '',
    articles: [{ codice: '', descrizione: '', quantita: 1 }],
    selectedPhases: [] as number[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [labsRes, phasesRes] = await Promise.all([
        api.get('/scm/laboratories?attivo=true'),
        api.get('/scm/standard-phases?attivo=true'),
      ]);
      setLaboratories(labsRes.data);
      setStandardPhases(phasesRes.data.sort((a: StandardPhase, b: StandardPhase) => a.ordine - b.ordine));
      // Preseleziona tutte le fasi
      setFormData((prev) => ({
        ...prev,
        selectedPhases: phasesRes.data.map((p: StandardPhase) => p.id),
      }));
    } catch (error: any) {
      showError('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArticle = () => {
    setFormData((prev) => ({
      ...prev,
      articles: [...prev.articles, { codice: '', descrizione: '', quantita: 1 }],
    }));
  };

  const handleRemoveArticle = (index: number) => {
    if (formData.articles.length === 1) {
      showError('Devi avere almeno un articolo');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      articles: prev.articles.filter((_, i) => i !== index),
    }));
  };

  const handleArticleChange = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      articles: prev.articles.map((art, i) =>
        i === index ? { ...art, [field]: value } : art
      ),
    }));
  };

  const handlePhaseToggle = (phaseId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedPhases: prev.selectedPhases.includes(phaseId)
        ? prev.selectedPhases.filter((id) => id !== phaseId)
        : [...prev.selectedPhases, phaseId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numero.trim()) {
      showError('Il numero lancio è obbligatorio');
      return;
    }

    if (!formData.laboratoryId) {
      showError('Seleziona un laboratorio');
      return;
    }

    if (formData.articles.some((art) => !art.codice.trim())) {
      showError('Tutti gli articoli devono avere un codice');
      return;
    }

    if (formData.selectedPhases.length === 0) {
      showError('Seleziona almeno una fase');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        numero: formData.numero,
        laboratoryId: parseInt(formData.laboratoryId),
        dataLancio: new Date(formData.dataLancio),
        dataConsegna: formData.dataConsegna ? new Date(formData.dataConsegna) : null,
        note: formData.note || null,
        articles: formData.articles.map((art) => ({
          codice: art.codice,
          descrizione: art.descrizione || null,
          quantita: parseInt(art.quantita.toString()),
        })),
        phases: formData.selectedPhases.map((phaseId, index) => ({
          standardPhaseId: phaseId,
          ordine: index,
        })),
      };

      const response = await api.post('/scm/launches', payload);
      showSuccess('Lancio creato con successo');
      router.push(`/scm/launches/${response.data.id}`);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore creazione lancio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader title="Nuovo Lancio" subtitle="Crea un nuovo lancio di produzione" />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'SCM', href: '/scm' },
          { label: 'Lanci', href: '/scm/launches' },
          { label: 'Nuovo' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-500"></i>
            Informazioni Generali
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Numero Lancio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ES: L001/2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Laboratorio <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.laboratoryId}
                onChange={(e) => setFormData({ ...formData, laboratoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleziona laboratorio</option>
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Lancio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dataLancio}
                onChange={(e) => setFormData({ ...formData, dataLancio: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Consegna Prevista
              </label>
              <input
                type="date"
                value={formData.dataConsegna}
                onChange={(e) => setFormData({ ...formData, dataConsegna: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Note aggiuntive sul lancio"
            />
          </div>
        </motion.div>

        {/* Articles */}
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-box text-orange-500"></i>
              Articoli
            </h3>
            <button
              type="button"
              onClick={handleAddArticle}
              className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <i className="fas fa-plus mr-2"></i>
              Aggiungi Articolo
            </button>
          </div>

          <div className="space-y-4">
            {formData.articles.map((article, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Codice <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={article.codice}
                      onChange={(e) => handleArticleChange(index, 'codice', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                      placeholder="Codice articolo"
                      required
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      value={article.descrizione}
                      onChange={(e) => handleArticleChange(index, 'descrizione', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Descrizione articolo"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantità (paia) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={article.quantita}
                      onChange={(e) =>
                        handleArticleChange(index, 'quantita', parseInt(e.target.value) || 1)
                      }
                      min="1"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveArticle(index)}
                      className="w-full px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                      title="Rimuovi"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Phases */}
        <motion.div
          variants={itemVariants}
          className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-tasks text-teal-500"></i>
            Fasi di Lavorazione
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {standardPhases.map((phase) => (
              <div
                key={phase.id}
                onClick={() => handlePhaseToggle(phase.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.selectedPhases.includes(phase.id)
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      formData.selectedPhases.includes(phase.id)
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {formData.selectedPhases.includes(phase.id) && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {phase.nome}
                    </div>
                    <div className="text-xs text-gray-500">Ordine: {phase.ordine}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={saving}
          >
            <i className="fas fa-times mr-2"></i>
            Annulla
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creazione...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Crea Lancio
              </>
            )}
          </button>
        </motion.div>
      </form>
    </motion.div>
  );
}
