import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarClockIcon, PlayIcon } from 'lucide-react';

import { useArchive } from './ArchiveLayout';
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

type AlgorithmMode = 'graph' | 'factorization' | 'consensus' | 'hierarchical';

type ParameterState = {
  algorithm: AlgorithmMode;
  targetCanonicalCount: number;
  useAutoK: boolean;
  optimizationGoal: 'purity' | 'variance' | 'consensus';
  minClusterSize: number;
};

type MockContributor = { id: string; name: string; share: number };

type MockCanonicalCategory = {
  id: string;
  label: string;
  size: number;
  purity: number;
  entropy: number;
  contributors: MockContributor[];
  samples: string[];
};

type MockRun = {
  id: string;
  label: string;
  timestamp: string;
  mode: AlgorithmMode;
  silhouette: number;
  coverage: number;
  agreementGain: number;
  canonicalCategories: MockCanonicalCategory[];
};

const DEFAULT_PARAMS: ParameterState = {
  algorithm: 'graph',
  targetCanonicalCount: 5,
  useAutoK: false,
  optimizationGoal: 'purity',
  minClusterSize: 3,
};

const MOCK_RUNS: MockRun[] = [
  {
    id: 'run-003',
    label: 'Graph · Nov 10',
    timestamp: '2025-11-10T18:15:00Z',
    mode: 'graph',
    silhouette: 0.62,
    coverage: 0.97,
    agreementGain: 12.3,
    canonicalCategories: [
      {
        id: 'canon-journey',
        label: 'Journey Arc',
        size: 11,
        purity: 0.71,
        entropy: 0.34,
        contributors: [
          { id: 'cat-road', name: 'Road of Trials', share: 0.42 },
          { id: 'cat-ordeal', name: 'Ordeal Beats', share: 0.33 },
          { id: 'cat-brink', name: 'Threshold', share: 0.25 },
        ],
        samples: [
          'Hero crosses the sea to consult the oracle.',
          'Allies debate whether to accompany the journey.',
        ],
      },
      {
        id: 'canon-conflict',
        label: 'Conflict Engine',
        size: 9,
        purity: 0.82,
        entropy: 0.18,
        contributors: [
          { id: 'cat-revolt', name: 'Revolt Sparks', share: 0.55 },
          { id: 'cat-siege', name: 'Siege Notes', share: 0.28 },
          { id: 'cat-brink', name: 'Threshold', share: 0.17 },
        ],
        samples: [
          'City watch defects to the rebels.',
          'Villagers barricade the basilisk inside the keep.',
        ],
      },
      {
        id: 'canon-restoration',
        label: 'Restoration',
        size: 6,
        purity: 0.63,
        entropy: 0.44,
        contributors: [
          { id: 'cat-home', name: 'Return Home', share: 0.4 },
          { id: 'cat-healing', name: 'Healing rites', share: 0.38 },
          { id: 'cat-legacy', name: 'Legacy setup', share: 0.22 },
        ],
        samples: ['Guardian spirit rebonds with the clan.', 'Hero plants the ember seeds.'],
      },
    ],
  },
  {
    id: 'run-002',
    label: 'Consensus · Nov 2',
    timestamp: '2025-11-02T04:22:00Z',
    mode: 'consensus',
    silhouette: 0.55,
    coverage: 0.91,
    agreementGain: 9.8,
    canonicalCategories: [
      {
        id: 'canon-origin',
        label: 'Origin Sparks',
        size: 7,
        purity: 0.66,
        entropy: 0.3,
        contributors: [
          { id: 'cat-home', name: 'Return Home', share: 0.37 },
          { id: 'cat-call', name: 'Call to Adventure', share: 0.33 },
          { id: 'cat-mentor', name: 'Mentor Moments', share: 0.3 },
        ],
        samples: ['Village feast introduces river goddess.', 'Mentor passes on warning tablet.'],
      },
      {
        id: 'canon-betrayal',
        label: 'Betrayal Thread',
        size: 5,
        purity: 0.76,
        entropy: 0.22,
        contributors: [
          { id: 'cat-traitor', name: 'Turncoats', share: 0.6 },
          { id: 'cat-revolt', name: 'Revolt Sparks', share: 0.4 },
        ],
        samples: ['Childhood friend opens the gates.', 'Spy ring signals the obsidian tower.'],
      },
    ],
  },
  {
    id: 'run-001',
    label: 'Factorization · Oct 28',
    timestamp: '2025-10-28T15:02:00Z',
    mode: 'factorization',
    silhouette: 0.47,
    coverage: 0.88,
    agreementGain: 6.2,
    canonicalCategories: [
      {
        id: 'canon-harvest',
        label: 'Harvest & Consequence',
        size: 8,
        purity: 0.58,
        entropy: 0.51,
        contributors: [
          { id: 'cat-harvest', name: 'Harvest Notes', share: 0.36 },
          { id: 'cat-legacy', name: 'Legacy setup', share: 0.34 },
          { id: 'cat-healing', name: 'Healing rites', share: 0.3 },
        ],
        samples: ['Fields recover after ashfall.', 'Next generation sworn to keep ember.'],
      },
    ],
  },
];

