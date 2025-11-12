import type {
  CanonicalAssignment,
  CanonicalizationAlgorithm,
  CanonicalizationInput,
  CanonicalizationParameters,
  CanonicalizationResult,
} from './types';
import { MetricSuite } from './metrics';
import { buildPrevalence } from './utils';

export interface AgreementGraphParams extends CanonicalizationParameters {
  targetCanonicalCount?: number;
  minClusterSize?: number;
  maxIterations?: number;
}

export class AgreementGraphRunner
  implements CanonicalizationAlgorithm<AgreementGraphParams>
{
  readonly mode = 'graph';

  async run(
    input: CanonicalizationInput,
    params: AgreementGraphParams,
  ): Promise<CanonicalizationResult> {
    if (!input.agreement) {
      throw new Error(
        'Agreement graph mode requires an agreement matrix. Pass one via MatrixProvider.',
      );
    }

    const labels = runLabelPropagation(
      input.agreement,
      params.maxIterations ?? 12,
    );
    const adjusted = enforceTargetCount(
      labels,
      input.agreement,
      params.targetCanonicalCount,
    );
    const finalLabels = enforceMinClusterSize(
      adjusted,
      input.agreement,
      params.minClusterSize ?? 1,
    );

    const assignments = buildAssignments(finalLabels);
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
        iterations: labels.iterations,
        communityCount: new Set(finalLabels.values()).size,
      },
    };
  }
}

interface LabelState {
  labels: Map<string, string>;
  iterations: number;
}

function runLabelPropagation(
  agreement: CanonicalizationInput['agreement'],
  maxIterations: number,
): LabelState {
  if (!agreement) {
    return { labels: new Map(), iterations: 0 };
  }

  const labels = new Map<string, string>();
  agreement.plotPointIds.forEach((id) => labels.set(id, id));

  const order = [...agreement.plotPointIds];
  let iterations = 0;

  for (; iterations < maxIterations; iterations += 1) {
    let changed = false;
    const iterationOrder = rotateOrder(order, iterations);

    iterationOrder.forEach((nodeId) => {
      const nodeIndex = agreement.plotPointIds.indexOf(nodeId);
      if (nodeIndex === -1) return;

      const neighborWeights = new Map<string, number>();

      agreement.matrix[nodeIndex].forEach((weight, neighborIndex) => {
        if (neighborIndex === nodeIndex || weight <= 0) return;
        const neighborId = agreement.plotPointIds[neighborIndex];
        const label = labels.get(neighborId);
        if (!label) return;
        neighborWeights.set(
          label,
          (neighborWeights.get(label) ?? 0) + weight,
        );
      });

      if (neighborWeights.size === 0) return;

      const bestLabel = argMax(neighborWeights, labels.get(nodeId));
      const current = labels.get(nodeId);
      if (current !== bestLabel) {
        labels.set(nodeId, bestLabel);
        changed = true;
      }
    });

    if (!changed) break;
  }

  return { labels, iterations };
}

function enforceTargetCount(
  state: LabelState,
  agreement: CanonicalizationInput['agreement'],
  targetCount?: number,
) {
  if (!targetCount || !agreement) return state.labels;

  const labels = new Map(state.labels);

  const groups = () => groupByLabel(labels);
  while (groups().length > targetCount) {
    mergeSmallest(labels, agreement);
  }

  while (groups().length < targetCount) {
    splitLargest(labels);
  }

  return labels;
}

function enforceMinClusterSize(
  labels: Map<string, string>,
  agreement: CanonicalizationInput['agreement'],
  minClusterSize: number,
) {
  if (!agreement || minClusterSize <= 1) return labels;

  const updated = new Map(labels);
  let clusters = groupByLabel(updated);
  let changed = false;

  clusters
    .filter((cluster) => cluster.members.length < minClusterSize)
    .forEach((cluster) => {
      cluster.members.forEach((pointId) => {
        const replacement = findBestNeighborLabel(
          pointId,
          updated,
          agreement,
        );
        if (replacement) {
          updated.set(pointId, replacement);
          changed = true;
        }
      });
    });

  if (changed) {
    clusters = groupByLabel(updated);
    clusters
      .filter((cluster) => cluster.members.length < minClusterSize)
      .forEach((cluster) => {
        cluster.members.forEach((pointId) => {
          updated.set(pointId, pointId);
        });
      });
  }

  return updated;
}

