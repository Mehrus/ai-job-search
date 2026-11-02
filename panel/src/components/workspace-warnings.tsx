export function WorkspaceWarnings({ warnings, root }: { warnings: string[]; root: string }) {
  if (warnings.length === 0) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      {warnings.map((w) => (
        <p key={w}>{w}</p>
      ))}
      <p className="mt-1 text-xs opacity-80">
        Katalog danych: <code>{root}</code> (zmienisz go zmienną <code>JOB_SEARCH_ROOT</code>).
      </p>
    </div>
  );
}
