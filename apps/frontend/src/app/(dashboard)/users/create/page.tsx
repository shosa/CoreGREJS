'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    userName: '',
    nome: '',
    mail: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      showError('Le password non coincidono');
      return;
    }
    if (formData.password.length < 6) {
      showError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      await usersApi.create({
        userName: formData.userName,
        nome: formData.nome,
        mail: formData.mail,
        password: formData.password,
      });
      showSuccess('Utente creato con successo');
      router.push('/users');
    } catch (error: any) {
      showError(error.response?.data?.message || 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch =
    formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordMismatch =
    formData.confirmPassword && formData.password !== formData.confirmPassword;

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
          title="Nuovo Utente"
          subtitle="Aggiungi un nuovo utente al sistema"
        />
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/', icon: 'fa-home' },
            { label: 'Gestione Utenti', href: '/users' },
            { label: 'Nuovo Utente' },
          ]}
        />
      </motion.div>

      {/* Body: sidebar + form */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0 mt-4"
      >
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-60 shrink-0 flex-col gap-3 overflow-y-auto">
          {/* Info card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Informazioni
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Crea un nuovo account utente. Dopo la creazione potrai assegnare i permessi di accesso ai moduli.
            </p>
            <Link
              href="/users"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <i className="fas fa-arrow-left text-xs w-4 text-center"></i>
              Torna alla Lista
            </Link>
          </div>

          {/* Requirements */}
          <div className="rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Requisiti
            </p>
            <div className="space-y-1.5">
              {[
                { label: 'Username univoco', ok: formData.userName.length > 0 },
                { label: 'Nome completo', ok: formData.nome.length > 0 },
                { label: 'Email valida', ok: formData.mail.includes('@') },
                { label: 'Password min. 6 caratteri', ok: formData.password.length >= 6 },
                { label: 'Password coincidenti', ok: !!passwordMatch },
              ].map((req) => (
                <div key={req.label} className="flex items-center gap-2">
                  <i
                    className={`fas ${req.ok ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300 dark:text-gray-600'} text-xs`}
                  ></i>
                  <span className={`text-xs ${req.ok ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Form area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow">
          {/* Toolbar */}
          <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <i className="fas fa-user-plus text-green-500 text-sm"></i>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Dati Utente
            </span>
          </div>

          {/* Scrollable form content */}
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
                      placeholder="es: mario.rossi"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Username univoco per l'accesso</p>
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
                      placeholder="Mario Rossi"
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
                      placeholder="mario@example.com"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Credenziali */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <i className="fas fa-key text-orange-500"></i>
                  Credenziali di Accesso
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
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
                      Conferma Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
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
            <div className="shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
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
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-2 text-sm font-medium text-white shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <motion.i
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="fas fa-spinner"
                    />
                    Creazione…
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus text-xs"></i>
                    Crea Utente
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
