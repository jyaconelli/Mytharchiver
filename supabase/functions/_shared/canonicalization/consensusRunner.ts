import { MetricSuite } from './metrics.ts';
import { buildPrevalence } from './utils.ts';
import type {
  CanonicalAssignment,
  CanonicalizationAlgorithm,
  CanonicalizationInput,
  CanonicalizationParameters,
  CanonicalizationResult,
} from './types.ts';

export interface ConsensusParams extends CanonicalizationParameters {
  targetCanonicalCount?: number;
  splitPenalty?: number;
  mergePenalty?: number;
  balancePenalty?: number;
  maxIterations?: number;
}

interface ConsensusState {
  assignments: CanonicalAssignment[];
  objective: number;
}

export class ConsensusRunner implements CanonicalizationAlgorithm<ConsensusParams> {
  readonly mode = 'consensus';

  async run(
    input: CanonicalizationInput,
    params: ConsensusParams,
  ): Promise<CanonicalizationResult> {
    const targetK = params.targetCanonicalCount ?? 3;
    const state = performConsensusSearch(input, {
      targetCanonicalCount: targetK,
      splitPenalty: params.splitPenalty ?? 1,
      mergePenalty: params.mergePenalty ?? 1,
      balancePenalty: params.balancePenalty ?? 0.5,
      maxIterations: params.maxIterations ?? 25,
    });

    const prevalence = buildPrevalence(state.assignments, input);
    const metrics = MetricSuite.run({
      assignments: state.assignments,
      canonicalInput: input,
    });

    return {
      assignments: state.assignments,
      prevalence,
      metrics,
      diagnostics: {
        finalObjective: state.objective,
        iterations: params.maxIterations ?? 25,
        canonicalCount: new Set(state.assignments.map((assignment) => assignment.canonicalId)).size,
      },
    };
  }
}

type ConsensusSearchParams = Required<
  Pick<
    ConsensusParams,
    'targetCanonicalCount' | 'splitPenalty' | 'mergePenalty' | 'balancePenalty' | 'maxIterations'
  >
>;

function performConsensusSearch(
  input: CanonicalizationInput,
  params: ConsensusSearchParams,
): ConsensusState {
  const targetK = params.targetCanonicalCount;
  let assignments = initializeAssignments(input.plotPoints, targetK);
  assignments = enforceTargetCount(assignments, targetK);
  let objective = computeObjective(assignments, input, params, targetK);

  for (let iteration = 0; iteration < params.maxIterations; iteration += 1) {
    let changed = false;

    for (const point of input.plotPoints) {
      const currentCanonical = assignments.find(
        (assignment) => assignment.plotPointId === point.id,
      )?.canonicalId;

      const candidateCanonicals = new Set<string>();
      point.collaboratorCategories?.forEach((collab) =>
        candidateCanonicals.add(collab.collaboratorCategoryId),
      );
      assignments.forEach((assignment) => candidateCanonicals.add(assignment.canonicalId));

      let bestAssignment = currentCanonical;
      let bestObjective = objective;

      candidateCanonicals.forEach((canonicalId) => {
        const modified = assignments.map((assignment) =>
          assignment.plotPointId === point.id ? { ...assignment, canonicalId } : assignment,
        );
        const nextObjective = computeObjective(modified, input, params, targetK);
        if (nextObjective < bestObjective) {
          bestObjective = nextObjective;
          bestAssignment = canonicalId;
        }
      });

      if (bestAssignment && bestAssignment !== currentCanonical) {
        assignments = assignments.map((assignment) =>
          assignment.plotPointId === point.id
            ? { ...assignment, canonicalId: bestAssignment }
            : assignment,
        );
        objective = bestObjective;
        changed = true;
      }
    }

    assignments = enforceTargetCount(assignments, targetK);
    objective = computeObjective(assignments, input, params, targetK);

    if (!changed) break;
  }

  return { assignments, objective };
}

function initializeAssignments(plotPoints: CanonicalizationInput['plotPoints'], targetK: number) {
  if (plotPoints.length === 0) return [];
  const assignments: CanonicalAssignment[] = [];
  plotPoints.forEach((point, index) => {
    const dominant =
      point.collaboratorCategories?.[0]?.collaboratorCategoryId ?? `initial-${index % targetK}`;
    assignments.push({
      plotPointId: point.id,
      canonicalId: dominant,
    });
  });
  return assignments;
}

