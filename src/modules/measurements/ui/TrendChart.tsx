import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate, formatNumber } from '@app/i18n/format';
import { useTheme } from '@app/theme/useTheme';

import type { MatrixBlock, MatrixColumn } from '../domain/matrix';
import {
  buildSeries,
  defaultSelection,
  MAX_SERIES,
  pointOptions,
  togglePoint,
  toggleSeries,
  type ChartSeries,
} from '../domain/trendChart';

// Only the pieces this chart draws: the full bundle is an order of magnitude
// larger and lands in the shared vendor chunk.
echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const DASH: Record<string, number | number[]> = {
  solid: 0,
  dashed: [7, 4],
  dotted: [2, 4],
};

/**
 * Section VI of the report: the trend, but legible.
 *
 * One chart per magnitude and never two scales on one axis — mm/s and gE on
 * the same y is how an envelope reading of 0.9 disappears under a velocity of
 * 12.
 */
export function TrendChart({ block, columns }: { block: MatrixBlock; columns: MatrixColumn[] }) {
  const { t, i18n } = useTranslation('measurements');
  const { resolved } = useTheme();

  const series = useMemo(() => buildSeries(block, resolved), [block, resolved]);
  const options = useMemo(() => pointOptions(series), [series]);
  const [selected, setSelected] = useState<string[]>(() => defaultSelection(series));

  const shown = useMemo(
    () => selected.map((id) => series.find((row) => row.id === id)).filter(Boolean) as ChartSeries[],
    [selected, series],
  );
  const full = selected.length >= MAX_SERIES;

  if (series.length === 0 || columns.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('chart.title')}
        </h3>
        <p className="text-xs text-slate-400">{t('chart.hint', { max: MAX_SERIES })}</p>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums ${
            full
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {t('chart.counter', { count: selected.length, max: MAX_SERIES })}
        </span>
      </header>

      <Selector
        options={options}
        selected={selected}
        full={full}
        onToggleAxis={(id) => setSelected((rows) => toggleSeries(rows, id))}
        onTogglePoint={(option) => setSelected((rows) => togglePoint(rows, option))}
      />

      <Canvas
        series={shown}
        columns={columns}
        unit={block.unit}
        decimals={block.decimals}
        locale={i18n.language}
        mode={resolved}
        emptyLabel={t('chart.pickOne')}
      />
    </section>
  );
}

/**
 * The machine, as a set of switches.
 *
 * Grouped by component and then by point, because that is how the analyst
 * names what is being compared — "the motor's point one, all three axes".
 */
