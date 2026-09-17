import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatPercent } from '@app/i18n/format';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Legend } from '@shared/ui/Legend';
import { Metric, MetricRow } from '@shared/ui/Metric';
import { Page } from '@shared/ui/Page';
import { PageHeader } from '@shared/ui/PageHeader';
import { Spinner } from '@shared/ui/Spinner';

import { barSegments, coverageTone, readableOn } from '../domain/palette';
import type { StatusCount, SummaryNode, TechniqueSummary } from '../domain/types';
import { usePlantSummaryQuery } from '../infrastructure/endpoints';

const TONE_CLASS = { ok: 'text-slate-500', warn: 'text-amber-600', bad: 'text-red-600' } as const;

export default function PlantSummaryPage() {
  const { t } = useTranslation('summaries');
  const { data, isLoading } = usePlantSummaryQuery({ plant: 1 });
  const [technique, setTechnique] = useState<string | null>(null);

  const summaries = data ?? [];
  const active = summaries.find((s) => s.technique_code === technique) ?? summaries[0];
  const totals = useMemo(() => rollUpTotals(active), [active]);

  if (isLoading) return <Spinner label={t('loading')} />;

  return (
    <Page>
      <PageHeader title={t('title')} description={t('subtitle')}>
        {summaries.length > 1 && (
          <div className="flex gap-2">
            {summaries.map((summary) => (
              <button
                key={summary.technique_code}
                onClick={() => setTechnique(summary.technique_code)}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm',
                  summary.technique_code === active?.technique_code
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'border border-slate-300 dark:border-slate-700',
                ].join(' ')}
              >
                {summary.technique_name}
              </button>
            ))}
          </div>
        )}
      </PageHeader>

      <MetricRow>
        <Metric label={t('metric.equipment')} value={totals.total} hint={t('metric.equipmentHint')} />
        {totals.counts.slice(0, 3).map((entry) => (
          <Metric
            key={entry.status.code}
            label={entry.status.name}
            value={entry.count}
            swatch={entry.status.color}
            tone={entry.status.severity >= 30 ? 'bad' : entry.status.severity >= 20 ? 'warn' : 'good'}
          />
        ))}
        <Metric
          label={t('metric.coverage')}
          value={formatPercent(totals.coverage)}
          hint={t('metric.coverageHint')}
          tone={totals.coverage >= 0.9 ? 'good' : totals.coverage >= 0.6 ? 'warn' : 'bad'}
        />
      </MetricRow>

      <Card title={t('legend.title')} description={t('legend.hint')}>
        <p className="mb-3 text-sm text-slate-500">{t('legend.coverage')}</p>
        <Legend
          items={totals.counts.map((entry) => ({
            code: entry.status.code,
            name: entry.status.name,
            color: entry.status.color,
            hint: entry.status.kind === 'availability' ? t('legend.notMeasured') : undefined,
          }))}
        />
      </Card>

      <Card
        title={t('tree.title')}
        description={t('tree.hint')}
        padded={false}
      >
        <div className="hidden border-b border-slate-100 px-4 py-2 text-xs uppercase tracking-wide text-slate-500 md:flex dark:border-slate-800">
          <span className="w-6" />
          <span className="w-24">{t('tree.column.status')}</span>
          <span className="flex-1">{t('tree.column.area')}</span>
          <span className="w-56">{t('tree.column.split')}</span>
          <span className="w-20 text-right">{t('tree.column.total')}</span>
          <span className="w-28 text-right">{t('tree.column.coverage')}</span>
        </div>
        {active && active.nodes.length > 0 ? (
          <ul>
            {active.nodes.map((node) => (
              <NodeRow key={node.key} node={node} depth={0} />
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <EmptyState title={t('empty.title')} body={t('empty.body')} />
          </div>
        )}
      </Card>
    </Page>
  );
}

function NodeRow({ node, depth }: { node: SummaryNode; depth: number }) {
  const { t } = useTranslation('summaries');
  const [open, setOpen] = useState(false);
  const segments = barSegments(node.counts, node.total);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-sm hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
        style={{ paddingLeft: 16 + depth * 20 }}
      >
        <button
          onClick={() => setOpen(!open)}
          disabled={!hasChildren}
          className="w-6 shrink-0 text-slate-400 disabled:opacity-0"
          aria-label={open ? t('collapse') : t('expand')}
        >
          {open ? '▾' : '▸'}
        </button>

        <span
          className="w-24 shrink-0 truncate rounded px-2 py-0.5 text-center text-xs font-semibold"
          style={{ backgroundColor: node.worst.color, color: readableOn(node.worst.color) }}
        >
          {node.worst.name}
        </span>

        <span className={depth === 0 ? 'flex-1 font-medium' : 'flex-1 text-slate-600 dark:text-slate-300'}>
          {node.label}
        </span>

        <span className="flex h-2 w-56 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {segments.map((segment) => (
            <span
              key={segment.code}
              title={segment.label}
              style={{ width: `${segment.percent}%`, backgroundColor: segment.color }}
            />
          ))}
        </span>

        <span className="w-20 shrink-0 text-right tabular-nums text-slate-500">
          {t('equipmentCount', { count: node.total })}
        </span>
        <span
          className={`w-28 shrink-0 text-right text-xs tabular-nums ${TONE_CLASS[coverageTone(node)]}`}
          title={t('metric.coverageHint')}
        >
          {t('measured', { percent: formatPercent(node.coverage) })}
        </span>
      </div>

      {open && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <NodeRow key={child.key} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function rollUpTotals(summary: TechniqueSummary | undefined) {
  const nodes = summary?.nodes ?? [];
  const total = nodes.reduce((sum, node) => sum + node.total, 0);
  const evaluated = nodes.reduce((sum, node) => sum + node.evaluated, 0);
  const tally = new Map<string, StatusCount>();
  for (const node of nodes) {
    for (const entry of node.counts) {
      const current = tally.get(entry.status.code);
      tally.set(entry.status.code, {
        status: entry.status,
        count: (current?.count ?? 0) + entry.count,
      });
    }
  }
  return {
    total,
    evaluated,
    coverage: total ? evaluated / total : 0,
    counts: [...tally.values()].sort((a, b) => b.status.severity - a.status.severity),
  };
}
