'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import { showSuccess, showError } from '@/store/notifications';
import PageHeader from '@/components/layout/PageHeader';
import Breadcrumb from '@/components/layout/Breadcrumb';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMailPassword, setShowMailPassword] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    userName: '',
    nome: '',
    mail: '',
    mailPassword: '',
    password: '',
    confirmPassword: '',
  });

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
        showError("Errore nel caricamento dell'utente");
        router.push('/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (formData.mailPassword) updateData.mailPassword = formData.mailPassword;
      if (formData.password) updateData.password = formData.password;

      await usersApi.update(userId, updateData);
      showSuccess('Utente aggiornato con successo');
      router.push('/users');
    } catch (error: any) {
      showError(error.response?.data?.message || "Errore durante l'aggiornamento");
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
      showError("Errore durante l'eliminazione");
    }
  };

  const passwordMatch =
    formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordMismatch =
    formData.confirmPassword && formData.password !== formData.confirmPassword;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="shrink-0">
        <PageHeader
          title="Modifica Utente"
          subtitle={`Modifica le informazioni di ${userInfo?.nome}`}
        />
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/', icon: 'fa-home' },
            { label: 'Gestione Utenti', href: '/users' },
            { label: `Modifica ${userInfo?.nome}` },
          ]}
        />
      </motion.div>

      {/* Body */}
      <motion.div
        variants={itemVariants}
        className="flex flex-1 gap-4 overflow-hidden min-h-0 mt-4"
      >
        {/* Sidebar */}
        <aside className="w-60 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* User info card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow">
                <span className="text-sm font-bold text-white">
                  {userInfo?.nome?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userInfo?.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{userInfo?.userName}</p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>ID</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">#{userId}</span>
              </div>
              <div className="flex justify-between">
                <span>Creato il</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {userInfo?.createdAt
                    ? new Date(userInfo.createdAt).toLocaleDateString('it-IT')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ultimo accesso</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {userInfo?.lastLogin
                    ? new Date(userInfo.lastLogin).toLocaleDateString('it-IT')
                    : 'Mai'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick nav */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Navigazione
            </p>
            <Link
              href={`/users/${userId}/permissions`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <i className="fas fa-user-cog text-xs w-4 text-center"></i>
              Gestisci Permessi
            </Link>
            <Link
              href="/users"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <i className="fas fa-arrow-left text-xs w-4 text-center"></i>
              Torna alla Lista
            </Link>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-red-200 dark:border-red-900/40 shadow p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">
              Zona Pericolosa
            </p>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <i className="fas fa-trash-alt text-xs w-4 text-center"></i>
              Elimina Utente
            </button>
          </div>
        </aside>

        {/* Form area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
          {/* Toolbar */}
          <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <i className="fas fa-user-edit text-blue-500 text-sm"></i>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Modifica Informazioni
            </span>
          </div>

          {/* Scrollable form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Dati principali */}
              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <i className="fas fa-id-card text-blue-500"></i>
                  Informazioni Personali
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="mail"
                      value={formData.mail}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Password Email SMTP
                    </label>
                    <div className="relative">
                      <input
                        type={showMailPassword ? 'text' : 'password'}
                        name="mailPassword"
                        value={formData.mailPassword}
                        onChange={handleChange}
                        placeholder="Vuoto = non modificare"
                        className={inputClass + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMailPassword(!showMailPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <i className={`fas ${showMailPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Usata per autenticare l'invio email tramite SMTP
                    </p>
                  </div>
                </div>
              </div>

              {/* Cambio password */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <i className="fas fa-key text-orange-500"></i>
                  Cambia Password
                  <span className="text-gray-400 font-normal normal-case">(opzionale)</span>
                </h4>
                <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                  Lascia i campi vuoti per mantenere la password attuale
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Nuova Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        minLength={6}
                        placeholder="Minimo 6 caratteri"
                        className={inputClass + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Conferma Nuova Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        minLength={6}
                        placeholder="Ripeti la password"
                        className={
                          inputClass +
                          ' pr-10 ' +
                          (passwordMismatch
                            ? 'border-red-400 focus:ring-red-500'
                            : passwordMatch
                            ? 'border-green-400 focus:ring-green-500'
                            : '')
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                      </button>
                    </div>
                    {passwordMismatch && (
                      <p className="mt-1 text-xs text-red-500">Le password non coincidono</p>
                    )}
                    {passwordMatch && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                        <i className="fas fa-check mr-1"></i>Password coincidenti
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <Link href="/users">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <i className="fas fa-times mr-2"></i>Annulla
                </button>
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <motion.i
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="fas fa-spinner"
                    />
                    Salvataggio…
                  </>
                ) : (
                  <>
                    <i className="fas fa-save text-xs"></i>
                    Salva Modifiche
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
