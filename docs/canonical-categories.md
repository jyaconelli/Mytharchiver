# Canonical Category Synthesis

This document captures how we derive owner-curated `canonicalCategories` from contributor-provided `collaboratorCategories` without introducing extra plot-point features. The pipeline emphasizes transparent statistics, tunable objectives, and a review-friendly UI so owners can understand and name the resulting groupings.

## Goals and Constraints

- Input surface: a set of `plotPoints`, each possibly tagged by multiple `collaboratorCategories`. Names are ignored during optimization; only membership counts/weights matter.
- Output surface: a partition of plot points into `canonicalCategories`, each accompanied by statistics describing how well it summarizes collaborator intent.
- Owners must be able to lock in a desired number of canonical categories or let the system discover one automatically.
- Every run should log its parameters, objective scores, and mappings so owners can compare, iterate, and optionally merge/split results manually.

## Shared Data Structures

| Symbol | Description |
| --- | --- |
| `P` | Set of plot points. |
| `C` | Set of collaborator categories. |
| `A ∈ ℝ^{|P|×|C|}` | Assignment matrix where `A[p, c]` equals the weight/number of collaborators who placed point `p` inside category `c`. |
| `W ∈ ℝ^{|P|×|P|}` | Agreement matrix where `W[p, q]` counts how often points `p` and `q` co-occurred inside the same collaborator category (optional but useful for graph-based methods). |
| `K` | Requested number of canonical categories (owner-provided or discovered). |

Each optimization mode consumes subsets of these structures, but they all emit:

1. A mapping `plotPoint → canonicalCategory`.
2. Contributor prevalence tables per canonical category (`{collaboratorCategory: proportion}`).
3. Quality metrics (purity, entropy, coverage, cohesion vs. separation).

## Optimization Modes

### 1. Agreement Graph Partitioning

1. Build weighted graph `G = (P, W)` from agreement counts (optionally normalized by collaborator reliability).
2. Optimize modularity / cut score using algorithms such as spectral partitioning, Louvain, or Kernighan–Lin swaps.
3. Objective: maximize intra-cluster agreement weight while minimizing inter-cluster edges.

**Owner parameters**
- `targetCanonicalCount` (`K`) or `auto`.
- `weightingStrategy`: raw counts vs. collaborator trust weights vs. recency decay.
- `cutObjective`: modularity vs. ratio cut vs. normalized cut.
- `minClusterSize`: reassign smaller buckets or label them “uncertain”.

**Statistics**
- Modularity score per run.
- Cluster-specific average agreement weight.
- Warning if inter-cluster weight exceeds threshold (suggesting over-merging).

### 2. Assignment-Matrix Factorization

1. Use the matrix `A` and run Non-negative Matrix Factorization (NMF) or low-rank SVD variants with rank `K`.
2. Interpret columns of `U` (plot-point loadings) as soft canonical memberships; assign each point to its highest-loading canonical category or keep top-n for probabilistic views.
3. Regularize for sparsity or entropy to balance purity vs. coverage.

**Owner parameters**
- `targetCanonicalCount`.
- `regularization`: L1 (promote sparse memberships) vs. entropy penalty.
- `solver`: coordinate descent vs. projected gradient vs. HALS.
- `maxIterations`/`tolerance` for convergence.

**Statistics**
- Reconstruction error (Frobenius norm).
- Per-canonical entropy (how many collaborator categories contribute).
- Stability between randomized initializations.

### 3. Consensus Labeling (ILP or Metaheuristics)

1. Decision variables `x_{p,k}` assign each plot point `p` to canonical category `k`.
2. Objective combines:
   - Penalty if collaborator categories that heavily overlap end up split (`splitPenalty`).
   - Penalty if collaborator categories that rarely intersect end up merged (`mergePenalty`).
   - Optional balance term keeping canonical sizes within bounds.
3. Solve with integer linear programming for small datasets; switch to simulated annealing / genetic algorithms / tabu search for larger sets.

**Owner parameters**
- `targetCanonicalCount` or dynamic search range.
- `splitPenalty`, `mergePenalty`.
- `balancePenalty` (enforce roughly equal sizes).
- Metaheuristic knobs: temperature schedule, population size, time budget.

