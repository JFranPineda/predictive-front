/** What the colours mean. A traffic light nobody can read is just decoration. */
export function Legend({
  items,
}: {
  items: { code: string; name: string; color: string; hint?: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      {items.map((item) => (
        <li key={item.code} className="flex items-center gap-1.5" title={item.hint}>
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
          {item.hint && <span className="text-slate-400">— {item.hint}</span>}
        </li>
      ))}
    </ul>
  );
}
