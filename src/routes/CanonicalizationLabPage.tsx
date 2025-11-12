import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClockIcon, PlayIcon } from 'lucide-react';

import { useArchive } from './ArchiveLayout';
import { getSupabaseClient } from '../lib/supabaseClient';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import type { Myth, PlotPoint } from '../types/myth';

type AlgorithmMode = 'graph' | 'factorization' | 'consensus' | 'hierarchical';

type ParameterState = {
  algorithm: AlgorithmMode;
  targetCanonicalCount: number;
  useAutoK: boolean;
  optimizationGoal: 'purity' | 'variance' | 'consensus';
  minClusterSize: number;
};

type CanonicalizationRunRow = {
  id: string;
  myth_id: string;
  mode: AlgorithmMode;
  params: Record<string, unknown> | null;
  assignments: CanonicalAssignmentRow[] | null;
  prevalence: CanonicalPrevalenceRow[] | null;
  metrics: MetricsRow | null;
  diagnostics: Record<string, unknown> | null;
  category_labels: Record<string, string> | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  created_at: string;
};

type CanonicalAssignmentRow = {
  plotPointId: string;
  canonicalId: string;
  score?: number;
};

type CanonicalPrevalenceRow = {
  canonicalId: string;
  totals: Record<string, number>;
};

type MetricsRow = {
  coverage?: number;
  purityByCanonical?: Record<string, number>;
  entropyByCanonical?: Record<string, number>;
  agreementGain?: number;
};

type CanonicalContributorSlice = {
  id: string;
  name: string;
  share: number;
  color: string;
};

type CanonicalCategoryView = {
  id: string;
  label: string;
  size: number;
  purity: number;
  entropy: number;
  contributors: CanonicalContributorSlice[];
  samples: string[];
};

type CanonicalizationRunView = {
  id: string;
  createdAt: string;
  mode: AlgorithmMode;
  status: CanonicalizationRunRow['status'];
  coverage: number;
  averagePurity: number;
  averageEntropy: number;
  agreementGain?: number;
  categories: CanonicalCategoryView[];
};

const DEFAULT_PARAMS: ParameterState = {
  algorithm: 'graph',
  targetCanonicalCount: 5,
  useAutoK: false,
  optimizationGoal: 'purity',
  minClusterSize: 3,
};

const RUN_LIMIT = 20;