**Statistics**
- Objective score trace over iterations.
- Final constraint violations (if any).
- Sensitivity heatmap showing which collaborator categories most influence the objective.

### 4. Hierarchical Merge/Split Without Extra Features

1. Initialize each collaborator category (or each plot point) as its own canonical bucket.
2. Iteratively merge the pair whose union most improves a global criterion (e.g., Ward linkage on agreement weights or reduction in weighted entropy).
3. Optionally allow owner-triggered splits when a canonical category is too heterogeneous according to purity thresholds.

**Owner parameters**
- `stoppingCriterion`: number of canonical categories, purity floor, or delta-objective threshold.
- `linkageMetric`: entropy-based, agreement-based, or hybrid.
- `autoSplit`: toggle for post-merge entropy-based splits.

**Statistics**
- Dendrogram + elbow plot of objective vs. merge step.
- Purity trend lines.
- Notifications for merges that dramatically reduce purity (owner may undo).

## Cross-Mode Statistics

- **Purity**: share of plot points in a canonical category coming from its dominant collaborator category.
- **Entropy / Diversity**: whether a canonical category mixes many collaborator categories evenly (good when aiming for consolidation, bad when seeking consensus).
- **Coverage**: portion of total plot points assigned to a canonical category vs. flagged as noise/uncertain.
- **Agreement Gain**: difference between average agreement weight inside canonical categories vs. across categories.
- **Change Impact**: number of plot points reassigned compared to the previous accepted run.
- **Confidence Score**: composite of purity, coverage, size, and stability across algorithm modes/seeds.

Every run stores these metrics so owners can compare side-by-side and export reports.

## Owner-Facing Parameters Summary

| Parameter | Applies To | Notes |
| --- | --- | --- |
| `targetCanonicalCount` / `auto` | All | Can be a single K or a range for auto-selection via elbow, Gap, or BIC criteria. |
| `weightingStrategy` | Graph + Consensus | Adjust contributions by collaborator trust, recency, or manual weights. |
| `minClusterSize` / `noiseTolerance` | Graph + Hierarchical | Reassign or flag undersized clusters. |
| `regularization` | Factorization | Controls sparsity vs. mix. |
| `splitPenalty`, `mergePenalty`, `balancePenalty` | Consensus | Tune behavioral bias. |
| `optimizationGoal` | All | Choose between variance-minimizing, purity-maximizing, or hybrid objective weightings. |
| `runTimeBudget` | Consensus + Graph | Caps iterations or annealing schedule for predictable runtimes. |

## Canonicalization Lab UI

- **Parameter Rail**: sidebar with grouped controls (Algorithm Mode, Canonical Count, Objective Weights, Advanced knobs). Includes “Run Analysis” and “Compare to last run” buttons, plus a reset-to-defaults link.
- **Run Summary Strip**: cards for `Chosen Mode`, `Detected K`, `Overall Purity`, `Coverage`, `Warnings`. Each card links to details.
- **Visualization Panel**:
  - Stacked bar chart listing canonical categories with segments showing contributor prevalence (ordered by percentage). Hover reveals counts and top plot points.
  - Metrics table with columns `Canonical ID`, `Size`, `Purity`, `Entropy`, `Confidence`, `Top Collaborator Categories`.
  - Optional agreement heatmap or network diagram (graph mode) and dendrogram (hierarchical mode).
- **Cluster Detail Drawer**: triggered by selecting a canonical category.
  - Shows ordered list of collaborator categories and percentages.
  - Lists representative plot points (sample size configurable) to give semantic hints.
  - Provides editable text box for the owner to assign a human-friendly canonical name plus actions (`Merge`, `Split`, `Flag`).
- **Run History Sidebar**: chronological list of previous runs with timestamp, mode, key stats. Selecting two runs overlays charts for comparison (diff view highlights plot points that moved).
- **Export & Actions**: ability to lock in a run, download a CSV/JSON report, or trigger notifications to collaborators if canonical categories changed significantly.
- **Feedback Channel**: display why an algorithm recommended a given number of categories (e.g., elbow detection) so owners can trust or override it.

