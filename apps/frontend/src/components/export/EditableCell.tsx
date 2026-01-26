'use client';

import { useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string | number;
  onChange: (value: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  align?: 'left' | 'right' | 'center';
  highlight?: boolean; // Evidenzia la cella in giallo
  maxValue?: number; // Valore massimo consentito (per qtaReale)
  showBorder?: boolean; // Mostra bordo visibile (per campi form)
}

export default function EditableCell({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  align = 'left',
  highlight = false,
  maxValue,
  showBorder = false,
}: EditableCellProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && divRef.current.textContent !== String(value)) {
      divRef.current.textContent = String(value);
    }
  }, [value]);

  const handleInput = () => {
    if (divRef.current && maxValue !== undefined) {
      const currentText = divRef.current.textContent || '';
      // Sostituisci virgola con punto per il parsing
      const numericValue = parseFloat(currentText.replace(',', '.'));

      if (!isNaN(numericValue) && numericValue > maxValue) {
        // Ripristina al valore massimo
        divRef.current.textContent = String(maxValue).replace('.', ',');
        // Sposta il cursore alla fine
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(divRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  const handleBlur = () => {
    if (divRef.current) {
      const newValue = divRef.current.textContent || '';
      if (newValue !== String(value)) {
        onChange(newValue);
      }
    }
  };

  const textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const cursorClass = readOnly ? 'cursor-not-allowed' : '';
  const bgClass = readOnly
    ? 'bg-gray-100 dark:bg-gray-700'
    : highlight
    ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:border-yellow-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20'
    : showBorder
    ? 'bg-white dark:bg-gray-800 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
    : 'hover:border-blue-300 focus:border-blue-500';

  if (readOnly) {
    return (
      <div className={`${textAlignClass} ${highlight ? 'bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded' : ''}`}>
        {value}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={divRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        className={`
          min-h-[1.5rem] p-2 rounded ${showBorder ? 'border border-gray-300 dark:border-gray-600' : 'border-2 border-transparent'}
          ${textAlignClass} ${bgClass}
          focus:outline-none transition-colors
          ${isLoading ? 'opacity-50' : ''}
        `}
      >
        {value}
      </div>
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
