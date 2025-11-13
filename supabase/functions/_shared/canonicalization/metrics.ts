import type {
  CollaboratorCategoryAssignment,
  PlotPoint,
} from './mythTypes.ts';
import type {
  AgreementMatrixResult,
  AssignmentMatrixResult,
} from './canonicalMatrices.ts';
import type {
  CanonicalAssignment,
  CanonicalizationInput,
  MetricSummary,
} from './types.ts';

export interface MetricSuiteInput {
  assignments: CanonicalAssignment[];
  canonicalInput: CanonicalizationInput;
}

export class MetricSuite {
  static run({ assignments, canonicalInput }: MetricSuiteInput): MetricSummary {
    const stats = buildCategoryStats(assignments, canonicalInput.plotPoints);
    const purityByCanonical = computePurity(stats);
    const entropyByCanonical = computeEntropy(
      stats,
      canonicalInput.collaboratorCategories.length,
    );

    const coverage = computeCoverage(
      assignments,
      canonicalInput.plotPoints.length,
    );

    const agreementGain = canonicalInput.agreement
      ? computeAgreementGain(
          canonicalInput.agreement,
          assignments,
          canonicalInput.assignment,
        )
      : undefined;

    return {
      coverage,
      purityByCanonical,
      entropyByCanonical,
      agreementGain,
    };
  }
}

interface CategoryStats {
  total: number;
  byCollaborator: Record<string, number>;
}

type CategoryStatMap = Record<string, CategoryStats>;

function buildCategoryStats(
  assignments: CanonicalAssignment[],
  plotPoints: PlotPoint[],
): CategoryStatMap {
  const plotPointLookup = new Map<string, PlotPoint>();
  plotPoints.forEach((point) => plotPointLookup.set(point.id, point));

  const stats: CategoryStatMap = {};

  assignments.forEach((assignment) => {
    const target =
      stats[assignment.canonicalId] ??
      (stats[assignment.canonicalId] = {
        total: 0,
        byCollaborator: {},
      });

    target.total += 1;
    const point = plotPointLookup.get(assignment.plotPointId);
    if (!point?.collaboratorCategories) return;

    point.collaboratorCategories.forEach((collabAssignment) => {
      const key = collaboratorKey(collabAssignment);
      target.byCollaborator[key] = (target.byCollaborator[key] ?? 0) + 1;
    });
  });

  return stats;
}

function collaboratorKey(assignment: CollaboratorCategoryAssignment) {
  return `${assignment.collaboratorEmail}:${assignment.collaboratorCategoryId}`;
}

function computePurity(stats: CategoryStatMap): Record<string, number> {
  const purity: Record<string, number> = {};
  Object.entries(stats).forEach(([canonicalId, data]) => {
    const dominant = Math.max(0, ...Object.values(data.byCollaborator));
    purity[canonicalId] = data.total === 0 ? 0 : dominant / data.total;
  });
  return purity;
}

function computeEntropy(
  stats: CategoryStatMap,
  collaboratorCategoryCount: number,
): Record<string, number> {
  const entropy: Record<string, number> = {};
  const normalizer =
    collaboratorCategoryCount > 1 ? Math.log2(collaboratorCategoryCount) : 1;

  Object.entries(stats).forEach(([canonicalId, data]) => {
    const sum = Object.values(data.byCollaborator).reduce((acc, count) => {
      if (count === 0 || data.total === 0) return acc;
      const probability = count / data.total;
      return acc - probability * Math.log2(probability);
    }, 0);
    entropy[canonicalId] =
      normalizer === 0 ? 0 : Number((sum / normalizer).toFixed(4));
  });

  return entropy;
}

function computeCoverage(
  assignments: CanonicalAssignment[],
  totalPlotPoints: number,
) {
  if (totalPlotPoints === 0) return 0;
  const uniqueIds = new Set(assignments.map((assignment) => assignment.plotPointId));
  return uniqueIds.size / totalPlotPoints;
}

function computeAgreementGain(
  agreement: AgreementMatrixResult,
  assignments: CanonicalAssignment[],
  assignmentMatrix: AssignmentMatrixResult,
) {
  const pointIdToCanonical = new Map<string, string>();
  assignments.forEach((assignment) =>
    pointIdToCanonical.set(assignment.plotPointId, assignment.canonicalId),
  );

  const idIndex = new Map<string, number>();
  agreement.plotPointIds.forEach((id, idx) => idIndex.set(id, idx));

  let intra = 0;
  let inter = 0;

  for (let i = 0; i < assignmentMatrix.plotPointIds.length; i += 1) {
    for (let j = i + 1; j < assignmentMatrix.plotPointIds.length; j += 1) {
      const pointA = assignmentMatrix.plotPointIds[i];
      const pointB = assignmentMatrix.plotPointIds[j];
      const canonicalA = pointIdToCanonical.get(pointA);
      const canonicalB = pointIdToCanonical.get(pointB);
      if (!canonicalA || !canonicalB) continue;

      const idxA = idIndex.get(pointA);
      const idxB = idIndex.get(pointB);
      if (idxA === undefined || idxB === undefined) continue;

      const weight = agreement.matrix[idxA][idxB];
      if (canonicalA === canonicalB) intra += weight;
      else inter += weight;
    }
  }

  return intra - inter;
}