## Next Steps

1. Prototype the data pipeline that constructs `A` and `W` from existing collaborator assignments, ensuring weight hooks (trust, recency) exist.
2. Implement at least one algorithm mode end-to-end (e.g., agreement graph partitioning) to validate metrics and UI data needs.
3. Build the Canonicalization Lab UI shell with mocked data so stakeholders can refine parameter ergonomics before connecting real runs.
4. Add persistence + run history tracking, then iterate on additional optimization modes as needed.

## Implementation Roadmap

1. **Audit Data Contracts**  
   - Confirm the current shape of `plotPoints` and `collaboratorCategories`.  
   - Document any missing attributes needed for weights (trust, recency).
2. **Matrix Builders**  
   - Implement services that generate `A` (assignment matrix) and `W` (agreement matrix) from the existing database/API.  
   - Add unit tests covering edge cases (multiple collaborators, zero-weight categories).  
   - **Pseudo-code outline**

```ts
type PlotPoint = { id: string; collaboratorAssignments: Array<{ categoryId: string; weight?: number; }> };
type Matrix = number[][];

function buildAssignmentMatrix(points: PlotPoint[], categories: string[]): Matrix {
  const columnIndex = new Map(categories.map((c, idx) => [c, idx]));
  const A = Array(points.length).fill(0).map(() => Array(categories.length).fill(0));

  points.forEach((point, rowIdx) => {
    point.collaboratorAssignments.forEach(({ categoryId, weight = 1 }) => {
      const colIdx = columnIndex.get(categoryId);
      if (colIdx === undefined) return; // ignore unknown category
      A[rowIdx][colIdx] += weight;
    });
  });
  return A;
}

function buildAgreementMatrix(A: Matrix): Matrix {
  const rows = A.length;
  const W = Array(rows).fill(0).map(() => Array(rows).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = i; j < rows; j++) {
      const weight = dotProduct(A[i], A[j]);
      W[i][j] = W[j][i] = weight;
    }
  }
  return W;
}

function dotProduct(v1: number[], v2: number[]) {
  return v1.reduce((acc, val, idx) => acc + val * v2[idx], 0);
}
```

   - **Implementation notes**
     - Support streaming/batched construction for large `|P|` to avoid loading the whole matrix in memory; store sparse matrices when most entries are 0.
     - Normalize weights per collaborator (e.g., divide by number of points they labeled) if trust weighting is enabled.
     - Emit diagnostics (missing categories, duplicate assignments) so analytics teams can catch data quality issues before optimization steps run.
     - Provide an interface layer (`MatrixProvider`) so algorithm modes can request `A` or `W` with specific options (e.g., normalized, pruned, filtered to subset of plot points).
3. **Metric Library**  
   - Create reusable purity, entropy, coverage, agreement-gain calculators.  
   - Ensure they ingest generic `plotPoint → canonicalCategory` mappings so every algorithm mode can share them.  
   - **Pseudo-code outline**

```ts
type Assignment = { plotPointId: string; canonicalId: string };
type CategoryStats = Record<string, { total: number; byCollaborator: Record<string, number> }>;

function computePurity(stats: CategoryStats): Record<string, number> {
  const purity: Record<string, number> = {};
  Object.entries(stats).forEach(([canonicalId, { total, byCollaborator }]) => {
    const dominant = Math.max(...Object.values(byCollaborator));
    purity[canonicalId] = total === 0 ? 0 : dominant / total;
  });
  return purity;
}

function computeEntropy(stats: CategoryStats): Record<string, number> {
  const entropy: Record<string, number> = {};
  Object.entries(stats).forEach(([canonicalId, { total, byCollaborator }]) => {
    const H = Object.values(byCollaborator).reduce((acc, count) => {
      if (count === 0 || total === 0) return acc;
      const p = count / total;
      return acc - p * Math.log2(p);
    }, 0);
    entropy[canonicalId] = H;
  });
  return entropy;
}

function computeCoverage(assignments: Assignment[], totalPlotPoints: number) {
  const covered = new Set(assignments.map(a => a.plotPointId));
  return covered.size / totalPlotPoints;
}

function computeAgreementGain(W: number[][], canonicalMap: Record<string, string>): number {
  let intra = 0, inter = 0;
  const ids = Object.keys(canonicalMap);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const weight = W[i][j];
      if (canonicalMap[ids[i]] === canonicalMap[ids[j]]) intra += weight;
      else inter += weight;
    }
  }
  return intra - inter;
}
```

   - **Implementation notes**
     - Normalize entropy to `[0,1]` by dividing by `log2(#collaboratorCategories)` so owners can compare across runs.
     - Provide higher-order helpers (e.g., `buildCategoryStats(assignments, collaboratorLookup)`) so each algorithm mode only passes raw assignments.
     - Expose metric bundles via an interface (`MetricSuite.run(inputs) → MetricResult`) to keep API uniform.
     - Include unit tests with contrived datasets (single-category dominance, evenly mixed, empty clusters) to ensure metrics behave as expected.
