import { buildAgreementMatrix, type AssignmentMatrixResult } from './canonicalMatrices.ts';

type SimilarityMatrix = ReturnType<typeof buildAgreementMatrix>;

export interface AutoKSeriesPoint {
  k: number;
  cost: number;
  similarity: number;
}

export interface AutoKGapPoint {
  k: number;
  gap: number;
  threshold: number;
  reference: number;
  observed: number;
}

export interface AutoKDiagnostics {
  selectedK: number;
  reason: 'gap' | 'elbow' | 'fallback';
  candidateRange: { min: number; max: number };
  elbow?: {
    suggestedK: number | null;
    series: AutoKSeriesPoint[];
    distanceScores: Array<{ k: number; distance: number }>;
  };
  gap?: {
    suggestedK: number | null;
    series: AutoKGapPoint[];
  };
}

export interface AutoKOptions {
  assignment: AssignmentMatrixResult;
  minK?: number;
  maxK?: number;
  referenceRuns?: number;
  rng?: () => number;
}

const DEFAULT_MIN_K = 2;
const DEFAULT_MAX_K = 12;
const EPSILON = 1e-6;

interface Cluster {
  id: string;
  members: number[];
}

export function autoDetectCategoryCount(options: AutoKOptions): AutoKDiagnostics {
  const pointCount = options.assignment.plotPointIds.length;
  const minCandidate = Math.max(DEFAULT_MIN_K, options.minK ?? DEFAULT_MIN_K);
  const rawMax = options.maxK ?? DEFAULT_MAX_K;
  const maxCandidate = Math.min(rawMax, Math.max(minCandidate, pointCount - 1));

  const fallbackK = fallbackTarget(pointCount, minCandidate, rawMax);

  if (pointCount < 2 || maxCandidate < minCandidate) {
    return {
      selectedK: fallbackK,
      reason: 'fallback',
      candidateRange: { min: minCandidate, max: Math.max(minCandidate, maxCandidate) },
    };
  }

  const candidateKs: number[] = [];
  for (let k = minCandidate; k <= maxCandidate; k += 1) {
    candidateKs.push(k);
  }

  const normalizedAgreement = buildAgreementMatrix(options.assignment, {
    normalize: true,
  });
  const costSeries = buildCostSeries(normalizedAgreement, minCandidate);

  const series = candidateKs
    .map((k) => buildSeriesPoint(k, costSeries))
    .filter((point): point is AutoKSeriesPoint => Boolean(point));

  if (series.length === 0) {
    return {
      selectedK: fallbackK,
      reason: 'fallback',
      candidateRange: { min: minCandidate, max: maxCandidate },
    };
  }

  const elbow = detectElbow(series);

  const referenceRuns = options.referenceRuns ?? defaultReferenceRuns(pointCount);
  const rng = options.rng ?? Math.random;
  const referenceSeries = buildReferenceSeries({
    assignment: options.assignment,
    minCandidate,
    runs: referenceRuns,
    rng,
  });
  const gap = referenceSeries.length
    ? detectGap(series, referenceSeries)
    : undefined;

  const selectedFromGap = gap?.suggestedK ?? null;
  const selectedFromElbow = elbow?.suggestedK ?? null;

  const selectedK = clampK(
    selectedFromGap ?? selectedFromElbow ?? fallbackK,
    minCandidate,
    maxCandidate,
  );

  const reason: AutoKDiagnostics['reason'] = selectedFromGap
    ? 'gap'
    : selectedFromElbow
      ? 'elbow'
      : 'fallback';

  return {
    selectedK,
    reason,
    candidateRange: { min: minCandidate, max: maxCandidate },
    elbow: elbow
      ? {
          suggestedK: elbow.suggestedK,
          series,
          distanceScores: elbow.distances,
        }
      : undefined,
    gap: gap
      ? {
          suggestedK: gap.suggestedK,
          series: gap.series,
        }
      : undefined,
  };
}

function fallbackTarget(pointCount: number, minCandidate: number, rawMax: number) {
  if (pointCount <= 1) return 1;
  const upper = Math.min(rawMax, Math.max(minCandidate, pointCount - 1));
  if (upper < minCandidate) {
    return Math.min(pointCount, rawMax);
  }
  const midpoint = Math.floor((minCandidate + upper) / 2);
  return clampK(midpoint, minCandidate, upper);
}

function clampK(value: number, min: number, max: number) {
  if (min > max) return min;
  return Math.min(max, Math.max(min, value));
}

function buildSeriesPoint(k: number, costSeries: Map<number, number>): AutoKSeriesPoint | null {
  const cost = costSeries.get(k);
  if (typeof cost !== 'number' || Number.isNaN(cost)) return null;
  const similarity = Math.max(0, Math.min(1, 1 - cost));
  return { k, cost, similarity };
}

