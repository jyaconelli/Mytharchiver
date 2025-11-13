import type {
  AssignmentMatrixResult,
  AgreementMatrixResult,
} from './canonicalMatrices.ts';
import type { CollaboratorCategoryAssignment } from './mythTypes.ts';
import { MetricSuite } from './metrics.ts';
import { buildPrevalence } from './utils.ts';
import type {
  CanonicalAssignment,
  CanonicalizationAlgorithm,
  CanonicalizationInput,
  CanonicalizationParameters,
  CanonicalizationResult,
} from './types.ts';

export type OptimizationGoal = 'purity' | 'variance' | 'consensus';

export interface DirectiveSearchParams extends CanonicalizationParameters {
  targetCanonicalCount?: number;
  minClusterSize?: number;
  maxIterations?: number;
  optimizationGoal?: OptimizationGoal;
}

interface DirectiveCluster {
  id: string;
  medoid: string;
  members: Set<string>;
}

interface DirectiveState {
  clusters: Map<string, DirectiveCluster>;
  assignment: Map<string, string>;
}

interface CollaboratorStats {
  perPoint: Map<string, Record<string, number>>;
  universeSize: number;
}

type AgreementLookup = Map<string, Map<string, number>>;

interface DirectiveCaches {
  vectors: Map<string, number[]>;
  collaborator: CollaboratorStats;
  agreement: AgreementLookup;
}

const EPSILON = 1e-6;

export class DirectiveSearchRunner
  implements CanonicalizationAlgorithm<DirectiveSearchParams>
{
  readonly mode = 'directive';

  async run(
    input: CanonicalizationInput,
    params: DirectiveSearchParams,
  ): Promise<CanonicalizationResult> {
    const assignment = input.assignment;
    if (!assignment) {
      throw new Error(
        'Directive search mode requires an assignment matrix. Pass one via MatrixProvider.',
      );
    }

    const goal: OptimizationGoal = params.optimizationGoal ?? 'purity';
    const plotPointCount = input.plotPoints.length;
    if (plotPointCount === 0) {
      return {
        assignments: [],
        prevalence: [],
        metrics: {
          coverage: 0,
          purityByCanonical: {},
          entropyByCanonical: {},
        },
        diagnostics: {
          iterations: 0,
          objective: 0,
          goal,
          effectiveMinClusterSize: 0,
          targetCanonicalCount: 0,
        },
      };
    }

    const targetCount = clampTargetCount(
      params.targetCanonicalCount,
      plotPointCount,
    );
    const effectiveMinClusterSize = computeEffectiveMinClusterSize(
      params.minClusterSize ?? 1,
      plotPointCount,
      targetCount,
    );

    const caches = buildCaches(assignment, input, goal);
    let state = initializeState(
      assignment,
      targetCount,
      effectiveMinClusterSize,
      caches,
    );

    let score = evaluateState(state, caches, goal);
    const maxIterations = params.maxIterations ?? 50;
    let iterations = 0;

    for (; iterations < maxIterations; iterations += 1) {
      const move = findBestMove(
        state,
        caches,
        goal,
        effectiveMinClusterSize,
      );
      if (!move || move.delta <= EPSILON) {
        break;
      }

      applyMove(state, move, caches.vectors);
      score += move.delta;
    }

    const assignments = buildAssignments(state);
    const prevalence = buildPrevalence(assignments, input);
    const metrics = MetricSuite.run({
      assignments,
      canonicalInput: input,
    });

    return {
      assignments,
      prevalence,
      metrics,
      diagnostics: {
        iterations,
        objective: Number(score.toFixed(4)),
        goal,
        targetCanonicalCount: targetCount,
        effectiveMinClusterSize,
        moveAttempts: iterations,
      },
    };
  }
}

