'use client';

import { useState, useRef, useEffect } from 'react';
import { qualityApi } from '@/lib/api';

interface ExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eccezione: any) => void;
  eccezione?: any;
  options: {
    taglie?: Array<{ nome: string }> | string[];
    calzate?: string[];
    difetti?: Array<{ id: number; descrizione: string; categoria?: string }>;
  };
  cartollinoData?: any;
}

export default function ExceptionModal({
  isOpen,
  onClose,
  onSave,
  eccezione = null,
  options = {},
  cartollinoData = {},
}: ExceptionModalProps) {
  const [formData, setFormData] = useState({
    taglia: eccezione?.taglia || '',
    tipo_difetto: eccezione?.tipo_difetto || '',
    note_operatore: eccezione?.note_operatore || '',
    fotoPath: eccezione?.fotoPath || '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(eccezione?.photoPreview || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (eccezione) {
      setFormData({
        taglia: eccezione.taglia || '',
        tipo_difetto: eccezione.tipo_difetto || '',
        note_operatore: eccezione.note_operatore || '',
        fotoPath: eccezione.fotoPath || '',
      });
      setPhotoPreview(eccezione.photoPreview || null);
    }
  }, [eccezione]);

  if (!isOpen) return null;

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selezionato:', file.name, file.type, file.size);

      if (file.size > 5 * 1024 * 1024) {
        setError('La foto non può superare i 5MB');
        return;
      }

      // Controlla che sia effettivamente un'immagine
      if (!file.type.startsWith('image/')) {
        setError('Il file selezionato non è un\'immagine valida');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result as string;
        console.log('Immagine caricata, lunghezza:', result?.length);
        if (result) {
          setPhotoPreview(result);
          setError('');
        } else {
          setError('Errore nel caricamento dell\'immagine');
        }
      };

      reader.onerror = (error) => {
        console.error('Errore FileReader:', error);
        setError('Errore nella lettura del file');
      };

      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData({ ...formData, fotoPath: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!formData.taglia) {
      setError('Seleziona una taglia');
      return;
    }
    if (!formData.tipo_difetto) {
      setError('Seleziona un tipo di difetto');
      return;
    }

    try {
      let photoPath = formData.fotoPath;

      if (photoFile) {
        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('photo', photoFile);
        formDataUpload.append(
          'cartellino_id',
          cartollinoData?.numero || cartollinoData?.cartellino || ''
        );
        formDataUpload.append('tipo_difetto', formData.tipo_difetto);
        formDataUpload.append('calzata', formData.taglia);
        formDataUpload.append('note', formData.note_operatore);

        const uploadResponse = await qualityApi.uploadPhoto(formDataUpload);

        if (uploadResponse.status === 'success') {
          photoPath = uploadResponse.data.filename;
        } else {
          throw new Error(uploadResponse.message || 'Errore upload foto');
        }
      }

      onSave({
        ...formData,
        fotoPath: photoPath,
        photoPreview: photoPreview,
        id: eccezione?.id || Date.now(),
      });

      onClose();
    } catch (err: any) {
      console.error('Errore salvataggio eccezione:', err);
      setError(err.message || 'Errore nel salvataggio');
    } finally {
      setUploading(false);
    }
  };

  const difettoSelezionato = options.difetti?.find(
    (d) => d.id === parseInt(formData.tipo_difetto)
  );

  const taglieList =
    options.taglie && options.taglie.length > 0 ? options.taglie : options.calzate || [];

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              {eccezione ? 'Modifica Eccezione' : 'Nuova Eccezione'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Taglia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taglia <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {taglieList.map((taglia, index) => {
                    const tagliaValue = typeof taglia === 'string' ? taglia : taglia.nome;
                    const isSelected = formData.taglia === tagliaValue;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData({ ...formData, taglia: tagliaValue })}
                        className={`px-2 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {tagliaValue}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo Difetto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Difetto <span className="text-red-600">*</span>
                </label>
                <select
                  className="input-mobile"
                  value={formData.tipo_difetto}
                  onChange={(e) => setFormData({ ...formData, tipo_difetto: e.target.value })}
                  required
                >
                  <option value="">Seleziona difetto...</option>
                  {(options.difetti || []).map((difetto) => (
                    <option key={difetto.id} value={difetto.id}>
                      {difetto.descrizione} {difetto.categoria ? `(${difetto.categoria})` : ''}
                    </option>
                  ))}
                </select>
                {difettoSelezionato && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    Categoria: {difettoSelezionato.categoria || 'N/A'}
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Operatore
                </label>
                <textarea
                  className="input-mobile resize-none"
                  value={formData.note_operatore}
                  onChange={(e) => setFormData({ ...formData, note_operatore: e.target.value })}
                  placeholder="Descrivi il difetto in dettaglio..."
                  rows={4}
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Difetto</label>

                {!photoPreview ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Camera Button */}
                    <button
                      type="button"
                      className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Scatta Foto</span>
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoCapture}
                      />
                    </button>

                    {/* Gallery Button */}
                    <button
                      type="button"
                      className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Galleria</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoCapture}
                      />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <img
                        src={photoPreview || ''}
                        alt="Preview"
                        className="w-full h-auto max-h-96 object-contain"
                        onLoad={() => console.log('Immagine renderizzata con successo')}
                        onError={(e) => console.error('Errore rendering immagine:', e)}
                      />
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      onClick={removePhoto}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Rimuovi Foto
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">Massimo 5MB - Tutti i formati</p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Upload...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salva
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
