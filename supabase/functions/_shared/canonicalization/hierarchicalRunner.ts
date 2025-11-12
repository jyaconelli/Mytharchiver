import {
  buildAgreementMatrix,
  type AssignmentMatrixResult,
} from './canonicalMatrices.ts';
import { MetricSuite } from './metrics.ts';
import { buildPrevalence } from './utils.ts';
import type {
  CanonicalAssignment,
  CanonicalizationAlgorithm,
  CanonicalizationInput,
  CanonicalizationParameters,
  CanonicalizationResult,
} from './types.ts';

export interface HierarchicalParams extends CanonicalizationParameters {
  stoppingCriterion: { type: 'count' | 'purity' | 'delta'; value: number };
  linkageMetric?: 'entropy' | 'agreement';
  autoSplit?: { entropyThreshold: number };
  maxSteps?: number;
}

interface Cluster {
  id: string;
  plotPointIds: string[];
}

interface MergeHistoryEntry {
  step: number;
  merged: [string, string];
  score: number;
}

export class HierarchicalRunner
  implements CanonicalizationAlgorithm<HierarchicalParams>
{
  readonly mode = 'hierarchical';

  async run(
    input: CanonicalizationInput,
    params: HierarchicalParams,
  ): Promise<CanonicalizationResult> {
    if (!input.assignment) {
      throw new Error('Hierarchical mode requires an assignment matrix.');
    }

    const agreement =
      input.agreement ?? buildAgreementMatrix(input.assignment);

    let clusters = seedClusters(input.plotPoints);
    const history: MergeHistoryEntry[] = [];

    const maxSteps = params.maxSteps ?? 200;
    let previousScore = Infinity;

    for (let step = 0; step < maxSteps; step += 1) {
      if (shouldStop(clusters, input, params.stoppingCriterion)) break;
      const merge = findBestMerge(
        clusters,
        input,
        agreement,
        params.linkageMetric ?? 'agreement',
      );
      if (!merge) break;

      clusters = mergeClusters(clusters, merge.pair);
      history.push({
        step: step + 1,
        merged: merge.pair,
        score: merge.score,
      });

      if (
        params.stoppingCriterion.type === 'delta' &&
        Math.abs(previousScore - merge.score) <= params.stoppingCriterion.value
      ) {
        break;
      }
      previousScore = merge.score;
    }

    if (params.autoSplit) {
      clusters = autoSplitHighEntropy(
        clusters,
        input,
        params.autoSplit.entropyThreshold,
      );
    }

    const assignments = clustersToAssignments(clusters);
    const prevalence = buildPrevalence(assignments, input);
    const metrics = MetricSuite.run({
      assignments,
      canonicalInput: { ...input, agreement },
    });

    return {
      assignments,
      prevalence,
      metrics,
      diagnostics: {
        history,
        finalClusterCount: clusters.length,
      },
    };
  }
}

function seedClusters(plotPoints: CanonicalizationInput['plotPoints']) {
  return plotPoints.map<Cluster>((point) => ({
    id: `cluster-${point.id}`,
    plotPointIds: [point.id],
  }));
}

function shouldStop(
  clusters: Cluster[],
  input: CanonicalizationInput,
  criterion: HierarchicalParams['stoppingCriterion'],
) {
  if (criterion.type === 'count') {
    return clusters.length <= criterion.value;
  }
  if (criterion.type === 'purity') {
    const purities = clusters.map((cluster) =>
      computeClusterPurity(cluster, input),
    );
    return purities.every((p) => p >= criterion.value);
  }
  return false;
}

function findBestMerge(
  clusters: Cluster[],
  input: CanonicalizationInput,
  agreement: ReturnType<typeof buildAgreementMatrix>,
  linkage: 'entropy' | 'agreement',
) {
  if (clusters.length < 2) return null;
  let bestPair: [string, string] | null = null;
  let bestScore =
    linkage === 'agreement' ? -Infinity : Number.POSITIVE_INFINITY;

  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const pair: [string, string] = [clusters[i].id, clusters[j].id];
      const score =
        linkage === 'agreement'
          ? averageAgreement(clusters[i], clusters[j], agreement)
          : mergedEntropy(clusters[i], clusters[j], input);

      if (
        (linkage === 'agreement' && score > bestScore) ||
        (linkage === 'entropy' && score < bestScore)
      ) {
        bestScore = score;
        bestPair = pair;
      }
    }
  }

  if (!bestPair) return null;
  return { pair: bestPair, score: bestScore };
}

function averageAgreement(
  clusterA: Cluster,
  clusterB: Cluster,
  agreement: ReturnType<typeof buildAgreementMatrix>,
) {
  const indexLookup = new Map<string, number>();
  agreement.plotPointIds.forEach((id, idx) => indexLookup.set(id, idx));
  let total = 0;
  let count = 0;

  clusterA.plotPointIds.forEach((idA) => {
    const idxA = indexLookup.get(idA);
    if (idxA === undefined) return;
    clusterB.plotPointIds.forEach((idB) => {
      const idxB = indexLookup.get(idB);
      if (idxB === undefined) return;
      total += agreement.matrix[idxA][idxB];
      count += 1;
    });
  });

  if (count === 0) return 0;
  return total / count;
}