function clampTargetCount(
  requested: number | undefined,
  plotPointCount: number,
) {
  if (plotPointCount === 0) return 0;
  if (typeof requested === 'number' && requested >= 1) {
    return Math.min(requested, plotPointCount);
  }
  return Math.min(5, plotPointCount);
}

function computeEffectiveMinClusterSize(
  requested: number,
  plotPointCount: number,
  clusterCount: number,
) {
  if (clusterCount === 0) return 0;
  const feasibleMax = Math.max(1, Math.floor(plotPointCount / clusterCount));
  const normalized = Math.max(1, Math.floor(requested));
  return Math.min(normalized, feasibleMax);
}

function buildCaches(
  assignment: AssignmentMatrixResult,
  input: CanonicalizationInput,
  goal: OptimizationGoal,
): DirectiveCaches {
  const vectors = buildPointVectors(assignment);
  const collaborator = buildCollaboratorStats(input.plotPoints);
  const agreement = buildAgreementLookup(
    input.agreement,
    assignment,
    vectors,
    goal,
  );
  return { vectors, collaborator, agreement };
}

function buildPointVectors(assignment: AssignmentMatrixResult) {
  const map = new Map<string, number[]>();
  assignment.plotPointIds.forEach((id, idx) => {
    map.set(id, assignment.matrix[idx] ?? []);
  });
  return map;
}

function buildCollaboratorStats(
  plotPoints: CanonicalizationInput['plotPoints'],
): CollaboratorStats {
  const perPoint = new Map<string, Record<string, number>>();
  const universe = new Set<string>();

  plotPoints.forEach((point) => {
    const histogram: Record<string, number> = {};
    point.collaboratorCategories?.forEach((assignment) => {
      const key = collaboratorKey(assignment);
      histogram[key] = (histogram[key] ?? 0) + 1;
      universe.add(key);
    });
    perPoint.set(point.id, histogram);
  });

  return {
    perPoint,
    universeSize: Math.max(1, universe.size),
  };
}

function buildAgreementLookup(
  agreement: AgreementMatrixResult | undefined,
  assignment: AssignmentMatrixResult,
  vectors: Map<string, number[]>,
  goal: OptimizationGoal,
): AgreementLookup {
  if (goal !== 'consensus') return new Map();
  if (agreement) {
    return agreement.plotPointIds.reduce((map, id, row) => {
      const target =
        map.get(id) ??
        map.set(id, new Map<string, number>()).get(id)!;
      agreement.plotPointIds.forEach((otherId, col) => {
        if (row === col) return;
        const weight = agreement.matrix[row]?.[col] ?? 0;
        if (weight > 0) {
          target.set(otherId, weight);
        }
      });
      return map;
    }, new Map<string, Map<string, number>>());
  }

  // Fall back to cosine similarity if no agreement matrix is available.
  const lookup = new Map<string, Map<string, number>>();
  const ids = assignment.plotPointIds;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const idA = ids[i];
      const idB = ids[j];
      const weight = cosineSimilarity(
        vectors.get(idA) ?? [],
        vectors.get(idB) ?? [],
      );
      if (weight <= 0) continue;
      const rowA =
        lookup.get(idA) ?? lookup.set(idA, new Map<string, number>()).get(idA)!;
      rowA.set(idB, weight);
      const rowB =
        lookup.get(idB) ?? lookup.set(idB, new Map<string, number>()).get(idB)!;
      rowB.set(idA, weight);
    }
  }
  return lookup;
}

function initializeState(
  assignment: AssignmentMatrixResult,
  clusterCount: number,
  minClusterSize: number,
  caches: DirectiveCaches,
): DirectiveState {
  const medoids = selectInitialMedoids(
    assignment.plotPointIds,
    caches.vectors,
    clusterCount,
  );

  const clusters = new Map<string, DirectiveCluster>();
  const assignmentMap = new Map<string, string>();

  medoids.forEach((medoidId, index) => {
    const id = buildClusterId(index);
    clusters.set(id, {
      id,
      medoid: medoidId,
      members: new Set(),
    });
  });

  assignment.plotPointIds.forEach((pointId) => {
    const clusterId = findClosestCluster(pointId, clusters, caches.vectors);
    if (!clusterId) return;
    clusters.get(clusterId)?.members.add(pointId);
    assignmentMap.set(pointId, clusterId);
  });

  rebalanceEmptyClusters(clusters, assignmentMap, caches.vectors, minClusterSize);

  return { clusters, assignment: assignmentMap };
}