export function CanonicalizationLabPage() {
  const { mythId } = useParams<{ mythId: string }>();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { myths, isInitialLoad } = useArchive();
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
      const payload = {
        mythId,
        mode: params.algorithm,
        params: {
          targetCanonicalCount: params.useAutoK ? undefined : params.targetCanonicalCount,
          useAutoK: params.useAutoK,
          optimizationGoal: params.optimizationGoal,
          minClusterSize: params.minClusterSize,
        },
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

  const togglePlotPointsAccordion = useCallback((canonicalId: string) => {
    setPlotPointsVisibility((previous) => ({
      ...previous,
      [canonicalId]: !previous[canonicalId],
    }));
  }, []);

  const getLabelDraft = (canonicalId: string) => labelDrafts[canonicalId] ?? '';
  const getLabelError = (canonicalId?: string) =>
    canonicalId ? (labelErrors[canonicalId] ?? null) : null;
  const isSavingLabel = (canonicalId?: string) =>
    canonicalId ? Boolean(savingLabels[canonicalId]) : false;

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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
            ))}
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
              <section aria-labelledby="canonical-categories">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="canonical-categories" className="text-lg font-semibold">
                      Canonical Categories
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Stacked bars show collaborator influence per category. Click a bar to inspect
                      samples and contributors.
                    </p>
                  </div>
                </div>
                <Accordion
                  type="single"
                  collapsible
                  value={selectedCanonicalId ?? ''}
                  onValueChange={(value) => setSelectedCanonicalId(value || null)}
                  className="mt-4 space-y-4"
                >
                  {activeRun.categories.map((category) => {
                    const isSelected = category.id === selectedCanonicalId;
                    const plotPointsExpanded = plotPointsVisibility[category.id] ?? false;

                    return (
                      <AccordionItem
                        key={category.id}
                        value={category.id}
                        data-testid="canonical-category-card"
                        className={`rounded-lg border border-border transition data-[state=open]:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-500/10'
                            : 'bg-card dark:border-white/5'
                        }`}
                      >
                        <div className="p-4">
                          <AccordionTrigger className="w-full rounded-md p-0 text-left hover:no-underline focus-visible:ring-2 focus-visible:ring-blue-400">
                            <div className="flex w-full items-center justify-between text-sm font-medium">
                              <span>{category.label}</span>
                              <span className="text-muted-foreground">{category.size} pts</span>
                            </div>
                          </AccordionTrigger>
                          <div className="mt-3 flex items-end gap-2">
                            <div className="flex-1">
                              <Label htmlFor={`category-input-${category.id}`} className="text-xs">
                                Category name
                              </Label>
                              <Input
                                id={`category-input-${category.id}`}
                                value={getLabelDraft(category.id) || category.label}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  updateLabelDraft(category.id, event.currentTarget.value);
                                }}
                                className="mt-1"
                                placeholder="Category name"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRename(category.id);
                              }}
                              disabled={isSavingLabel(category.id) || !canRenameCategory}
                            >
                              {isSavingLabel(category.id) ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                          {getLabelError(category.id) && (
                            <p className="mt-1 text-xs text-red-500" role="alert">
                              {getLabelError(category.id)}
                            </p>
                          )}
                          <div className="mt-3 flex h-3 overflow-hidden rounded bg-muted">
                            {category.contributors.map((contributor) => (
                              <div
                                key={contributor.id}
                                className="h-full text-[10px]/3 text-center text-white first:rounded-l last:rounded-r"
                                style={{
                                  width: `${contributor.share * 100}%`,
                                  backgroundColor: contributor.color,
                                }}
                                title={`${contributor.name} · ${Math.round(contributor.share * 100)}%`}
                              />
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Top contributors:{' '}
                            {category.contributors
                              .slice(0, 3)
                              .map(
                                (contributor) =>
                                  `${contributor.name} (${Math.round(contributor.share * 100)}%)`,
                              )
                              .join(', ')}
                          </p>
                          <AccordionContent className="pt-4">
                            <section
                              aria-labelledby={`cluster-detail-${category.id}-header`}
                              id={`cluster-detail-${category.id}`}
                              className="rounded-lg border border-border p-4"
                            >
                              <h3
                                id={`cluster-detail-${category.id}-header`}
                                className="text-lg font-semibold"
                              >
                                {category.label} · Detail
                              </h3>
                              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Collaborator Influence
                                  </p>
                                  <ul className="mt-2 space-y-2 text-sm">
                                    {category.contributors.map((contributor) => (
                                      <li
                                        key={contributor.id}
                                        className="flex items-center justify-between rounded border border-border/60 px-3 py-2"
                                      >
                                        <span className="flex items-center gap-2">
                                          <span
                                            className="inline-block size-3 rounded-full"
                                            style={{ backgroundColor: contributor.color }}
                                            aria-hidden
                                          />
                                          {contributor.name}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {Math.round(contributor.share * 100)}%
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Representative Plot Points
                                    </p>
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto px-0 text-xs font-semibold"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        togglePlotPointsAccordion(category.id);
                                      }}
                                    >
                                      {plotPointsExpanded
                                        ? 'Hide all plot points'
                                        : 'See all plot points'}
                                    </Button>
                                  </div>
                                  {plotPointsExpanded && (
                                    <ul className="mt-2 space-y-2 text-sm">
                                      {category.samples.map((sample, index) => (
                                        <li
                                          key={`${category.id}-sample-${index}`}
                                          className="rounded bg-muted p-3"
                                        >
                                          {sample}
                                        </li>
                                      ))}
                                      {category.samples.length === 0 && (
                                        <li className="rounded bg-muted/40 p-3 text-muted-foreground">
                                          No sample plot points available.
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                  {!plotPointsExpanded && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      Plot points hidden. Select “See all plot points” to review every
                                      sample.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </section>
                          </AccordionContent>
                        </div>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </section>

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

function ParameterRail({
  params,
  onChange,
  onRun,
  disabled,
  isRunning,
  errorMessage,
}: {
  params: ParameterState;
  onChange: (next: ParameterState) => void;
  onRun: () => void;
  disabled: boolean;
  isRunning: boolean;
  errorMessage: string | null;
}) {
  return (
    <aside
      className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-white/5"
      data-testid="parameter-rail"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Parameters</h3>
          <p className="text-xs text-muted-foreground">Runs execute via Supabase Edge Functions.</p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onChange(DEFAULT_PARAMS)}
          title="Reset parameters"
          disabled={isRunning}
        >
          ↺
        </Button>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <Label htmlFor="algorithm-select">Algorithm Mode</Label>
          <Select
            value={params.algorithm}
            onValueChange={(value: AlgorithmMode) => onChange({ ...params, algorithm: value })}
          >
            <SelectTrigger id="algorithm-select" className="mt-1">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="graph">Agreement Graph</SelectItem>
              <SelectItem value="factorization">Assignment Factorization</SelectItem>
              <SelectItem value="consensus">Consensus Labeling</SelectItem>
              <SelectItem value="hierarchical">Hierarchical Merge/Split</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Auto-detect Category Count</p>
              <p className="text-xs text-muted-foreground">
                Uses elbow/Gap heuristics (not yet wired).
              </p>
            </div>
            <Switch
              checked={params.useAutoK}
              onCheckedChange={(checked) => onChange({ ...params, useAutoK: checked })}
              disabled={isRunning}
            />
          </div>
          <div>
            <Label htmlFor="target-k-input">Target Canonical Count</Label>
            <Input
              id="target-k-input"
              type="number"
              min={2}
              max={12}
              value={params.targetCanonicalCount}
              onChange={(event) =>
                onChange({ ...params, targetCanonicalCount: Number(event.currentTarget.value) })
              }
              className="mt-1"
              disabled={params.useAutoK || isRunning}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="optimization-select">Optimization Goal</Label>
          <Select
            value={params.optimizationGoal}
            onValueChange={(value: ParameterState['optimizationGoal']) =>
              onChange({ ...params, optimizationGoal: value })
            }
          >
            <SelectTrigger id="optimization-select" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purity">Purity maximization</SelectItem>
              <SelectItem value="variance">Variance minimization</SelectItem>
              <SelectItem value="consensus">Consensus stability</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="min-cluster-input">Minimum Cluster Size</Label>
          <Input
            id="min-cluster-input"
            type="number"
            min={1}
            max={12}
            value={params.minClusterSize}
            onChange={(event) =>
              onChange({ ...params, minClusterSize: Number(event.currentTarget.value) })
            }
            className="mt-1"
            disabled={isRunning}
          />
        </div>
      </div>

      <Button
        className="mt-6 w-full gap-2"
        onClick={onRun}
        disabled={disabled || isRunning}
        variant="default"
      >
        <PlayIcon className="size-4" />
        {isRunning ? 'Running…' : 'Run Analysis'}
      </Button>
      {errorMessage && (
        <p className="mt-3 text-xs text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
    </aside>
  );
}

function RunHistorySidebar({
  runs,
  selectedRunId,
  onSelect,
}: {
  runs: CanonicalizationRunRow[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}) {
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
            <button
              key={run.id}
              type="button"
              onClick={() => {
                if (!isDisabled) onSelect(run.id);
              }}
              disabled={isDisabled}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                run.id === selectedRunId
                  ? 'border-blue-500 bg-blue-50/40 font-semibold dark:bg-blue-500/10'
                  : 'border-border hover:border-blue-300 dark:border-white/5'
              } ${isDisabled ? 'opacity-60' : ''}`}
            >
              <p>{label}</p>
              <p className="text-xs text-muted-foreground capitalize">Status: {run.status}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function buildSummaryCards(run: CanonicalizationRunView | null) {
  if (!run) {
    return [
      { label: 'Coverage', value: '—' },
      { label: 'Avg Purity', value: '—' },
      { label: 'Avg Entropy', value: '—' },
      { label: 'Agreement Gain', value: '—' },
    ];
  }
  return [
    { label: 'Coverage', value: `${Math.round(run.coverage * 100)}%` },
    { label: 'Avg Purity', value: `${Math.round(run.averagePurity * 100)}%` },
    { label: 'Avg Entropy', value: `${Math.round(run.averageEntropy * 100)}%` },
    {
      label: 'Agreement Gain',
      value: typeof run.agreementGain === 'number' ? `${run.agreementGain.toFixed(1)} pts` : '—',
    },
  ];
}

function transformRunRow(row: CanonicalizationRunRow, myth: Myth): CanonicalizationRunView | null {
  const assignments = Array.isArray(row.assignments) ? row.assignments : [];
  if (assignments.length === 0) {
    return null;
  }
  const plotPointLookup = buildPlotPointLookup(myth.variants);
  const collaboratorLookup = new Map(
    myth.collaboratorCategories.map((category) => [category.id, category.name]),
  );

  const metrics = row.metrics ?? {};
  const purityMap = metrics.purityByCanonical ?? {};
  const entropyMap = metrics.entropyByCanonical ?? {};
  const prevalence = Array.isArray(row.prevalence) ? row.prevalence : [];
  const prevalenceMap = new Map(prevalence.map((entry) => [entry.canonicalId, entry.totals]));
  const labelMap = row.category_labels ?? {};

  const groups = new Map<
    string,
    { assignments: CanonicalAssignmentRow[]; prevalence?: Record<string, number> }
  >();

  assignments.forEach((assignment) => {
    const group = groups.get(assignment.canonicalId) ?? { assignments: [] };
    group.assignments.push(assignment);
    if (!group.prevalence && prevalenceMap.has(assignment.canonicalId)) {
      group.prevalence = prevalenceMap.get(assignment.canonicalId);
    }
    groups.set(assignment.canonicalId, group);
  });

  const categories: CanonicalCategoryView[] = Array.from(groups.entries()).map(
    ([canonicalId, group]) => {
      const contributors = buildContributors(group.prevalence ?? {}, collaboratorLookup);
      const samples = buildSamples(group.assignments, plotPointLookup);
      return {
        id: canonicalId,
        label: labelMap[canonicalId] ?? canonicalId,
        size: group.assignments.length,
        purity: purityMap[canonicalId] ?? 0,
        entropy: entropyMap[canonicalId] ?? 0,
        contributors,
        samples,
      };
    },
  );

  categories.sort((a, b) => b.size - a.size);

  categories.forEach((category, index) => {
    if (!labelMap[category.id]) {
      category.label = `Category ${index + 1}`;
    }
  });

  const averagePurity = computeAverage(Object.values(purityMap));
  const averageEntropy = computeAverage(Object.values(entropyMap));

  return {
    id: row.id,
    createdAt: row.created_at ?? new Date().toISOString(),
    mode: row.mode,
    status: row.status,
    coverage: metrics.coverage ?? 0,
    agreementGain: metrics.agreementGain ?? undefined,
    averagePurity,
    averageEntropy,
    categories,
  };
}

function buildPlotPointLookup(variants: Myth['variants']) {
  const lookup = new Map<string, PlotPoint>();
  variants.forEach((variant) => {
    (variant.plotPoints ?? []).forEach((point) => {
      lookup.set(point.id, point);
    });
  });
  return lookup;
}

function buildContributors(
  totals: Record<string, number>,
  collaboratorLookup: Map<string, string>,
): CanonicalContributorSlice[] {
  const entries = Object.entries(totals);
  const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
  if (totalCount === 0) return [];
  return entries
    .map(([categoryId, count]) => ({
      id: categoryId,
      name: collaboratorLookup.get(categoryId) ?? `Category ${categoryId}`,
      share: count / totalCount,
      color: getColorForId(categoryId),
    }))
    .sort((a, b) => b.share - a.share);
}

function buildSamples(
  assignments: CanonicalAssignmentRow[],
  plotPointLookup: Map<string, PlotPoint>,
) {
  return assignments
    .map((assignment) => plotPointLookup.get(assignment.plotPointId)?.text ?? null)
    .filter((text): text is string => Boolean(text))
    .slice(0, 3);
}

function computeAverage(values: number[]) {
  if (values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function formatModeLabel(mode: AlgorithmMode) {
  switch (mode) {
    case 'graph':
      return 'Agreement Graph';
    case 'factorization':
      return 'Factorization';
    case 'consensus':
      return 'Consensus Labeling';
    case 'hierarchical':
      return 'Hierarchical';
    default:
      return mode;
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getColorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}