function Selector({
  options,
  selected,
  full,
  onToggleAxis,
  onTogglePoint,
}: {
  options: ReturnType<typeof pointOptions>;
  selected: string[];
  full: boolean;
  onToggleAxis: (id: string) => void;
  onTogglePoint: (option: ReturnType<typeof pointOptions>[number]) => void;
}) {
  const { t } = useTranslation('measurements');
  const components = [...new Set(options.map((option) => option.component))];

  return (
    <div className="mb-4 flex flex-wrap items-start gap-x-6 gap-y-3">
      {components.map((component) => (
        <div key={component}>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {component}
          </p>
          <div className="flex flex-wrap gap-2">
            {options
              .filter((option) => option.component === component)
              .map((option) => {
                const on = option.axes.filter((row) => selected.includes(row.seriesId)).length;
                return (
                  <div
                    key={option.number}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <button
                      onClick={() => onTogglePoint(option)}
                      disabled={!on && full}
                      title={t('chart.togglePoint', { point: option.number })}
                      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: option.color, opacity: on ? 1 : 0.35 }}
                      />
                      {option.number}
                    </button>
                    {/* No letter when there is no axis: the point itself is
                        the whole switch. */}
                    {option.axes
                      .filter(({ axis }) => axis !== '')
                      .map(({ axis, seriesId }) => {
                      const active = selected.includes(seriesId);
                      return (
                        <button
                          key={seriesId}
                          onClick={() => onToggleAxis(seriesId)}
                          disabled={!active && full}
                          aria-pressed={active}
                          title={t(`chart.axis.${axis}`, { defaultValue: axis })}
                          className={`size-6 rounded text-[11px] font-semibold transition-colors ${
                            active
                              ? 'text-white'
                              : full
                                ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
                                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                          style={active ? { backgroundColor: option.color } : undefined}
                        >
                          {axis}
                        </button>
                      );
                      })}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The canvas itself. ECharts owns the DOM node; React owns the option. */
function Canvas({
  series,
  columns,
  unit,
  decimals,
  locale,
  mode,
  emptyLabel,
}: {
  series: ChartSeries[];
  columns: MatrixColumn[];
  unit: string;
  decimals: number;
  locale: string;
  mode: 'light' | 'dark';
  emptyLabel: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!host.current) return undefined;
    chart.current = echarts.init(host.current, undefined, { renderer: 'canvas' });
    const observer = new ResizeObserver(() => chart.current?.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
    // The instance is created once; the theme is applied through the option.
  }, []);

  useEffect(() => {
    if (!chart.current) return;
    chart.current.setOption(
      buildOption({ series, columns, unit, decimals, locale, mode }),
      // Replace rather than merge: a removed series has to leave the chart.
      { notMerge: true },
    );
  }, [series, columns, unit, decimals, locale, mode]);

  return (
    <div className="relative">
      <div ref={host} className="h-72 w-full" role="img" />
      {series.length === 0 && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

function buildOption({
  series,
  columns,
  unit,
  decimals,
  locale,
  mode,
}: {
  series: ChartSeries[];
  columns: MatrixColumn[];
  unit: string;
  decimals: number;
  locale: string;
  mode: 'light' | 'dark';
}) {
  const ink = mode === 'dark' ? '#94a3b8' : '#64748b';
  const grid = mode === 'dark' ? '#1e293b' : '#e2e8f0';
  const surface = mode === 'dark' ? '#0f172a' : '#ffffff';

  return {
    animationDuration: 300,
    grid: { top: 28, right: 64, bottom: 28, left: 52 },
    // A crosshair is what turns "which round was that" into a glance.
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: ink } },
      backgroundColor: surface,
      borderColor: grid,
      textStyle: { color: mode === 'dark' ? '#e2e8f0' : '#0f172a', fontSize: 12 },
      valueFormatter: (value: number | null) =>
        value === null ? '—' : `${formatNumber(value, decimals)} ${unit}`,
    },
    legend: {
      // Always on: for two series or more, identity is never colour alone.
      show: series.length > 0,
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: ink, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: columns.map((column) => formatDate(column.date, locale)),
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: { color: ink, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { color: ink, fontSize: 11, align: 'left' },
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: ink, fontSize: 11 },
    },
    series: series.map((row) => ({
      name: row.label,
      type: 'line' as const,
      smooth: false,
      connectNulls: true,
      symbol: row.symbol,
      symbolSize: 8,
      lineStyle: { width: 2, color: row.color, type: DASH[row.dash] },
      itemStyle: { color: row.color, borderColor: surface, borderWidth: 2 },
      // Direct label at the end of the line: three of the light hues sit under
      // 3:1 on white, and a labelled line does not depend on the legend.
      endLabel: {
        show: true,
        color: row.color,
        fontSize: 11,
        fontWeight: 600,
        formatter: row.label,
      },
      emphasis: { focus: 'series' as const },
      data: row.points.map((point) => ({
        value: point.value,
        // The reading's own verdict, on the marker only: the line keeps the
        // series colour, so state never competes with identity.
        itemStyle:
          point.statusColor && point.statusCode !== 'operational'
            ? { color: point.statusColor, borderColor: surface, borderWidth: 2 }
            : undefined,
        symbolSize: point.statusCode && point.statusCode !== 'operational' ? 11 : 8,
      })),
    })),
  };
}