function findBestNeighborLabel(
  pointId: string,
  labels: Map<string, string>,
  agreement: CanonicalizationInput['agreement'],
) {
  if (!agreement) return undefined;
  const index = agreement.plotPointIds.indexOf(pointId);
  if (index === -1) return undefined;

  const scores = new Map<string, number>();

  agreement.matrix[index].forEach((weight, neighborIndex) => {
    if (neighborIndex === index || weight <= 0) return;
    const neighborId = agreement.plotPointIds[neighborIndex];
    const label = labels.get(neighborId);
    if (!label) return;
    scores.set(label, (scores.get(label) ?? 0) + weight);
  });

  return argMax(scores, undefined);
}

function mergeSmallest(
  labels: Map<string, string>,
  agreement: CanonicalizationInput['agreement'],
) {
  if (!agreement) return;

  const clusters = groupByLabel(labels);
  if (clusters.length <= 1) return;
  clusters.sort((a, b) => a.members.length - b.members.length);
  const smallest = clusters[0];

  let bestTarget = clusters[1];
  let bestWeight = -Infinity;

  clusters.slice(1).forEach((candidate) => {
    const weight = averageInterClusterWeight(
      smallest.members,
      candidate.members,
      agreement,
    );
    if (weight > bestWeight) {
      bestWeight = weight;
      bestTarget = candidate;
    }
  });

  if (!bestTarget) return;

  smallest.members.forEach((id) => labels.set(id, bestTarget.label));
}

function splitLargest(labels: Map<string, string>) {
  const clusters = groupByLabel(labels);
  if (clusters.length === 0) return;
  clusters.sort((a, b) => b.members.length - a.members.length);
  const largest = clusters[0];
  if (!largest || largest.members.length <= 1) return;
  const splitId = `${largest.label}-split-${Date.now()}`;
  const half = Math.ceil(largest.members.length / 2);
  largest.members.slice(half).forEach((id) => labels.set(id, splitId));
}

function averageInterClusterWeight(
  groupA: string[],
  groupB: string[],
  agreement: CanonicalizationInput['agreement'],
) {
  if (!agreement) return 0;
  const indexLookup = new Map<string, number>();
  agreement.plotPointIds.forEach((id, idx) => indexLookup.set(id, idx));
  let total = 0;
  let count = 0;

  groupA.forEach((idA) => {
    const idxA = indexLookup.get(idA);
    if (idxA === undefined) return;
    groupB.forEach((idB) => {
      const idxB = indexLookup.get(idB);
      if (idxB === undefined) return;
      total += agreement.matrix[idxA][idxB];
      count += 1;
    });
  });

  return count === 0 ? 0 : total / count;
}

function buildAssignments(labels: Map<string, string>): CanonicalAssignment[] {
  return Array.from(labels.entries()).map(([plotPointId, canonicalId]) => ({
    plotPointId,
    canonicalId,
  }));
}

function groupByLabel(labels: Map<string, string>) {
  const groups: Array<{ label: string; members: string[] }> = [];
  const map = new Map<string, string[]>();

  labels.forEach((label, pointId) => {
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(pointId);
  });

  map.forEach((members, label) => groups.push({ label, members }));
  return groups;
}

function argMax(
  scores: Map<string, number>,
  fallback?: string,
): string | undefined {
  let bestKey = fallback;
  let bestScore = fallback ? scores.get(fallback) ?? -Infinity : -Infinity;
  scores.forEach((value, key) => {
    if (value > bestScore) {
      bestScore = value;
      bestKey = key;
    }
  });
  return bestKey;
}

function rotateOrder<T>(items: T[], iteration: number) {
  if (items.length === 0) return items;
  const start = iteration % items.length;
  return items.slice(start).concat(items.slice(0, start));
}
