'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function MainMenuPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const selectModule = useAuthStore((state) => state.selectModule);
  const hasModule = useAuthStore((state) => state.hasModule);

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
    if (confirm('Sei sicuro di voler uscire?')) {
      logout();
      router.replace('/login');
    }
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
    </div>
  );
}
