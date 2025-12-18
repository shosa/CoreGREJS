'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function MainMenuPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const selectModule = useAuthStore((state) => state.selectModule);
  const hasModule = useAuthStore((state) => state.hasModule);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const handleSelectModule = (module: string) => {
    selectModule(module);
    router.push(`/${module}`);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!user) {
    return null;
  }

  const modules = [
    {
      id: 'quality',
      name: 'Controllo Qualità',
      description: 'Gestione controlli qualità e difetti',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      enabled: hasModule('quality'),
    },
  ];

  const enabledModules = modules.filter((m) => m.enabled);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="top-bar-mobile">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">CoreGRE | InWork</h1>
            <p className="text-sm text-blue-100">{user.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span className="text-sm font-medium">Esci</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-24 pb-6 px-4">
        {/* User Info Card */}
        <div className="card-mobile p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">{user.full_name}</h2>
              <p className="text-gray-600">Matricola: {user.user}</p>
              <p className="text-sm text-gray-500">Reparto: {user.reparto}</p>
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Seleziona Modulo</h3>

          {enabledModules.length === 0 && (
            <div className="card-mobile p-6 text-center">
              <p className="text-gray-600">Nessun modulo abilitato per questo operatore</p>
              <p className="text-sm text-gray-500 mt-2">Contatta l'amministratore di sistema</p>
            </div>
          )}

          <div className="space-y-4">
            {enabledModules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleSelectModule(module.id)}
                className="w-full"
              >
                <div className={`rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${module.color.startsWith('from-') ? `bg-gradient-to-r ${module.color} text-white` : module.color}`}>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {module.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-xl font-semibold mb-1">{module.name}</h4>
                      <p className="text-sm opacity-90">{module.description}</p>
                    </div>
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-full p-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Conferma Logout</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700">Sei sicuro di voler uscire dall'applicazione?</p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
