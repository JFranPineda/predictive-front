/** What the server said about a kind, in the shapes DRF wraps it in. */
export function readKindError(cause: unknown): string | null {
  const data = (cause as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return String(data[0]);
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return null;
}

export interface TemplateProblem {
  message: string;
  rows: number[];
}

/** The template's problems, each with the rows that cause it. */
export function readTemplateProblems(cause: unknown): TemplateProblem[] {
  const data = (cause as { data?: { problems?: { message: string; rows: (string | number)[] }[] } })
    ?.data;
  return (data?.problems ?? []).map((problem) => ({
    message: String(problem.message),
    rows: problem.rows.map(Number),
  }));
}