function buildClusterId(index: number) {
  return `directive-${index + 1}`;
}

function selectInitialMedoids(
  plotPointIds: string[],
  vectors: Map<string, number[]>,
  clusterCount: number,
) {
  if (plotPointIds.length === 0) return [];
  const sorted = [...plotPointIds].sort();
  const medoids: string[] = [];

  let first = sorted[0];
  let bestNorm = -Infinity;
  sorted.forEach((id) => {
    const norm = l2Norm(vectors.get(id) ?? []);
    if (norm > bestNorm) {
      bestNorm = norm;
      first = id;
    }
  });
  medoids.push(first);

  while (medoids.length < clusterCount && medoids.length < sorted.length) {
    let candidate: string | null = null;
    let farthest = -Infinity;
    sorted.forEach((id) => {
      if (medoids.includes(id)) return;
      const distance = medoids.reduce((minDistance, medoid) => {
        const value = cosineDistance(
          vectors.get(id) ?? [],
          vectors.get(medoid) ?? [],
        );
        return Math.min(minDistance, value);
      }, Infinity);
      if (distance > farthest) {
        farthest = distance;
        candidate = id;
      }
    });
    if (!candidate) break;
    medoids.push(candidate);
  }

  if (medoids.length < clusterCount) {
    sorted.forEach((id) => {
      if (medoids.includes(id) || medoids.length >= clusterCount) return;
      medoids.push(id);
    });
  }

  return medoids;
}

function findClosestCluster(
  pointId: string,
  clusters: Map<string, DirectiveCluster>,
  vectors: Map<string, number[]>,
) {
  let closest: string | null = null;
  let bestDistance = Infinity;
  clusters.forEach((cluster) => {
    const distance = cosineDistance(
      vectors.get(pointId) ?? [],
      vectors.get(cluster.medoid) ?? [],
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = cluster.id;
    }
  });
  return closest;
}

function rebalanceEmptyClusters(
  clusters: Map<string, DirectiveCluster>,
  assignment: Map<string, string>,
  vectors: Map<string, number[]>,
  minClusterSize: number,
) {
  const emptyClusters = Array.from(clusters.values()).filter(
    (cluster) => cluster.members.size === 0,
  );

  emptyClusters.forEach((cluster) => {
    const donor = findLargestCluster(clusters, minClusterSize);
    if (!donor) return;
    const candidate = findFarthestMember(donor, vectors);
    if (!candidate) return;

    donor.members.delete(candidate);
    cluster.members.add(candidate);
    assignment.set(candidate, cluster.id);
    cluster.medoid = candidate;
    donor.medoid = findMedoid(donor, vectors) ?? donor.medoid;
  });
}

function findLargestCluster(
  clusters: Map<string, DirectiveCluster>,
  minClusterSize: number,
) {
  let largest: DirectiveCluster | null = null;
  clusters.forEach((cluster) => {
    if (cluster.members.size <= minClusterSize) return;
    if (!largest || cluster.members.size > largest.members.size) {
      largest = cluster;
    }
  });
  return largest;
}

function findFarthestMember(
  cluster: DirectiveCluster,
  vectors: Map<string, number[]>,
) {
  let candidate: string | null = null;
  let farthest = -Infinity;
  cluster.members.forEach((pointId) => {
    const distance = cosineDistance(
      vectors.get(pointId) ?? [],
      vectors.get(cluster.medoid) ?? [],
    );
    if (distance > farthest) {
      farthest = distance;
      candidate = pointId;
    }
  });
  return candidate;
}

