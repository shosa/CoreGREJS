'use client';

import { useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string | number;
  onChange: (value: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  align?: 'left' | 'right' | 'center';
}

export default function EditableCell({
  value,
  onChange,
  isLoading = false,
  readOnly = false,
  align = 'left',
}: EditableCellProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && divRef.current.textContent !== String(value)) {
      divRef.current.textContent = String(value);
    }
  }, [value]);

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
  const bgClass = readOnly ? 'bg-gray-100 dark:bg-gray-700' : 'hover:border-blue-300 focus:border-blue-500';

  if (readOnly) {
    return <div className={`${textAlignClass}`}>{value}</div>;
  }

  return (
    <div className="relative">
      <div
        ref={divRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={`
          min-h-[1.5rem] p-2 rounded border-2 border-transparent
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