4. **Algorithm Mode: Agreement Graph**  
   - Build modular graph construction + modularity optimization (Louvain or spectral).  
   - Wire metrics + prevalence tables; surface JSON schema for the UI.  
   - **Pseudo-code outline (Louvain-style)**

```ts
type Graph = { nodes: string[]; weights: number[][] }; // from W matrix

function runAgreementGraphMode(W: number[][], options: { targetK?: number; minClusterSize?: number }) {
  const graph = buildGraph(W);
  let communities = louvain(graph); // returns map nodeId -> communityId

  if (options.targetK && uniqueCount(communities) > options.targetK) {
    communities = mergeCommunities(communities, graph, options.targetK);
  } else if (options.targetK && uniqueCount(communities) < options.targetK) {
    communities = splitCommunities(communities, graph, options.targetK);
  }

  communities = enforceMinSize(communities, options.minClusterSize);
  const prevalence = computePrevalenceTables(communities);
  const metrics = MetricSuite.run({ communities, prevalence, W });

  return { communities, prevalence, metrics };
}

function buildGraph(W: number[][]): Graph {
  return { nodes: W.map((_, idx) => String(idx)), weights: W };
}

function louvain(graph: Graph): Record<string, string> {
  // standard Louvain phases: initialize singleton communities,
  // move nodes to maximize modularity gain, rebuild super-graph, repeat
}
```

   - **Implementation notes**
     - Keep graph representation sparse (e.g., adjacency lists storing only positive weights) to scale to thousands of plot points.
     - Modularize community post-processing so future objectives (ratio cut, normalized cut) reuse the same hooks.
     - Provide guard rails for disconnected components by labeling tiny isolates as `uncertain` or merging into nearest heavy cluster.
     - Emit structured run artifacts (`communities`, `prevalence`, `metrics`, `diagnostics`) for the UI + run history service.
5. **Algorithm Mode: Factorization**  
   - Add NMF/SVD runner with configurable rank, regularization, and convergence tolerances.  
   - Compare outputs against graph mode to validate shared metrics.  
   - **Pseudo-code outline (NMF)**

```ts
type FactorizationOptions = {
  rank: number;
  l1Reg?: number;
  maxIterations?: number;
  tolerance?: number;
  init?: 'random' | 'nndsvd';
};

function runFactorizationMode(A: Matrix, options: FactorizationOptions) {
  const { W, H } = nmf(A, options); // A ≈ W · H

  const canonicalAssignments = W.map((row, rowIdx) => {
    const canonicalId = argMax(row);
    return { plotPointIndex: rowIdx, canonicalId };
  });

  const prevalence = computePrevalenceTablesFromAssignments(canonicalAssignments, A);
  const metrics = MetricSuite.run({ assignments: canonicalAssignments, prevalence, W: null /* optional */ });

  return { canonicalAssignments, prevalence, metrics, diagnostics: { reconstructionError: frobeniusResidual(A, W, H) } };
}

function nmf(A: Matrix, options: FactorizationOptions) {
  // implement projected gradient or multiplicative updates
  // apply L1 regularization term to discourage diffuse memberships if l1Reg > 0
}
```

   - **Implementation notes**
     - Support both dense and sparse matrix backends; switch based on density threshold.
     - Add “soft assignment” output (top-N canonical memberships per plot point with weights) so UI can show uncertainty bars.
     - Provide multiple initialization strategies (random, NNDSVD) and allow seeding for reproducibility.
     - Record convergence curves (residual vs. iteration) and expose them to the run history for debugging stuck factorizations.