export function CanonicalizationLabPage() {
  const { mythId } = useParams<{ mythId: string }>();
  const { myths, isInitialLoad } = useArchive();
  const myth = myths.find((candidate) => candidate.id === mythId) ?? null;

  const [params, setParams] = useState<ParameterState>(DEFAULT_PARAMS);
  const [selectedRunId, setSelectedRunId] = useState<string>(MOCK_RUNS[0].id);
  const [selectedCanonicalId, setSelectedCanonicalId] = useState<string | null>(null);
  const [lastSimulation, setLastSimulation] = useState<string | null>(null);

  const activeRun = useMemo(
    () => MOCK_RUNS.find((run) => run.id === selectedRunId) ?? MOCK_RUNS[0],
    [selectedRunId],
  );

  useEffect(() => {
    setSelectedCanonicalId(activeRun.canonicalCategories[0]?.id ?? null);
  }, [activeRun]);

  const selectedCategory = useMemo(
    () => activeRun.canonicalCategories.find((cat) => cat.id === selectedCanonicalId) ?? null,
    [activeRun, selectedCanonicalId],
  );

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
          This canonicalization workspace needs a valid myth. Return to the archive and select a myth
          you own.
        </p>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Overall Purity', value: `${Math.round(selectedCategory?.purity ?? 0.7 * 100)}%` },
    { label: 'Silhouette', value: activeRun.silhouette.toFixed(2) },
    { label: 'Coverage', value: `${Math.round(activeRun.coverage * 100)}%` },
    { label: 'Agreement Gain', value: `${activeRun.agreementGain.toFixed(1)} pts` },
  ];

  return (
    <div className="space-y-6" data-testid="canonicalization-lab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Canonicalization</p>
          <h2 className="text-2xl font-semibold">{myth.name} · Canonicalization Lab</h2>
          <p className="text-sm text-muted-foreground">
            Prototype dashboard using mocked runs. Tune parameters on the left and compare historic
            analyses on the right.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClockIcon className="size-4" />
          Last simulated run:{' '}
          <span className="font-medium text-foreground">
            {lastSimulation ? new Date(lastSimulation).toLocaleString() : 'Not run yet'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr),260px]">
        <ParameterRail
          params={params}
          disabled={false}
          onChange={setParams}
          onRun={() => setLastSimulation(new Date().toISOString())}
        />

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-border bg-card p-4 shadow-sm dark:border-white/5"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <section aria-labelledby="canonical-categories">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="canonical-categories" className="text-lg font-semibold">
                  Canonical Categories
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stacked bars show collaborator influence per category. Click a bar to inspect
                  details.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {activeRun.canonicalCategories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCanonicalId(category.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    category.id === selectedCanonicalId
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-500/10'
                      : 'border-border hover:border-blue-300 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{category.label}</span>
                    <span className="text-muted-foreground">{category.size} pts</span>
                  </div>
                  <div className="mt-3 flex h-3 overflow-hidden rounded bg-muted">
                    {category.contributors.map((contributor) => (
                      <div
                        key={contributor.id}
                        className="h-full bg-blue-500/70 text-[10px]/3 text-center text-white first:rounded-l last:rounded-r"
                        style={{ width: `${contributor.share * 100}%` }}
                        title={`${contributor.name} · ${Math.round(contributor.share * 100)}%`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Top contributors:{' '}
                    {category.contributors
                      .map(
                        (contributor) => `${contributor.name} (${Math.round(contributor.share * 100)}%)`,
                      )
                      .join(', ')}
                  </p>
                </button>
              ))}
            </div>
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
                  {activeRun.canonicalCategories.map((category) => (
                    <tr key={`${category.id}-row`}>
                      <td className="px-4 py-2 font-medium">{category.label}</td>
                      <td className="px-4 py-2">{category.size}</td>
                      <td className="px-4 py-2">{Math.round(category.purity * 100)}%</td>
                      <td className="px-4 py-2">{Math.round(category.entropy * 100)}%</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {category.contributors
                          .slice(0, 3)
                          .map((contributor) => contributor.name)
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedCategory && (
            <section aria-labelledby="cluster-detail" className="rounded-lg border border-border p-4">
              <h3 id="cluster-detail" className="text-lg font-semibold">
                {selectedCategory.label} · Detail
              </h3>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Collaborator Influence
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {selectedCategory.contributors.map((contributor) => (
                      <li
                        key={contributor.id}
                        className="flex items-center justify-between rounded border border-border/60 px-3 py-2"
                      >
                        <span>{contributor.name}</span>
                        <span className="text-muted-foreground">
                          {Math.round(contributor.share * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Representative Plot Points
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {selectedCategory.samples.map((sample, index) => (
                      <li key={`${selectedCategory.id}-sample-${index}`} className="rounded bg-muted p-3">
                        {sample}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>

        <RunHistorySidebar
          runs={MOCK_RUNS}
          selectedRunId={selectedRunId}
          onSelect={setSelectedRunId}
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
}: {
  params: ParameterState;
  onChange: (next: ParameterState) => void;
  onRun: () => void;
  disabled: boolean;
}) {
  return (
    <aside
      className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-white/5"
      data-testid="parameter-rail"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Parameters</h3>
          <p className="text-xs text-muted-foreground">Mock controls (no backend yet).</p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onChange(DEFAULT_PARAMS)}
          title="Reset parameters"
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
              <p className="text-xs text-muted-foreground">Use elbow/Gap heuristics.</p>
            </div>
            <Switch
              checked={params.useAutoK}
              onCheckedChange={(checked) => onChange({ ...params, useAutoK: checked })}
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
              disabled={params.useAutoK}
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
          />
        </div>
      </div>

      <Button
        className="mt-6 w-full gap-2"
        onClick={onRun}
        disabled={disabled}
        variant="default"
      >
        <PlayIcon className="size-4" />
        Simulate Run
      </Button>
    </aside>
  );
}

function RunHistorySidebar({
  runs,
  selectedRunId,
  onSelect,
}: {
  runs: MockRun[];
  selectedRunId: string;
  onSelect: (runId: string) => void;
}) {
  return (
    <aside
      className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-white/5"
      data-testid="run-history"
    >
      <h3 className="text-lg font-semibold">Historical Runs</h3>
      <p className="text-xs text-muted-foreground">Mock run history (static data).</p>
      <div className="mt-4 space-y-3">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() => onSelect(run.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
              run.id === selectedRunId
                ? 'border-blue-500 bg-blue-50/40 font-semibold dark:bg-blue-500/10'
                : 'border-border hover:border-blue-300 dark:border-white/5'
            }`}
          >
            <p>{run.label}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(run.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Silhouette {run.silhouette.toFixed(2)} · Coverage {Math.round(run.coverage * 100)}%
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}
