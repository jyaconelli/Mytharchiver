import type {
  CollaboratorCategory,
  CollaboratorCategoryAssignment,
  PlotPoint,
} from './mythTypes.ts';

type EnhancedAssignment = CollaboratorCategoryAssignment & {
  weight?: number;
};

export interface AssignmentMatrixOptions {
  categories?: Pick<CollaboratorCategory, 'id'>[];
  collaboratorWeights?: Record<string, number>;
  normalizeWithinPlotPoint?: boolean;
}

export interface AssignmentMatrixResult {
  matrix: number[][];
  plotPointIds: string[];
  categoryIds: string[];
}

export interface AgreementMatrixOptions {
  normalize?: boolean;
}

export interface AgreementMatrixResult {
  matrix: number[][];
  plotPointIds: string[];
}

export function buildAssignmentMatrix(
  plotPoints: PlotPoint[],
  options: AssignmentMatrixOptions = {},
): AssignmentMatrixResult {
  const plotPointIds = plotPoints.map((point) => point.id);

  const categoryIds =
    options.categories?.map((category) => category.id) ??
    dedupeCategoryIds(plotPoints);

  const categoryIndex = new Map<string, number>();
  categoryIds.forEach((id, idx) => categoryIndex.set(id, idx));

  const matrix = plotPoints.map(() =>
    new Array(categoryIds.length).fill(0),
  );

  const perPointCollaboratorTotals = options.normalizeWithinPlotPoint
    ? computePerPointCollaboratorTotals(plotPoints)
    : undefined;

  plotPoints.forEach((point, rowIdx) => {
    const assignments = point.collaboratorCategories ?? [];

    assignments.forEach((rawAssignment) => {
      const assignment = rawAssignment as EnhancedAssignment;
      const colIdx = categoryIndex.get(assignment.collaboratorCategoryId);
      if (colIdx === undefined) return;

      const weight = computeAssignmentWeight({
        assignment,
        collaboratorWeights: options.collaboratorWeights,
        perPointTotals: perPointCollaboratorTotals,
        plotPointId: point.id,
      });

      matrix[rowIdx][colIdx] += weight;
    });
  });

  return { matrix, plotPointIds, categoryIds };
}

export function buildAgreementMatrix(
  assignment: AssignmentMatrixResult,
  options: AgreementMatrixOptions = {},
): AgreementMatrixResult {
  const { matrix, plotPointIds } = assignment;
  const size = matrix.length;
  const agreement = Array.from({ length: size }, () =>
    new Array(size).fill(0),
  );

  for (let i = 0; i < size; i += 1) {
    for (let j = i; j < size; j += 1) {
      const dot = dotProduct(matrix[i], matrix[j]);
      const value = options.normalize
        ? normalizeDot(dot, matrix[i], matrix[j])
        : dot;
      agreement[i][j] = value;
      agreement[j][i] = value;
    }
  }

  return { matrix: agreement, plotPointIds };
}

function dedupeCategoryIds(plotPoints: PlotPoint[]): string[] {
  const ids = new Set<string>();
  plotPoints.forEach((point) => {
    point.collaboratorCategories?.forEach((assignment) =>
      ids.add(assignment.collaboratorCategoryId),
    );
  });
  return Array.from(ids);
}

function computePerPointCollaboratorTotals(
  plotPoints: PlotPoint[],
) {
  const totals = new Map<string, number>();
  plotPoints.forEach((point) => {
    point.collaboratorCategories?.forEach((rawAssignment) => {
      const assignment = rawAssignment as EnhancedAssignment;
      const key = perPointCollaboratorKey(
        point.id,
        assignment.collaboratorEmail,
      );
      const previous = totals.get(key) ?? 0;
      const baseWeight = assignment.weight ?? 1;
      totals.set(key, previous + baseWeight);
    });
  });
  return totals;
}

function computeAssignmentWeight(args: {
  assignment: EnhancedAssignment;
  collaboratorWeights?: Record<string, number>;
  perPointTotals?: Map<string, number>;
  plotPointId: string;
}) {
  const { assignment, collaboratorWeights, perPointTotals, plotPointId } = args;
  const baseWeight = assignment.weight ?? 1;

  const collaboratorWeight =
    collaboratorWeights?.[assignment.collaboratorEmail] ?? 1;

  if (!perPointTotals) {
    return baseWeight * collaboratorWeight;
  }

  const key = perPointCollaboratorKey(
    plotPointId,
    assignment.collaboratorEmail,
  );
  const total = perPointTotals.get(key) ?? baseWeight;
  if (total === 0) return 0;

  return (baseWeight / total) * collaboratorWeight;
}

function perPointCollaboratorKey(plotPointId: string, email: string) {
  return `${plotPointId}:${email}`;
}

function dotProduct(vectorA: number[], vectorB: number[]) {
  let sum = 0;
  for (let i = 0; i < vectorA.length; i += 1) {
    sum += vectorA[i] * vectorB[i];
  }
  return sum;
}

function normalizeDot(
  dot: number,
  vectorA: number[],
  vectorB: number[],
) {
  const aMagnitude = Math.sqrt(dotProduct(vectorA, vectorA));
  const bMagnitude = Math.sqrt(dotProduct(vectorB, vectorB));
  if (aMagnitude === 0 || bMagnitude === 0) return 0;
  return dot / (aMagnitude * bMagnitude);
}
