import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@app/hooks';
import { useMagnitudesQuery } from '@modules/thresholds';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { TextInput } from '@shared/ui/Form';
import { ErrorState } from '@shared/ui/ErrorState';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { describeMagnitudes } from '../domain/magnitudeGroups';
import type { AssetGroupKind } from '../domain/types';
import { useDeleteGroupKindMutation, useGroupKindsQuery } from '../infrastructure/endpoints';
import { readKindError } from './kindErrors';
import { KindFormModal } from './KindFormModal';

/**
 * Configuración → Tipos de conjunto.
 *
 * A kind is the customer's own taxonomy (Motor+Bomba, Motor+Turbina) *and*
 * the point layout its reports use. Getting the layout right here is what
 * makes a new train produce the rows of `MPd-AV-N°006-13` instead of six
 * generic points somebody has to rename by hand.
 */
export default function GroupKindsPage() {
  const { t } = useTranslation(['assets', 'common']);
  const permissions = useAppSelector((state) => state.session.permissions);
  const canManage = permissions.includes('assets.manage_equipment');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  // A query per keystroke is noise: the search waits for a pause.
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const { data, isLoading, isError, isFetching } = useGroupKindsQuery(q ? { q } : undefined);
  const [remove] = useDeleteGroupKindMutation();
  const [editing, setEditing] = useState<AssetGroupKind | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading && !q) return <Spinner label={t('kinds.loading')} />;

  return (
    <Page>
      <PageHeader
        title={t('kinds.title')}
        description={t('kinds.subtitle')}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {t('kinds.new')}
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <TextInput
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('kinds.searchHint')}
          aria-label={t('kinds.search')}
          className="max-w-md"
        />
        {q && (
          <span className="text-xs text-slate-500">
            {isFetching ? t('common:state.loading') : t('kinds.found', { count: data?.length ?? 0 })}
          </span>
        )}
      </div>

      {error && <ErrorState title={error} />}
      {isError ? (
        <ErrorState title={t('common:state.failed')} body={t('common:state.failedBody')} />
      ) : (data ?? []).length === 0 ? (
        q ? (
          <EmptyState title={t('kinds.noMatch', { q })} body={t('kinds.noMatchHint')} />
        ) : (
          <EmptyState title={t('kinds.empty')} body={t('kinds.emptyBody')} />
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.map((kind) => (
            <Card
              key={kind.id}
              title={kind.name}
              description={kind.description || undefined}
              actions={
                canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button onClick={() => setEditing(kind)}>{t('common:action.edit')}</Button>
                    {!kind.is_builtin && kind.group_count === 0 && (
                      <Button
                        variant="danger"
                        onClick={() => void (async () => {
                          setError(null);
                          try {
                            await remove(kind.id).unwrap();
                          } catch (cause) {
                            setError(readKindError(cause) ?? t('form.genericError'));
                          }
                        })()}
                      >
                        {t('common:action.delete')}
                      </Button>
                    )}
                  </div>
                )
              }
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-slate-400">{kind.code}</span>
                {kind.components.map((component) => (
                  <span
                    key={component.label}
                    className="rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-800"
                  >
                    {component.label}
                  </span>
                ))}
                <span className="ml-auto text-slate-400">
                  {t('kinds.groupCount', { count: kind.group_count })}
                </span>
              </div>

              {kind.matches && kind.matches.length > 0 && <Matches matches={kind.matches} />}
              <PointLayout kind={kind} />
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <KindFormModal
          kind={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </Page>
  );
}

/** Why a kind came up in the search: the trains built from it that matched,
 * with the TAGs that did. */
function Matches({ matches }: { matches: NonNullable<AssetGroupKind['matches']> }) {
  const { t } = useTranslation('assets');
  return (
    <div className="mb-3 rounded-lg bg-sky-50 p-2 text-xs dark:bg-sky-950/40">
      <p className="mb-1 font-medium text-sky-800 dark:text-sky-300">{t('kinds.matchedIn')}</p>
      <ul className="space-y-0.5">
        {matches.map((train) => (
          <li key={train.id} className="text-slate-700 dark:text-slate-300">
            {train.name}
            {train.tags.length > 0 && (
              <span className="ml-2 font-mono text-slate-500">{train.tags.join(' · ')}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The layout as the report reads it: one row per point, columns per axis. */
function PointLayout({ kind }: { kind: AssetGroupKind }) {
  const { t } = useTranslation('assets');
  const catalogue = useMagnitudesQuery().data ?? [];
  const numbers = [...new Set(kind.point_templates.map((row) => row.number))].sort((a, b) => a - b);

  if (numbers.length === 0) {
    return <p className="text-sm text-amber-600">{t('kinds.noLayout')}</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 text-left uppercase tracking-wide text-slate-400 dark:border-slate-800">
          <th className="py-1 pr-3">{t('kinds.column.point')}</th>
          <th className="pr-3">{t('kinds.column.component')}</th>
          <th className="pr-3">{t('kinds.column.side')}</th>
          <th className="pr-3">{t('kinds.column.axes')}</th>
          <th>{t('kinds.column.magnitudes')}</th>
        </tr>
      </thead>
      <tbody>
        {numbers.map((number) => {
          const rows = kind.point_templates.filter((row) => row.number === number);
          const first = rows[0]!;
          const magnitudes = [...new Set(rows.flatMap((row) => row.magnitudes))];
          return (
            <tr key={number} className="border-b border-slate-50 dark:border-slate-800/60">
              <td className="py-1 pr-3 font-mono font-medium">{number}</td>
              <td className="pr-3 text-slate-500">{first.component_label || '—'}</td>
              <td className="pr-3 text-slate-500">{t(`side.${first.side}`, { defaultValue: first.side })}</td>
              <td className="whitespace-nowrap pr-3 font-mono">{rows.map((row) => row.axis).join(' ')}</td>
              <td className="leading-snug text-slate-500">{describeMagnitudes(magnitudes, catalogue) || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
