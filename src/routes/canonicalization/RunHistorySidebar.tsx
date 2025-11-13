import { InfoTooltip } from '../../components/InfoTooltip';
import { Button } from '../../components/ui/button';
import { DEFAULT_PARAMS } from './constants';
import { OPTIMIZATION_GOAL_DETAILS } from './copy';
import type { CanonicalizationRunRow, ParameterState } from './types';
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
          const label = `${formatModeLabel(run.mode)}`;
          const isDisabled = run.status !== 'succeeded';
          const params = (run.params ?? {}) as Partial<ParameterState>;
          const useAutoK = params.useAutoK ?? DEFAULT_PARAMS.useAutoK;
          const targetCount = params.targetCanonicalCount ?? DEFAULT_PARAMS.targetCanonicalCount;
          const minClusterSize = params.minClusterSize ?? DEFAULT_PARAMS.minClusterSize;
          const optimizationGoal = params.optimizationGoal ?? DEFAULT_PARAMS.optimizationGoal;
          const optimizationDetails = OPTIMIZATION_GOAL_DETAILS[optimizationGoal];
          const coverage =
            typeof run.metrics?.coverage === 'number'
              ? `${Math.round(run.metrics.coverage * 100)}%`
              : '—';
          const agreementGain =
            typeof run.metrics?.agreementGain === 'number'
              ? `${run.metrics.agreementGain.toFixed(1)} pts`
              : '—';
          const canonicalCount = run.category_labels
            ? Object.keys(run.category_labels).length
            : Array.isArray(run.prevalence)
              ? run.prevalence.length
              : null;
          const assignmentCount = Array.isArray(run.assignments) ? run.assignments.length : null;
          const tooltipContent = (
            <div className="space-y-2 text-xs">
              <div>
                <p className="font-semibold">Parameters</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Algorithm: {formatModeLabel(run.mode)}</li>
                  <li>
                    Category count:{' '}
                    {useAutoK
                      ? `Auto-detect (picked ${targetCount} categories)`
                      : `${targetCount} canonical categories`}
                  </li>
                  <li>
                    Optimization: {optimizationDetails.label} — {optimizationDetails.description}
                  </li>
                  <li>Min cluster size: {minClusterSize}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">Run stats</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Coverage: {coverage}</li>
                  <li>Agreement gain: {agreementGain}</li>
                  <li>Canonical categories: {canonicalCount ?? '—'}</li>
                  <li>Assignments processed: {assignmentCount ?? '—'}</li>
                </ul>
              </div>
            </div>
          );

          return (
            <div key={run.id} className="flex items-start gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (!isDisabled) onSelect(run.id);
                }}
                // disabled={isDisabled}
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
                    {formatShortTimestamp(run.created_at)} · {run.status}
                  </span>
                </div>
                <InfoTooltip
                  label={`Show run details for ${label}`}
                  content={tooltipContent}
                  align="end"
                />
              </Button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