function findMedoid(cluster: DirectiveCluster, vectors: Map<string, number[]>) {
  if (cluster.members.size === 0) return undefined;
  let medoid: string | undefined;
  let bestScore = Infinity;

  cluster.members.forEach((candidate) => {
    let sum = 0;
    cluster.members.forEach((other) => {
      if (candidate === other) return;
      sum += cosineDistance(
        vectors.get(candidate) ?? [],
        vectors.get(other) ?? [],
      );
    });
    if (sum < bestScore) {
      bestScore = sum;
      medoid = candidate;
    }
  });

  return medoid ?? cluster.medoid;
}

interface ProposedMove {
  pointId: string;
  fromClusterId: string;
  toClusterId: string;
  delta: number;
  nextSourceScore: number;
  nextTargetScore: number;
}

function findBestMove(
  state: DirectiveState,
  caches: DirectiveCaches,
  goal: OptimizationGoal,
  minClusterSize: number,
) {
  let best: ProposedMove | null = null;
  const clusterScores = evaluateClusters(state, caches, goal);

  state.assignment.forEach((clusterId, pointId) => {
    const sourceCluster = state.clusters.get(clusterId);
    if (!sourceCluster) return;
    if (sourceCluster.members.size - 1 < minClusterSize) return;

    state.clusters.forEach((targetCluster) => {
      if (targetCluster.id === clusterId) return;
      const move = evaluateMove(
        pointId,
        sourceCluster,
        targetCluster,
        caches,
        goal,
        clusterScores,
      );
      if (!move) return;
      if (!best || move.delta > best.delta + EPSILON) {
        best = move;
      }
    });
  });

  return best;
}

function evaluateClusters(
  state: DirectiveState,
  caches: DirectiveCaches,
  goal: OptimizationGoal,
) {
  const scores = new Map<string, number>();
  state.clusters.forEach((cluster) => {
    scores.set(cluster.id, clusterScore(cluster, caches, goal));
  });
  return scores;
}

function evaluateState(
  state: DirectiveState,
  caches: DirectiveCaches,
  goal: OptimizationGoal,
) {
  let total = 0;
  state.clusters.forEach((cluster) => {
    total += clusterScore(cluster, caches, goal);
  });
  return total;
}

function evaluateMove(
  pointId: string,
  sourceCluster: DirectiveCluster,
  targetCluster: DirectiveCluster,
  caches: DirectiveCaches,
  goal: OptimizationGoal,
  clusterScores: Map<string, number>,
): ProposedMove | null {
  const sourceMembers = arrayExcluding(sourceCluster.members, pointId);
  const targetMembers = [...targetCluster.members, pointId];

  const currentSourceScore = clusterScores.get(sourceCluster.id) ?? 0;
  const currentTargetScore = clusterScores.get(targetCluster.id) ?? 0;

  const nextSourceScore = clusterScoreFromMembers(
    sourceMembers,
    caches,
    goal,
  );
  const nextTargetScore = clusterScoreFromMembers(
    targetMembers,
    caches,
    goal,
  );

  const delta =
    nextSourceScore + nextTargetScore - (currentSourceScore + currentTargetScore);

  return {
    pointId,
    fromClusterId: sourceCluster.id,
    toClusterId: targetCluster.id,
    delta,
    nextSourceScore,
    nextTargetScore,
  };
}

function arrayExcluding<T>(set: Set<T>, value: T) {
  const next: T[] = [];
  set.forEach((item) => {
    if (item === value) return;
    next.push(item);
  });
  return next;
}

function clusterScore(
  cluster: DirectiveCluster,
  caches: DirectiveCaches,
  goal: OptimizationGoal,
) {
  return clusterScoreFromMembers(
    Array.from(cluster.members),
    caches,
    goal,
  );
}

