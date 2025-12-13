'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportApi } from '@/lib/api';
import { showError, showSuccess } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Pagination from '@/components/ui/Pagination';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Article {
  id: number;
  codiceArticolo: string;
  descrizione?: string;
  voceDoganale?: string;
  um?: string;
  prezzoUnitario?: number;
}

export default function ArticlesPage() {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Article>>({
    codiceArticolo: '',
    descrizione: '',
    voceDoganale: '',
    um: '',
    prezzoUnitario: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await exportApi.getArticlesMaster();
      setArticles(data);
    } catch (error) {
      showError('Errore nel caricamento degli articoli');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      codiceArticolo: '',
      descrizione: '',
      voceDoganale: '',
      um: '',
      prezzoUnitario: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (article: Article) => {
    setEditingId(article.id);
    setFormData(article);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.codiceArticolo?.trim()) {
        showError('Codice articolo obbligatorio');
        return;
      }

      if (editingId) {
        await exportApi.updateArticleMaster(editingId, formData);
        showSuccess('Articolo aggiornato con successo');
      } else {
        await exportApi.createArticleMaster(formData as any);
        showSuccess('Articolo creato con successo');
      }

      setShowModal(false);
      fetchArticles();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nel salvataggio');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo articolo?')) return;

    try {
      await exportApi.deleteArticleMaster(id);
      showSuccess('Articolo eliminato con successo');
      fetchArticles();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore nell\'eliminazione');
    }
  };

  const filteredArticles = articles.filter((a) =>
    a.codiceArticolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.voceDoganale?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-orange-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <PageHeader
        title="Articoli Master"
        subtitle="Catalogo articoli con voci doganali e prezzi"
      />

      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/', icon: 'fa-home' },
          { label: 'Export', href: '/export' },
          { label: 'Articoli' },
        ]}
      />

      {/* Toolbar */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Cerca per codice, descrizione o voce doganale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <i className="fas fa-plus mr-2"></i>
            Nuovo Articolo
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Totale articoli:</span>
              <span className="font-bold text-gray-900 dark:text-white">{articles.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Risultati filtrati:</span>
              <span className="font-bold text-gray-900 dark:text-white">{filteredArticles.length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Codice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Descrizione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Voce Doganale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  UM
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Prezzo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {paginatedArticles.map((article, index) => (
                  <motion.tr
                    key={article.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                          {article.codiceArticolo.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {article.codiceArticolo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {article.descrizione || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-white">
                        {article.voceDoganale || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {article.um || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {article.prezzoUnitario ? `€ ${Number(article.prezzoUnitario).toFixed(3)}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(article)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3 hover:scale-110 transition-transform"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:scale-110 transition-transform"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredArticles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500 dark:text-gray-400"
            >
              <i className="fas fa-box-open text-4xl mb-3 opacity-50"></i>
              <p className="font-medium">Nessun articolo trovato</p>
              <p className="text-sm mt-1">Prova a modificare i criteri di ricerca</p>
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        {filteredArticles.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredArticles.length}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className={`fas ${editingId ? 'fa-edit' : 'fa-plus-circle'} text-orange-500`}></i>
                  {editingId ? 'Modifica Articolo' : 'Nuovo Articolo'}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Codice Articolo *
                  </label>
                  <input
                    type="text"
                    value={formData.codiceArticolo}
                    onChange={(e) => setFormData({ ...formData, codiceArticolo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="es. ART001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={formData.descrizione || ''}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Descrizione articolo"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Voce Doganale
                    </label>
                    <input
                      type="text"
                      value={formData.voceDoganale || ''}
                      onChange={(e) => setFormData({ ...formData, voceDoganale: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                      placeholder="56031480"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      UM
                    </label>
                    <input
                      type="text"
                      value={formData.um || ''}
                      onChange={(e) => setFormData({ ...formData, um: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="PZ, KG, MT"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prezzo €
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.prezzoUnitario || 0}
                      onChange={(e) => setFormData({ ...formData, prezzoUnitario: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end bg-gray-50 dark:bg-gray-900/30 rounded-b-2xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <i className="fas fa-times mr-2"></i>
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <i className="fas fa-save mr-2"></i>
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
