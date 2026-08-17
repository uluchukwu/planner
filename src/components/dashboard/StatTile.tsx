export function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3">
      <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-ink mt-0.5">{value}</p>
      {sublabel && <p className="text-xs text-ink-soft mt-0.5">{sublabel}</p>}
    </div>
  );
}
