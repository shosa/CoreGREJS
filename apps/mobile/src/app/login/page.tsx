'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { mobileApi } from '@/lib/api';

interface Operator {
  id: number;
  user: string;
  full_name: string;
  reparto: string;
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [error, setError] = useState('');

  // Redirect se già autenticato
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/menu');
    }
  }, [isAuthenticated, router]);

  // Carica lista operatori
  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      setLoadingOperators(true);
      const response = await mobileApi.getOperators('mobile');
      if (response.status === 'success' && Array.isArray(response.data)) {
        setOperators(response.data);
      } else {
        setError('Errore caricamento operatori');
      }
    } catch (err: any) {
      console.error('Error loading operators:', err);
      setError('Impossibile caricare gli operatori');
    } finally {
      setLoadingOperators(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOperator || !pin) {
      setError('Seleziona un operatore e inserisci il PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mobileApi.login(selectedOperator, pin, 'mobile');

      if (response.status === 'success' && response.data) {
        setAuth(response.data);
        router.push('/menu');
      } else {
        setError(response.message || 'Credenziali non valide');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  if (loadingOperators) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-blue-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-blue-600 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CoreGRE | In Work</h1>
      
        </div>

        {/* Login Card */}
        <div className="card-mobile p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Operator Select */}
            <div>
              <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-2">
                Operatore
              </label>
              <select
                id="operator"
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="input-mobile"
                disabled={loading}
              >
                <option value="">Seleziona operatore</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.user}>
                    {op.full_name} ({op.user})
                  </option>
                ))}
              </select>
            </div>

            {/* PIN Input */}
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="input-mobile"
                placeholder="Inserisci il PIN"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !selectedOperator || !pin}
              className="btn-mobile btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accesso in corso...
                </span>
              ) : (
                'Accedi'
              )}
            </button>
          </form>
        </div>

       
      </div>
    </div>
  );
}