6. **Algorithm Mode: Consensus Labeling**  
   - Model ILP/metaheuristic solver with parameter hooks (`splitPenalty`, `mergePenalty`, etc.).  
   - Provide fallback heuristic for large datasets when ILP is infeasible.  
   - **Pseudo-code outline (hybrid ILP + simulated annealing)**

```ts
type ConsensusOptions = {
  targetK: number;
  splitPenalty: number;
  mergePenalty: number;
  balancePenalty?: number;
  annealing?: { startTemp: number; endTemp: number; steps: number };
};

function runConsensusMode(A: Matrix, options: ConsensusOptions) {
  if (A.length * options.targetK < 5_000) {
    return solveWithILP(A, options);
  }
  const initial = greedyInit(A, options.targetK);
  return refineWithAnnealing(initial, A, options);
}

function solveWithILP(A: Matrix, opts: ConsensusOptions) {
  // Variables x[p,k] ∈ {0,1}
  // Objective: minimize splitPenalty * splitCost + mergePenalty * mergeCost + balancePenalty * balanceCost
  // Constraints: Σ_k x[p,k] = 1  ∀p
  // Use MILP solver (e.g., OR-Tools) and return assignments + metrics
}

function refineWithAnnealing(state, A: Matrix, opts: ConsensusOptions) {
  let current = state;
  let temp = opts.annealing.startTemp;
  const cooling = Math.pow(opts.annealing.endTemp / temp, 1 / opts.annealing.steps);

  for (let step = 0; step < opts.annealing.steps; step++) {
    const neighbor = proposeMove(current, A);
    const delta = objective(neighbor, A, opts) - objective(current, A, opts);
    if (delta < 0 || Math.random() < Math.exp(-delta / temp)) current = neighbor;
    temp *= cooling;
  }

  return finalizeAssignments(current);
}
```

   - **Implementation notes**
     - `splitCost` can be derived from collaborator categories that are split across canonical IDs (e.g., sum of entropy per collaborator). `mergeCost` penalizes canonical categories containing low-agreement collaborator pairs.
     - Provide deterministic seeds for reproducibility and allow owners to set time budgets that cap annealing steps or MILP solve time.
     - For metaheuristics, expose diagnostics such as objective history, acceptance ratio, and temperature schedule to help debugging.
     - Build an “explain moves” helper that surfaces the highest-impact swaps/merges so owners understand why the algorithm made certain decisions.
7. **Algorithm Mode: Hierarchical Merge/Split**  
   - Implement merge heuristic + optional entropy-based auto-split.  
   - Expose dendrogram/step data for the UI elbow plot.  
   - **Pseudo-code outline**

```ts
type HierarchicalOptions = {
  stoppingCriterion: { type: 'count' | 'purity' | 'delta'; value: number };
  linkageMetric: 'entropy' | 'agreement' | 'hybrid';
  autoSplit?: { entropyThreshold: number };
};

function runHierarchicalMode(A: Matrix, options: HierarchicalOptions) {
  let clusters = initClustersFromCollaboratorCategories(A);
  const history: Array<{ step: number; merged: [string, string]; score: number; }> = [];

  while (!shouldStop(clusters, history, options)) {
    const pair = findBestMerge(clusters, options.linkageMetric);
    if (!pair) break;
    clusters = mergeClusters(clusters, pair);
    const score = computeGlobalScore(clusters, options.linkageMetric);
    history.push({ step: history.length + 1, merged: pair, score });
  }

  if (options.autoSplit) {
    clusters = autoSplitHighEntropy(clusters, options.autoSplit.entropyThreshold);
  }

  const prevalence = computePrevalenceTablesFromClusters(clusters);
  const metrics = MetricSuite.run({ clusters, prevalence, A });

  return { clusters, prevalence, metrics, history };
}
```

   - **Implementation notes**
     - `findBestMerge` can leverage a priority queue keyed by linkage cost to avoid recomputing all pairs each iteration.
     - Record dendrogram-friendly data (`step`, `pair`, `score`, cluster ids) so the UI can draw the merge tree and elbow plot.
     - Provide safeguards for oscillations: if `delta` criterion is selected and merges no longer improve the objective, terminate even before hitting the target count.
     - For `autoSplit`, evaluate cluster entropy and recursively split via k-means on collaborator distributions (still label-aware) until entropy falls below the threshold or clusters would become too small.
