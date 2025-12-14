'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMailPassword, setShowMailPassword] = useState(false);

  const [formData, setFormData] = useState({
    userName: '',
    nome: '',
    mail: '',
    mailPassword: '',
    password: '',
    confirmPassword: '',
  });

  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await usersApi.getOne(userId);
        setFormData({
          userName: user.userName,
          nome: user.nome,
          mail: user.mail || '',
          mailPassword: '',
          password: '',
          confirmPassword: '',
        });
        setUserInfo(user);
      } catch (error) {
        showError('Errore nel caricamento dell\'utente');
        router.push('/users');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        showError('Le nuove password non coincidono');
        return;
      }
      if (formData.password.length < 6) {
        showError('La password deve essere di almeno 6 caratteri');
        return;
      }
    }

    setSaving(true);
    try {
      const updateData: any = {
        userName: formData.userName,
        nome: formData.nome,
        mail: formData.mail,
      };

      if (formData.mailPassword) {
        updateData.mailPassword = formData.mailPassword;
      }

      if (formData.password) {
        updateData.password = formData.password;
      }

      await usersApi.update(userId, updateData);
      showSuccess('Utente aggiornato con successo');
      router.push('/users');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore durante l\'aggiornamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      await usersApi.delete(userId);
      showSuccess('Utente eliminato con successo');
      router.push('/users');
    } catch (error) {
      showError('Errore durante l\'eliminazione');
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
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Modifica Utente
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Modifica le informazioni di {userInfo?.nome}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Link href={`/users/${userId}/permissions`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:bg-gray-800 dark:text-purple-300"
              >
                <i className="fas fa-user-cog mr-2"></i>
                Gestisci Permessi
              </motion.button>
            </Link>
            <Link href="/users">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Torna alla Lista
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">
              <i className="fas fa-home mr-2"></i>Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <Link href="/users" className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">Utenti</Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Modifica {userInfo?.nome}</span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Form */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fas fa-user-edit mr-3 text-blue-500"></i>
            Modifica Informazioni Utente
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="mail"
                value={formData.mail}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Email SMTP
              </label>
              <div className="relative">
                <input
                  type={showMailPassword ? 'text' : 'password'}
                  name="mailPassword"
                  value={formData.mailPassword}
                  onChange={handleChange}
                  placeholder="Password per invio email (lascia vuoto per non modificare)"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowMailPassword(!showMailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <i className={`fas ${showMailPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <i className="fas fa-info-circle mr-1"></i>
                Password utilizzata per autenticare l'invio di email tramite SMTP
              </p>
            </motion.div>
          </div>

          {/* User Info */}
          <motion.div variants={itemVariants} className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">ID Utente:</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">#{userId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Creato il:</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleString('it-IT') : 'Non disponibile'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Ultimo accesso:</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  {userInfo?.lastLogin ? new Date(userInfo.lastLogin).toLocaleString('it-IT') : 'Mai'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Password Section */}
          <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <i className="fas fa-key mr-2 text-orange-500"></i>
              Cambia Password (opzionale)
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Lascia i campi vuoti se non vuoi modificare la password
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nuova Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Inserisci nuova password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Conferma Nuova Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Ripeti nuova password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/users">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                  <i className="fas fa-times mr-2"></i>Annulla
                </motion.button>
              </Link>
              <motion.button
                type="button"
                onClick={handleDelete}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 dark:bg-gray-700 dark:text-red-300"
              >
                <i className="fas fa-trash-alt mr-2"></i>Elimina Utente
              </motion.button>
            </div>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02, y: saving ? 0 : -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md disabled:opacity-50"
            >
              {saving ? (
                <><motion.i animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="fas fa-spinner mr-2" />Salvataggio...</>
              ) : (
                <><i className="fas fa-save mr-2"></i>Salva Modifiche</>
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );
}