function clusterScoreFromMembers(
  members: string[],
  caches: DirectiveCaches,
  goal: OptimizationGoal,
) {
  if (members.length === 0) return 0;
  if (goal === 'purity') {
    return purityScore(members, caches.collaborator);
  }
  if (goal === 'variance') {
    return varianceScore(members, caches.collaborator);
  }
  return consensusScore(members, caches.agreement);
}

function purityScore(
  members: string[],
  collaborator: CollaboratorStats,
) {
  const histogram = aggregateCollaborators(members, collaborator.perPoint);
  const values = Object.values(histogram);
  if (values.length === 0) return 0;
  const dominant = Math.max(...values, 0);
  return dominant;
}

function varianceScore(
  members: string[],
  collaborator: CollaboratorStats,
) {
  const histogram = aggregateCollaborators(members, collaborator.perPoint);
  const total = Object.values(histogram).reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;

  const entropy = computeNormalizedEntropy(histogram, collaborator.universeSize);
  return entropy * members.length;
}

function consensusScore(
  members: string[],
  agreement: AgreementLookup,
) {
  if (members.length <= 1) return 0;
  let score = 0;
  for (let i = 0; i < members.length; i += 1) {
    const current = members[i];
    const neighbors = agreement.get(current);
    if (!neighbors) continue;
    for (let j = i + 1; j < members.length; j += 1) {
      const other = members[j];
      score += neighbors.get(other) ?? 0;
    }
  }
  return score;
}

function aggregateCollaborators(
  members: string[],
  perPoint: Map<string, Record<string, number>>,
) {
  const histogram: Record<string, number> = {};
  members.forEach((pointId) => {
    const data = perPoint.get(pointId);
    if (!data) return;
    Object.entries(data).forEach(([key, value]) => {
      histogram[key] = (histogram[key] ?? 0) + value;
    });
  });
  return histogram;
}

function computeNormalizedEntropy(
  histogram: Record<string, number>,
  universeSize: number,
) {
  const total = Object.values(histogram).reduce((sum, value) => sum + value, 0);
  if (total === 0 || universeSize <= 1) return 0;

  const normalizer = Math.log2(universeSize);
  let entropy = 0;
  Object.values(histogram).forEach((count) => {
    if (count === 0) return;
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  });

  return normalizer === 0 ? 0 : Number((entropy / normalizer).toFixed(6));
}

function applyMove(
  state: DirectiveState,
  move: ProposedMove,
  vectors: Map<string, number[]>,
) {
  const source = state.clusters.get(move.fromClusterId);
  const target = state.clusters.get(move.toClusterId);
  if (!source || !target) return;

  source.members.delete(move.pointId);
  target.members.add(move.pointId);
  state.assignment.set(move.pointId, move.toClusterId);

  source.medoid = findMedoid(source, vectors) ?? source.medoid;
  target.medoid = findMedoid(target, vectors) ?? target.medoid;
}

function buildAssignments(state: DirectiveState): CanonicalAssignment[] {
  const assignments: CanonicalAssignment[] = [];
  state.assignment.forEach((canonicalId, plotPointId) => {
    assignments.push({ canonicalId, plotPointId });
  });
  return assignments;
}

function cosineSimilarity(vectorA: number[], vectorB: number[]) {
  if (vectorA.length === 0 || vectorB.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const length = Math.max(vectorA.length, vectorB.length);
  for (let i = 0; i < length; i += 1) {
    const a = vectorA[i] ?? 0;
    const b = vectorB[i] ?? 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function cosineDistance(vectorA: number[], vectorB: number[]) {
  return 1 - cosineSimilarity(vectorA, vectorB);
}

function l2Norm(vector: number[]) {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

function collaboratorKey(assignment: CollaboratorCategoryAssignment) {
  const email = assignment.collaboratorEmail ?? 'unknown';
  return `${email}:${assignment.collaboratorCategoryId}`;
}