8. **Run Orchestrator + History Store**  
   - Unify parameter schemas, kick off selected algorithm mode, persist run configs/results, and expose comparison diffs.  
   - **Pseudo-code outline**

```ts
type RunConfig = {
  id: string;
  algorithm: 'graph' | 'factorization' | 'consensus' | 'hierarchical';
  parameters: Record<string, unknown>;
};

class CanonicalizationOrchestrator {
  constructor(private matrixProvider: MatrixProvider, private historyStore: RunHistoryStore, private metricSuite: MetricSuite) {}

  async run(config: RunConfig) {
    const matrices = await this.matrixProvider.prepare(config.algorithm, config.parameters);
    const runner = this.selectRunner(config.algorithm);
    const result = await runner.execute(matrices, config.parameters);

    const enriched = {
      ...result,
      metrics: this.metricSuite.run(result),
      timestamp: new Date().toISOString(),
      config,
    };

    await this.historyStore.save(enriched);
    return enriched;
  }

  selectRunner(algorithm: RunConfig['algorithm']) {
    switch (algorithm) {
      case 'graph': return new GraphRunner();
      case 'factorization': return new FactorizationRunner();
      case 'consensus': return new ConsensusRunner();
      case 'hierarchical': return new HierarchicalRunner();
    }
  }
}
```

   - **Implementation notes**
     - Define a normalized `RunResult` schema (`assignments`, `prevalence`, `metrics`, `diagnostics`, `artifactRefs`) so the UI doesn’t care which algorithm produced it.
     - History store should support querying by group id, date range, and algorithm for comparison charts; consider lightweight event sourcing or append-only table.
     - Capture diff snapshots (plot points that changed canonical assignments, metric deltas) during orchestrator execution to avoid recomputing in the UI.
     - Add retry/backoff + alerting hooks so failed runs (e.g., factorization didn’t converge) surface meaningful errors to the owner tab instead of generic “500”.
9. **Canonicalization Lab UI Shell**  
   - Scaffold parameter rail, summary cards, visualization panel, cluster detail drawer, and run history sidebar with mocked data.  
   - **Pseudo-code outline (React-esque)**

```tsx
const CanonicalizationLab = () => {
  const [mockRun, setMockRun] = useState<RunResult>(loadFixture());
  const [params, setParams] = useState<OwnerParams>(defaultParams);

  return (
    <Page>
      <ParameterRail params={params} onChange={setParams} onRun={() => triggerMockRun(params, setMockRun)} />
      <MainPane>
        <RunSummaryCards metrics={mockRun.metrics} diagnostics={mockRun.diagnostics} />
        <VisualizationPanel
          canonicalBars={<StackedBarChart data={mockRun.prevalence} />}
          metricsTable={<MetricsTable metrics={mockRun.metricsPerCluster} />}
          auxiliaryChart={<AgreementHeatmap data={mockRun.agreementSample} />}
        />
      </MainPane>
      <HistorySidebar runs={mockRunHistory} onSelect={setMockRun} />
      <ClusterDrawer selected={mockRun.selectedCluster} onClose={…} />
    </Page>
  );
};
```

   - **Implementation notes**
     - Mock API layer should support multiple fixture scenarios (high agreement, fragmented, noisy) to validate UI states before backend integration.
     - Break components into Storybook stories (ParameterRail, SummaryCards, ClusterDrawer) to iterate on interactions with design.
     - Include loading/error/empty states from day one so connecting the real orchestrator is seamless.
     - Instrument key interactions (parameter tweaks, run comparisons) with analytics hooks to understand owner workflows once shipped.