function enforceTargetCount(assignments: CanonicalAssignment[], targetK: number) {
  const totalPoints = assignments.length;
  const idealSize = targetK === 0 ? totalPoints : Math.max(1, Math.floor(totalPoints / targetK));

  let canonicalCounts = calculateCounts(assignments);
  let canonicalIds = Array.from(canonicalCounts.keys());

  while (canonicalIds.length > targetK && targetK > 0) {
    canonicalIds.sort((a, b) => (canonicalCounts.get(a) ?? 0) - (canonicalCounts.get(b) ?? 0));
    const smallest = canonicalIds.shift();
    const target = canonicalIds[0];
    if (!smallest || !target) break;
    assignments = assignments.map((assignment) =>
      assignment.canonicalId === smallest ? { ...assignment, canonicalId: target } : assignment,
    );
    canonicalCounts = calculateCounts(assignments);
    canonicalIds = Array.from(canonicalCounts.keys());
  }

  while (canonicalIds.length < targetK) {
    const largest = canonicalIds.reduce((prev, current) => {
      const prevSize = canonicalCounts.get(prev) ?? 0;
      const currentSize = canonicalCounts.get(current) ?? 0;
      return currentSize > prevSize ? current : prev;
    }, canonicalIds[0]);

    if (!largest) break;
    const newId = `${largest}-split-${canonicalIds.length}`;
    let moved = 0;
    assignments = assignments.map((assignment) => {
      if (assignment.canonicalId === largest && moved < idealSize) {
        moved += 1;
        return { ...assignment, canonicalId: newId };
      }
      return assignment;
    });
    canonicalCounts = calculateCounts(assignments);
    canonicalIds = Array.from(canonicalCounts.keys());
  }

  const finalCounts = calculateCounts(assignments);
  const sorted = Array.from(finalCounts.entries()).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  if (targetK > 0 && sorted.length > targetK) {
    const keep = sorted.slice(0, targetK).map(([id]) => id);
    const fallback = keep[0];
    let idx = 0;
    assignments = assignments.map((assignment) => {
      if (keep.includes(assignment.canonicalId)) return assignment;
      const replacement = keep[idx % keep.length] ?? fallback ?? assignment.canonicalId;
      idx += 1;
      return { ...assignment, canonicalId: replacement };
    });
  }

  return assignments;
}

function calculateCounts(assignments: CanonicalAssignment[]) {
  const counts = new Map<string, number>();
  assignments.forEach((assignment) => {
    counts.set(assignment.canonicalId, (counts.get(assignment.canonicalId) ?? 0) + 1);
  });
  return counts;
}

function computeObjective(
  assignments: CanonicalAssignment[],
  input: CanonicalizationInput,
  params: ConsensusSearchParams,
  targetCanonicalCount: number,
) {
  const collaboratorDistributions = buildCollaboratorDistributions(assignments, input);
  const canonicalDistributions = buildCanonicalDistributions(assignments, input);
  const splitCost = collaboratorDistributions.reduce(
    (acc, distribution) => acc + (1 - distribution.maxShare),
    0,
  );
  const mergeCost = canonicalDistributions.reduce(
    (acc, distribution) => acc + distribution.entropy,
    0,
  );

  const sizes = canonicalDistributions.map((distribution) => distribution.total);
  const idealSize =
    targetCanonicalCount === 0 ? assignments.length : assignments.length / targetCanonicalCount;
  const balanceCost = sizes.reduce((acc, size) => acc + Math.abs(size - idealSize), 0) / idealSize;

  return (
    params.splitPenalty * splitCost +
    params.mergePenalty * mergeCost +
    params.balancePenalty * balanceCost
  );
}

function buildCollaboratorDistributions(
  assignments: CanonicalAssignment[],
  input: CanonicalizationInput,
) {
  const collaboratorMap = new Map<string, Record<string, number>>();
  assignments.forEach((assignment) => {
    const point = input.plotPoints.find((p) => p.id === assignment.plotPointId);
    if (!point?.collaboratorCategories) return;
    point.collaboratorCategories.forEach((collab) => {
      if (!collaboratorMap.has(collab.collaboratorCategoryId)) {
        collaboratorMap.set(collab.collaboratorCategoryId, {});
      }
      const bucket = collaboratorMap.get(collab.collaboratorCategoryId)!;
      bucket[assignment.canonicalId] = (bucket[assignment.canonicalId] ?? 0) + 1;
    });
  });

  return Array.from(collaboratorMap.entries()).map(([, counts]) => {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const maxShare = total === 0 ? 0 : Math.max(...Object.values(counts)) / total;
    return { total, maxShare };
  });
}

function buildCanonicalDistributions(
  assignments: CanonicalAssignment[],
  input: CanonicalizationInput,
) {
  const canonicalMap = new Map<string, Record<string, number>>();
  assignments.forEach((assignment) => {
    const point = input.plotPoints.find((p) => p.id === assignment.plotPointId);
    if (!point?.collaboratorCategories) return;
    if (!canonicalMap.has(assignment.canonicalId)) {
      canonicalMap.set(assignment.canonicalId, {});
    }
    const bucket = canonicalMap.get(assignment.canonicalId)!;
    point.collaboratorCategories.forEach((collab) => {
      bucket[collab.collaboratorCategoryId] = (bucket[collab.collaboratorCategoryId] ?? 0) + 1;
    });
  });

  return Array.from(canonicalMap.entries()).map(([canonicalId, counts]) => {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const entropy = computeEntropy(counts, total);
    return { canonicalId, total, entropy };
  });
}

function computeEntropy(counts: Record<string, number>, total: number) {
  if (total === 0) return 0;
  const sum = Object.values(counts).reduce((acc, count) => {
    if (count === 0) return acc;
    const probability = count / total;
    return acc - probability * Math.log2(probability);
  }, 0);
  const normalizer = Math.log2(Object.keys(counts).length || 1);
  return normalizer === 0 ? 0 : sum / normalizer;
}
