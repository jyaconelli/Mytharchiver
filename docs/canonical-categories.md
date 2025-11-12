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
4. **Algorithm Mode: Agreement Graph**  
   - Build modular graph construction + modularity optimization (Louvain or spectral).  
   - Wire metrics + prevalence tables; surface JSON schema for the UI.
5. **Algorithm Mode: Factorization**  
   - Add NMF/SVD runner with configurable rank, regularization, and convergence tolerances.  
   - Compare outputs against graph mode to validate shared metrics.
6. **Algorithm Mode: Consensus Labeling**  
   - Model ILP/metaheuristic solver with parameter hooks (`splitPenalty`, `mergePenalty`, etc.).  
   - Provide fallback heuristic for large datasets when ILP is infeasible.
7. **Algorithm Mode: Hierarchical Merge/Split**  
   - Implement merge heuristic + optional entropy-based auto-split.  
   - Expose dendrogram/step data for the UI elbow plot.
8. **Run Orchestrator + History Store**  
   - Unify parameter schemas, kick off selected algorithm mode, persist run configs/results, and expose comparison diffs.
9. **Canonicalization Lab UI Shell**  
   - Scaffold parameter rail, summary cards, visualization panel, cluster detail drawer, and run history sidebar with mocked data.
10. **Wire Real Data to UI**  
    - Connect API endpoints delivering run results, prevalence tables, and metrics.  
    - Add diff overlays, warning badges, and export actions.
11. **Owner Workflow Enhancements**  
    - Implement merge/split/rename actions inside the UI; cascade changes back to the data store.  
    - Add notifications and audit logging for accepted canonical runs.
12. **QA & Observability**  
    - Instrument algorithm runtimes, convergence stats, and UI interactions.  
    - Build regression tests comparing metrics across sample datasets to guard against algorithm drift.