10. **Wire Real Data to UI**  
    - Connect API endpoints delivering run results, prevalence tables, and metrics.  
    - Add diff overlays, warning badges, and export actions.  
    - **Pseudo-code outline**

```ts
async function fetchRun(runId: string): Promise<RunResult> {
  const res = await fetch(`/api/canonicalization/runs/${runId}`);
  if (!res.ok) throw new Error('Failed to load run');
  return res.json();
}

function useRun(runId: string) {
  return useQuery(['run', runId], () => fetchRun(runId), { staleTime: 60_000 });
}

function CanonicalizationLabContainer() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: run, isLoading, error } = useRun(selectedRunId ?? 'latest');
  const diff = useRunDiff(selectedRunId, previousRunId);

  return (
    <CanonicalizationLab
      run={run}
      diff={diff}
      loading={isLoading}
      error={error}
      onSelectRun={setSelectedRunId}
      onDownload={() => downloadReport(run?.id)}
    />
  );
}
```

    - **Implementation notes**
      - Use a typed client (`zod`/`io-ts`) to validate API payloads so the UI fails loudly if schemas drift.
      - Cache recent runs client-side to enable instant comparisons without refetching.
      - Diff overlays should highlight plot points whose canonical assignment changed plus metric deltas (e.g., `purity +0.04`), ideally with color-coding.
      - Export action can produce CSV/JSON with canonical mapping, prevalence tables, and metrics for offline review; ensure it respects pagination/filters.
11. **Owner Workflow Enhancements**  
    - Implement merge/split/rename actions inside the UI; cascade changes back to the data store.  
    - Add notifications and audit logging for accepted canonical runs.  
    - **Pseudo-code outline**

```ts
async function renameCanonical(id: string, newName: string) {
  await fetch(`/api/canonicalization/canonical/${id}/name`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
}

async function mergeCanonical(targetId: string, sourceId: string) {
  await fetch(`/api/canonicalization/canonical/${targetId}/merge`, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

async function splitCanonical(id: string, payload: SplitPayload) {
  await fetch(`/api/canonicalization/canonical/${id}/split`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

    - **Implementation notes**
      - Surface optimistic UI updates with rollback on failure; show inline toasts explaining why an operation failed (e.g., insufficient plot points).
      - Log every owner action with metadata (user id, run id, diff summary) so audit trails explain how canonical categories evolved.
      - Notify collaborators when a canonical run is “accepted” (e.g., via email or in-app feed) including highlights of major changes.
      - Provide undo/redo stack for editing session so owners can safely experiment before finalizing changes.
12. **QA & Observability**  
    - Instrument algorithm runtimes, convergence stats, and UI interactions.  
    - Build regression tests comparing metrics across sample datasets to guard against algorithm drift.  
    - **Pseudo-code outline**

```ts
function instrumentRun(runId: string, meta: { algorithm: string; durationMs: number; metrics: MetricResult }) {
  analytics.track('canonicalization.run.completed', {
    runId,
    algorithm: meta.algorithm,
    durationMs: meta.durationMs,
    silhouette: meta.metrics.overallSilhouette,
    coverage: meta.metrics.coverage,
  });
}

test('purity regression - baseline dataset', () => {
  const baseline = loadFixture('baselineAssignments.json');
  const result = runAgreementGraphMode(baseline.matrix, { targetK: 4 });
  expect(result.metrics.puritySummary).toMatchSnapshot();
});
```

    - **Implementation notes**
      - Capture per-mode observability (iterations to converge, number of merges, acceptance rate) and expose dashboards so ops can detect anomalies.
      - Build nightly regression suite running all modes against curated datasets to flag changes in purity/entropy/coverage beyond tolerance.
      - Add smoke tests for API endpoints (orchestrator + UI) ensuring schema validation and permission checks stay intact.
      - Use feature flags/kill switches to disable problematic modes quickly if regression tests detect issues post-deployment.
