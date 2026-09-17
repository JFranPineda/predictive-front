import type { StatusCount, SummaryNode } from './types';

/**
 * Colours come from the server (each status carries its own, configurable in
 * Configuración > Estados). The frontend only decides how to *use* them, so a
 * company that repaints ALARMA does not need a release.
 */
export function barSegments(counts: StatusCount[], total: number): {
  code: string;
  color: string;
  percent: number;
  label: string;
}[] {
  if (total === 0) return [];
  return counts.map((entry) => ({
    code: entry.status.code,
    color: entry.status.color,
    percent: (entry.count / total) * 100,
    label: `${entry.status.name}: ${entry.count}`,
  }));
}

/**
 * Text that stays legible on the status colour. Picks whichever of the two ink
 * colours has the higher WCAG contrast ratio rather than guessing from a
 * brightness threshold — amber and red sit on opposite sides of any threshold
 * you would pick, and both are status colours here.
 */
const INK_DARK = '#0f172a';
const INK_LIGHT = '#ffffff';

export function readableOn(hex: string): typeof INK_DARK | typeof INK_LIGHT {
  const background = luminance(hex);
  return contrast(background, luminance(INK_DARK)) >= contrast(background, luminance(INK_LIGHT))
    ? INK_DARK
    : INK_LIGHT;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Coverage is shown next to the colour on purpose: a green area that was only
 * half measured is a planning problem wearing a healthy colour. */
export function coverageTone(node: SummaryNode): 'ok' | 'warn' | 'bad' {
  if (node.coverage >= 0.9) return 'ok';
  return node.coverage >= 0.6 ? 'warn' : 'bad';
}

export function flatten(nodes: SummaryNode[], depth = 0): { node: SummaryNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)]);
}
