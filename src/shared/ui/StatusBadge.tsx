import clsx from 'clsx';

/** Condition states are configurable server-side (T12), so the colour comes
 * from the data and only the shape is hardcoded here. */
export function StatusBadge({
  label,
  color,
  size = 'md',
}: {
  label: string;
  color: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        'ring-1 ring-inset ring-black/5',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
      )}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
