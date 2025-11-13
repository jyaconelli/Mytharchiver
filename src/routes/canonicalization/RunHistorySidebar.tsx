import { Button } from '../../components/ui/button';
import type { CanonicalizationRunRow } from './types';
import { RUN_LIMIT } from './types';
import { formatModeLabel, formatShortTimestamp } from './utils';

type RunHistorySidebarProps = {
  runs: CanonicalizationRunRow[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
};

export function RunHistorySidebar({ runs, selectedRunId, onSelect }: RunHistorySidebarProps) {
  return (
    <aside
      className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-white/5"
      data-testid="run-history"
    >
      <h3 className="text-lg font-semibold">Historical Runs</h3>
      <p className="text-xs text-muted-foreground">Latest {RUN_LIMIT} results from Supabase.</p>
      <div className="mt-4 space-y-3">
        {runs.length === 0 && (
          <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
        )}
        {runs.map((run) => {
          const label = `${formatModeLabel(run.mode)} · ${formatShortTimestamp(run.created_at)}`;
          const isDisabled = run.status !== 'succeeded';
          return (
            <Button
              key={run.id}
              type="button"
              onClick={() => {
                if (!isDisabled) onSelect(run.id);
              }}
              disabled={isDisabled}
              variant="outline"
              className={`w-full justify-start border px-3 py-8 text-left text-sm transition ${
                run.id === selectedRunId
                  ? 'border-blue-500 bg-blue-50/40 font-semibold dark:bg-blue-500/10'
                  : 'border-border hover:border-blue-300 dark:border-white/5'
              } ${isDisabled ? 'opacity-60' : ''}`}
            >
              <div className="flex w-full flex-col">
                <span>{label}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  Status: {run.status}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
