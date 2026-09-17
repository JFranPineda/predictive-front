import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  /** Right-align numbers; it is what makes a column of figures readable. */
  numeric?: boolean;
  width?: string;
  render: (row: T) => ReactNode;
}

/**
 * One table style for the whole product. Screens were each inventing their
 * own spacing and alignment, which is most of why the data read as noise.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={clsx(
                  'whitespace-nowrap px-3 py-2 font-medium',
                  column.numeric ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'border-b border-slate-100 dark:border-slate-800/60',
                onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx(
                    'px-3 py-2.5 align-middle',
                    column.numeric && 'text-right tabular-nums',
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
