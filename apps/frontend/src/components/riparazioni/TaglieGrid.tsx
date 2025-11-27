interface TaglieGridProps {
  numerata?: {
    n01?: string;
    n02?: string;
    n03?: string;
    n04?: string;
    n05?: string;
    n06?: string;
    n07?: string;
    n08?: string;
    n09?: string;
    n10?: string;
    n11?: string;
    n12?: string;
    n13?: string;
    n14?: string;
    n15?: string;
    n16?: string;
    n17?: string;
    n18?: string;
    n19?: string;
    n20?: string;
  };
  values: {
    [key: string]: number;
  };
  onChange?: (field: string, value: number) => void;
  readonly?: boolean;
}

export default function TaglieGrid({
  numerata,
  values,
  onChange,
  readonly = false,
}: TaglieGridProps) {
  const taglie = [];

  // Loop 1-20 per creare array
  for (let i = 1; i <= 20; i++) {
    const pField = `p${String(i).padStart(2, '0')}`;
    const nField = `n${String(i).padStart(2, '0')}` as keyof typeof numerata;
    const nomeTaglia = numerata?.[nField] || `T${i}`;
    const quantita = values[pField] || 0;

    // Salta taglie con qta=0 in readonly mode
    if (readonly && quantita === 0) continue;

    taglie.push({
      numero: i,
      nome: nomeTaglia,
      field: pField,
      quantita,
    });
  }

  return (
    <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
      {taglie.map((t) => (
        <div key={t.field} className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            {t.nome}
          </label>
          {readonly ? (
            <div className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-center text-sm font-bold text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {t.quantita}
            </div>
          ) : (
            <input
              type="number"
              min="0"
              value={t.quantita}
              onChange={(e) => onChange?.(t.field, parseInt(e.target.value) || 0)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-center text-sm font-bold text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          )}
        </div>
      ))}
    </div>
  );
}