function buildCostSeries(
  agreement: SimilarityMatrix,
  minCandidate: number,
): Map<number, number> {
  const clusters: Cluster[] = agreement.plotPointIds.map((id, idx) => ({
    id,
    members: [idx],
  }));

  const costs = new Map<number, number>();
  let currentCount = clusters.length;

  while (currentCount > minCandidate) {
    const merge = findBestMerge(clusters, agreement.matrix);
    if (!merge) break;

    const distance = 1 - Math.max(0, Math.min(1, merge.similarity));
    const nextCount = currentCount - 1;
    costs.set(nextCount, distance);
    mergeClusters(clusters, merge.pair);
    currentCount = nextCount;
  }

  return costs;
}

function findBestMerge(clusters: Cluster[], matrix: number[][]) {
  if (clusters.length < 2) return null;
  let bestPair: [Cluster, Cluster] | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const similarity = averageSimilarity(clusters[i], clusters[j], matrix);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestPair = [clusters[i], clusters[j]];
      }
    }
  }

  if (!bestPair || !Number.isFinite(bestScore)) return null;
  return { pair: bestPair, similarity: bestScore };
}

function averageSimilarity(clusterA: Cluster, clusterB: Cluster, matrix: number[][]) {
  let total = 0;
  let count = 0;
  clusterA.members.forEach((idxA) => {
    clusterB.members.forEach((idxB) => {
      total += matrix[idxA]?.[idxB] ?? 0;
      count += 1;
    });
  });
  if (count === 0) return 0;
  return total / count;
}

function mergeClusters(clusters: Cluster[], pair: [Cluster, Cluster]) {
  const [a, b] = pair;
  const merged: Cluster = {
    id: `${a.id}|${b.id}`,
    members: [...a.members, ...b.members],
  };
  const survivors = clusters.filter((cluster) => cluster !== a && cluster !== b);
  survivors.push(merged);
  clusters.splice(0, clusters.length, ...survivors);
}

function detectElbow(series: AutoKSeriesPoint[]) {
  if (series.length < 3) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const distances: Array<{ k: number; distance: number }> = [];

  const denominator = Math.hypot(last.k - first.k, last.cost - first.cost) || 1;

  series.forEach((point) => {
    const numerator = Math.abs(
      (last.cost - first.cost) * point.k -
        (last.k - first.k) * point.cost +
        last.k * first.cost -
        last.cost * first.k,
    );
    const distance = numerator / denominator;
    distances.push({ k: point.k, distance });
  });

  distances.sort((a, b) => b.distance - a.distance);
  const suggested = distances[0];
  return suggested ? { suggestedK: suggested.k, distances } : null;
}

function defaultReferenceRuns(pointCount: number) {
  if (pointCount > 200) return 2;
  if (pointCount > 80) return 3;
  return 4;
}

function buildReferenceSeries(args: {
  assignment: AssignmentMatrixResult;
  minCandidate: number;
  runs: number;
  rng: () => number;
}): Map<number, number>[] {
  const references: Map<number, number>[] = [];
  for (let i = 0; i < args.runs; i += 1) {
    const randomized = randomizeAssignment(args.assignment, args.rng);
    const agreement = buildAgreementMatrix(randomized, { normalize: true });
    references.push(buildCostSeries(agreement, args.minCandidate));
  }
  return references;
}

function randomizeAssignment(
  assignment: AssignmentMatrixResult,
  rng: () => number,
): AssignmentMatrixResult {
  const matrix = assignment.matrix.map((row) => shuffleRow([...row], rng));
  return {
    matrix,
    plotPointIds: assignment.plotPointIds,
    categoryIds: assignment.categoryIds,
  };
}

function shuffleRow(row: number[], rng: () => number) {
  for (let i = row.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = row[i];
    row[i] = row[j];
    row[j] = temp;
  }
  return row;
}

function detectGap(
  series: AutoKSeriesPoint[],
  references: Map<number, number>[],
) {
  if (series.length === 0 || references.length === 0) return null;

  const gapSeries: AutoKGapPoint[] = series.map((point) => {
    const observed = Math.log(point.cost + EPSILON);
    const refValues = references.map((ref) =>
      Math.log((ref.get(point.k) ?? point.cost) + EPSILON),
    );
    const reference = average(refValues);
    const stdDev = standardDeviation(refValues, reference);
    const threshold = stdDev * Math.sqrt(1 + 1 / references.length);
    return {
      k: point.k,
      gap: reference - observed,
      threshold,
      reference,
      observed,
    };
  });

  for (let i = 0; i < gapSeries.length - 1; i += 1) {
    if (gapSeries[i].gap >= gapSeries[i + 1].gap - gapSeries[i + 1].threshold) {
      return {
        suggestedK: gapSeries[i].k,
        series: gapSeries,
      };
    }
  }

  const best = [...gapSeries].sort((a, b) => b.gap - a.gap)[0];
  return {
    suggestedK: best?.k ?? null,
    series: gapSeries,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function standardDeviation(values: number[], mean: number) {
  if (values.length === 0) return 0;
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}
