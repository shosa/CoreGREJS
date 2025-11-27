interface StatusBadgeProps {
  completa: boolean;
}

export default function StatusBadge({ completa }: StatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        completa
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      }`}
    >
      {completa ? 'Completata' : 'Aperta'}
    </span>
  );
}
