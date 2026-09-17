export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-500">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  );
}
