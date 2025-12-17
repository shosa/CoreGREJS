'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function QualityMainPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const selectedModule = useAuthStore((state) => state.selectedModule);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (selectedModule !== 'quality') {
      router.replace('/menu');
    }
  }, [isAuthenticated, selectedModule, router]);

  const handleAction = (action: string) => {
    if (action === 'insert') {
      router.push('/quality/insert');
    } else if (action === 'summary') {
      router.push('/quality/summary');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md z-50">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.push('/menu')}
            className="p-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Controllo Qualità</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-6 px-4">
        {/* Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 px-1">Azioni Disponibili</h2>

          {/* Insert Quality Control */}
          <button
            onClick={() => handleAction('insert')}
            className="w-full card-mobile p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 text-blue-600 rounded-full p-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Inserisci Controllo</h3>
                <p className="text-sm text-gray-600">Nuovo controllo qualità su cartellino</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Daily Summary */}
          <button
            onClick={() => handleAction('summary')}
            className="w-full card-mobile p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 text-green-600 rounded-full p-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Riepilogo Giornaliero</h3>
                <p className="text-sm text-gray-600">Controlli effettuati oggi</p>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Footer con info operatore */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 text-green-600 rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{user.full_name}</p>
              <p className="text-xs text-gray-500">{user.reparto}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
