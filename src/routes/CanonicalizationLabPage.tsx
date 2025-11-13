import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClockIcon } from 'lucide-react';

import { useArchive } from './ArchiveLayout';
import { CanonicalCategoryList } from './canonicalization/CanonicalCategoryList';
import { DEFAULT_PARAMS } from './canonicalization/constants';
import { ParameterRail } from './canonicalization/ParameterRail';
import { RunHistorySidebar } from './canonicalization/RunHistorySidebar';
import type {
  CanonicalizationRunRow,
  CanonicalizationRunView,
  ParameterState,
} from './canonicalization/types';
import { RUN_LIMIT } from './canonicalization/types';
import {
  buildSummaryCards,
  formatTimestamp,
  transformRunRow,
} from './canonicalization/utils';
import { getParameterEnforcement } from './canonicalization/enforcement';
import { getSupabaseClient } from '../lib/supabaseClient';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { InfoTooltip } from '../components/InfoTooltip';
import type { Myth } from '../types/myth';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

export function CanonicalizationLabPage() {
  const { mythId } = useParams<{ mythId: string }>();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { myths, isInitialLoad, loadArchiveData } = useArchive();
  const myth = myths.find((candidate) => candidate.id === mythId) ?? null;

  const [params, setParams] = useState<ParameterState>(DEFAULT_PARAMS);
  const [runs, setRuns] = useState<CanonicalizationRunRow[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedCanonicalId, setSelectedCanonicalId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingLabels, setSavingLabels] = useState<Record<string, boolean>>({});
  const [labelErrors, setLabelErrors] = useState<Record<string, string | null>>({});
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [plotPointsVisibility, setPlotPointsVisibility] = useState<Record<string, boolean>>({});
  const [lastSimulation, setLastSimulation] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fetchRuns = useCallback(
    async (preferredRunId?: string) => {
      if (!mythId) return;
      setRunsLoading(true);
      setRunsError(null);
      const { data, error } = await supabase
        .from('canonicalization_runs')
        .select(
          'id, myth_id, mode, params, assignments, prevalence, metrics, diagnostics, category_labels, status, created_at',
        )
        .eq('myth_id', mythId)
        .order('created_at', { ascending: false })
        .limit(RUN_LIMIT);

      if (error) {
        setRuns([]);
        setRunsError(error.message ?? 'Failed to load canonicalization runs.');
      } else {
        const casted = (data as CanonicalizationRunRow[] | null) ?? [];
        setRuns(casted);
        if (preferredRunId) {
          setSelectedRunId(preferredRunId);
        } else if (casted.length > 0) {
          const firstSucceeded = casted.find((row) => row.status === 'succeeded');
          setSelectedRunId(firstSucceeded?.id ?? null);
        } else {
          setSelectedRunId(null);
        }
      }
      setRunsLoading(false);
    },
    [mythId, supabase],
  );

  useEffect(() => {
    if (mythId) {
      fetchRuns();
    }
  }, [fetchRuns, mythId]);

  useEffect(() => {
    if (!runs.some((row) => row.id === selectedRunId)) {
      const firstSucceeded = runs.find((row) => row.status === 'succeeded');
      setSelectedRunId(firstSucceeded?.id ?? null);
    }
  }, [runs, selectedRunId]);

  const runViews = useMemo(() => {
    if (!myth) return [];
    return runs
      .filter((row) => row.status === 'succeeded')
      .map((row) => transformRunRow(row, myth))
      .filter((view): view is CanonicalizationRunView => Boolean(view));
  }, [runs, myth]);

  const activeRun = runViews.find((run) => run.id === selectedRunId) ?? runViews[0] ?? null;
  const activeRunId = activeRun?.id ?? null;
  const canRenameCategory = Boolean(selectedRunId ?? activeRunId);

  useEffect(() => {
    if (activeRun?.categories.length) {
      setSelectedCanonicalId(activeRun.categories[0].id);
    } else {
      setSelectedCanonicalId(null);
    }
  }, [activeRun]);

  useEffect(() => {
    if (!activeRun) {
      setLabelDrafts({});
      setLabelErrors({});
      setSavingLabels({});
      return;
    }
    const drafts: Record<string, string> = {};
    activeRun.categories.forEach((category) => {
      drafts[category.id] = category.label;
    });
    setLabelDrafts(drafts);
    setLabelErrors({});
    setSavingLabels({});
  }, [activeRun]);

  useEffect(() => {
    if (!activeRun) {
      setPlotPointsVisibility({});
      return;
    }
    setPlotPointsVisibility((previous) => {
      const next: Record<string, boolean> = {};
      activeRun.categories.forEach((category) => {
        next[category.id] = previous[category.id] ?? false;
      });
      return next;
    });
  }, [activeRun]);

  const updateLabelDraft = useCallback((canonicalId: string, value: string) => {
    setLabelDrafts((previous) => ({ ...previous, [canonicalId]: value }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!mythId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const enforcement = getParameterEnforcement(params.algorithm);
      const canUseAutoDetect = enforcement.autoDetect !== 'na';
      const useAutoK = canUseAutoDetect && params.useAutoK;
      const targetSupported = enforcement.targetCanonicalCount !== 'na';
      const optimizationSupported = enforcement.optimizationGoal !== 'na';
      const minClusterSupported = enforcement.minClusterSize !== 'na';

      const paramPayload: Record<string, unknown> = {};
      if (canUseAutoDetect) {
        paramPayload.useAutoK = useAutoK;
      }
      if (targetSupported && !useAutoK) {
        paramPayload.targetCanonicalCount = params.targetCanonicalCount;
      }
      if (optimizationSupported) {
        paramPayload.optimizationGoal = params.optimizationGoal;
      }
      if (minClusterSupported) {
        paramPayload.minClusterSize = params.minClusterSize;
      }

      const payload = {
        mythId,
        mode: params.algorithm,
        params: paramPayload,
      };
      const { data, error } = await supabase.functions.invoke('canonicalization-run', {
        body: payload,
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      const runId: string | undefined = data?.run?.id;
      setLastSimulation(new Date().toISOString());
      await fetchRuns(runId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to run canonicalization.');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchRuns, mythId, params, supabase]);

  const handleRename = useCallback(
    async (canonicalId?: string) => {
      const targetId = canonicalId ?? selectedCanonicalId;
      const runId = selectedRunId ?? activeRunId;
      if (!runId || !targetId) return;
      const nextLabel = (labelDrafts[targetId] ?? '').trim();
      setSavingLabels((prev) => ({ ...prev, [targetId]: true }));
      setLabelErrors((prev) => ({ ...prev, [targetId]: null }));
      try {
        const { error } = await supabase.rpc('canonicalization_set_label', {
          p_run_id: runId,
          p_canonical_id: targetId,
          p_label: nextLabel,
        });
        if (error) {
          throw new Error(error.message ?? 'Unable to rename category');
        }
        await fetchRuns(runId);
      } catch (err) {
        setLabelErrors((prev) => ({
          ...prev,
          [targetId]: err instanceof Error ? err.message : 'Unable to rename category',
        }));
      } finally {
        setSavingLabels((prev) => ({ ...prev, [targetId]: false }));
      }
    },
    [activeRunId, fetchRuns, labelDrafts, selectedCanonicalId, selectedRunId, supabase],
  );

  const togglePlotPointsVisibility = useCallback((canonicalId: string) => {
    setPlotPointsVisibility((previous) => ({
      ...previous,
      [canonicalId]: !previous[canonicalId],
    }));
  }, []);

  useEffect(() => {
    setApplyError(null);
  }, [activeRunId]);

  const handleApplyCategories = useCallback(async () => {
    if (!activeRunId) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      const { error } = await supabase.rpc('canonicalization_apply_run', {
        p_run_id: activeRunId,
      });
      if (error) {
        throw new Error(error.message ?? 'Failed to apply canonical categories.');
      }
      await loadArchiveData();
    } catch (err) {
      setApplyError(
        err instanceof Error ? err.message : 'Failed to apply canonical categories.',
      );
    } finally {
      setIsApplying(false);
    }
  }, [activeRunId, loadArchiveData, supabase]);

  if (isInitialLoad) {
    return (
      <div className="py-16">
        <LoadingAnimation message="Loading canonicalization lab…" />
      </div>
    );
  }

  if (!myth) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-200">
        <h2 className="text-lg font-semibold">Myth not found</h2>
        <p className="mt-2 text-sm">
          This canonicalization workspace needs a valid myth. Return to the archive and select a
          myth you own.
        </p>
      </div>
    );
  }

  const summaryCards = buildSummaryCards(activeRun);

  return (
    <div className="space-y-6" data-testid="canonicalization-lab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Canonicalization</p>
          <h2 className="text-2xl font-semibold">{myth.name} · Canonicalization Lab</h2>
          <p className="text-sm text-muted-foreground">
            Launch consolidation runs and inspect collaborator influence without leaving the
            archive.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClockIcon className="size-4" />
          Last run:{' '}
          <span className="font-medium text-foreground">
            {activeRun
              ? formatTimestamp(activeRun.createdAt)
              : lastSimulation
                ? formatTimestamp(lastSimulation)
                : 'No runs yet'}
          </span>
        </div>
      </div>

      {runsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
          {runsError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr),260px]">
        <ParameterRail
          params={params}
          disabled={!mythId}
          onChange={setParams}
          onRun={handleRun}
          isRunning={isSubmitting}
          errorMessage={submitError}
        />

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-border bg-card p-4 shadow-sm dark:border-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <InfoTooltip
                    label={`Explain ${card.label}`}
                    align="end"
                    content={<p className="text-xs leading-relaxed">{card.description}</p>}
                  />
                </div>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Apply canonical categories</p>
                <p className="text-sm text-muted-foreground">
                  Applying a run will overwrite this myth's canonical categories and update every
                  plot point to match the selected run.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!activeRunId || isApplying} variant="secondary">
                    {isApplying ? 'Applying…' : 'Apply Canonical Categories'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply canonical categories?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace the myth's canonical categories with the selections from
                      this run and assign every plot point to those categories. Any previous
                      application will be overwritten.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleApplyCategories()} disabled={isApplying}>
                      {isApplying ? 'Applying…' : 'Apply categories'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {applyError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{applyError}</p>
            )}
          </div>

          {runsLoading && runViews.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Fetching canonicalization runs…
            </div>
          )}

          {!runsLoading && runViews.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No canonicalization runs yet. Configure parameters on the left and click “Run
              Analysis” to generate the first set of metrics.
            </div>
          )}

          {activeRun && (
            <>
              <CanonicalCategoryList
                categories={activeRun.categories}
                selectedCanonicalId={selectedCanonicalId}
                onSelectCanonicalId={setSelectedCanonicalId}
                labelDrafts={labelDrafts}
                labelErrors={labelErrors}
                savingLabels={savingLabels}
                onLabelDraftChange={updateLabelDraft}
                onRenameCategory={handleRename}
                canRenameCategory={canRenameCategory}
                plotPointsVisibility={plotPointsVisibility}
                onTogglePlotPointsVisibility={togglePlotPointsVisibility}
              />

              <section aria-labelledby="metrics-table">
                <h3 id="metrics-table" className="text-lg font-semibold">
                  Metric Snapshot
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Canonical</th>
                        <th className="px-4 py-2">Size</th>
                        <th className="px-4 py-2">Purity</th>
                        <th className="px-4 py-2">Entropy</th>
                        <th className="px-4 py-2">Top Contributors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card/30">
                      {activeRun.categories.map((category) => (
                        <tr key={`${category.id}-row`}>
                          <td className="px-4 py-2 font-medium">{category.label}</td>
                          <td className="px-4 py-2">{category.size}</td>
                          <td className="px-4 py-2">{Math.round(category.purity * 100)}%</td>
                          <td className="px-4 py-2">{Math.round(category.entropy * 100)}%</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {category.contributors
                              .slice(0, 3)
                              .map((contributor) => contributor.name)
                              .join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>

        <RunHistorySidebar
          runs={runs}
          selectedRunId={selectedRunId}
          onSelect={(runId) => {
            setSelectedRunId(runId);
          }}
        />
      </div>
    </div>
  );
}