function mergedEntropy(
  clusterA: Cluster,
  clusterB: Cluster,
  input: CanonicalizationInput,
) {
  const combinedIds = [...clusterA.plotPointIds, ...clusterB.plotPointIds];
  const counts: Record<string, number> = {};

  combinedIds.forEach((plotPointId) => {
    const point = input.plotPoints.find((p) => p.id === plotPointId);
    point?.collaboratorCategories?.forEach((assignment) => {
      counts[assignment.collaboratorCategoryId] =
        (counts[assignment.collaboratorCategoryId] ?? 0) + 1;
    });
  });

  const total = Object.values(counts).reduce((acc, val) => acc + val, 0);
  if (total === 0) return 0;

  const entropy = Object.values(counts).reduce((acc, count) => {
    const probability = count / total;
    return acc - probability * Math.log2(probability);
  }, 0);

  const normalizer =
    Math.log2(
      input.collaboratorCategories.length ||
        Object.keys(counts).length ||
        1,
    ) || 1;

  return entropy / normalizer;
}

function mergeClusters(
  clusters: Cluster[],
  pair: [string, string],
): Cluster[] {
  const [aId, bId] = pair;
  const merged: Cluster[] = [];
  let combined: Cluster | null = null;

  clusters.forEach((cluster) => {
    if (cluster.id === aId || cluster.id === bId) {
      if (!combined) {
        combined = {
          id: `${aId}|${bId}`,
          plotPointIds: [],
        };
      }
      combined.plotPointIds.push(...cluster.plotPointIds);
    } else {
      merged.push(cluster);
    }
  });

  if (combined) merged.push(combined);
  return merged;
}

function autoSplitHighEntropy(
  clusters: Cluster[],
  input: CanonicalizationInput,
  threshold: number,
) {
  const newClusters: Cluster[] = [];
  clusters.forEach((cluster) => {
    const entropy = mergedEntropy(cluster, { id: '', plotPointIds: [] }, input);
    if (entropy <= threshold || cluster.plotPointIds.length <= 1) {
      newClusters.push(cluster);
      return;
    }

    const dominant =
      dominantCollaborator(cluster, input) ?? cluster.id ?? 'dominant';
    const firstBucket: string[] = [];
    const secondBucket: string[] = [];

    cluster.plotPointIds.forEach((plotPointId, idx) => {
      const point = input.plotPoints.find((p) => p.id === plotPointId);
      const hasDominant = point?.collaboratorCategories?.some(
        (assignment) => assignment.collaboratorCategoryId === dominant,
      );
      if (hasDominant) firstBucket.push(plotPointId);
      else if (idx % 2 === 0) firstBucket.push(plotPointId);
      else secondBucket.push(plotPointId);
    });

    if (secondBucket.length === 0) {
      const midpoint = Math.ceil(firstBucket.length / 2);
      secondBucket.push(...firstBucket.splice(midpoint));
    }

    newClusters.push(
      { id: `${cluster.id}-splitA`, plotPointIds: firstBucket },
      { id: `${cluster.id}-splitB`, plotPointIds: secondBucket },
    );
  });

  return newClusters;
}

function dominantCollaborator(cluster: Cluster, input: CanonicalizationInput) {
  const counts: Record<string, number> = {};
  cluster.plotPointIds.forEach((plotPointId) => {
    const point = input.plotPoints.find((p) => p.id === plotPointId);
    point?.collaboratorCategories?.forEach((assignment) => {
      counts[assignment.collaboratorCategoryId] =
        (counts[assignment.collaboratorCategoryId] ?? 0) + 1;
    });
  });
  const entries = Object.entries(counts);
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function clustersToAssignments(clusters: Cluster[]): CanonicalAssignment[] {
  const assignments: CanonicalAssignment[] = [];
  clusters.forEach((cluster) => {
    cluster.plotPointIds.forEach((plotPointId) => {
      assignments.push({
        plotPointId,
        canonicalId: cluster.id,
      });
    });
  });
  return assignments;
}

function computeClusterPurity(cluster: Cluster, input: CanonicalizationInput) {
  const counts: Record<string, number> = {};
  cluster.plotPointIds.forEach((plotPointId) => {
    const point = input.plotPoints.find((p) => p.id === plotPointId);
    point?.collaboratorCategories?.forEach((assignment) => {
      counts[assignment.collaboratorCategoryId] =
        (counts[assignment.collaboratorCategoryId] ?? 0) + 1;
    });
  });
  const total = Object.values(counts).reduce((acc, val) => acc + val, 0);
  if (total === 0) return 1;
  const max = Math.max(...Object.values(counts));
  return max / total;
}
