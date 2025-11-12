import {
  buildAssignmentMatrix,
  type AssignmentMatrixResult,
} from '../canonicalMatrices';
import { MetricSuite } from './metrics';
import { buildPrevalence } from './utils';
import type {
  CanonicalAssignment,
  CanonicalizationAlgorithm,
  CanonicalizationInput,
  CanonicalizationParameters,
  CanonicalizationResult,
} from './types';

const EPSILON = 1e-9;

export interface FactorizationParams extends CanonicalizationParameters {
  rank?: number;
  maxIterations?: number;
  tolerance?: number;
  l1Reg?: number;
}

export class FactorizationRunner
  implements CanonicalizationAlgorithm<FactorizationParams>
{
  readonly mode = 'factorization';

  async run(
    input: CanonicalizationInput,
    params: FactorizationParams,
  ): Promise<CanonicalizationResult> {
    const assignment = input.assignment;
    if (!assignment) {
      throw new Error('Factorization mode requires an assignment matrix.');
    }

    const rank = params.rank ?? Math.max(2, Math.min(assignment.categoryIds.length, 5));
    const { W, H, iterations, residual } = nmf(
      assignment,
      rank,
      params.maxIterations ?? 200,
      params.tolerance ?? 1e-4,
      params.l1Reg ?? 0,
    );

    const assignments = buildAssignmentsFromFactors(
      assignment.plotPointIds,
      W,
    );
    const prevalence = buildPrevalence(assignments, input);
    const metrics = MetricSuite.run({ assignments, canonicalInput: input });

    return {
      assignments,
      prevalence,
      metrics,
      diagnostics: {
        rank,
        iterations,
        residual,
      },
      artifacts: { W, H },
    };
  }
}

function nmf(
  assignment: AssignmentMatrixResult,
  rank: number,
  maxIterations: number,
  tolerance: number,
  l1Reg: number,
) {
  const rows = assignment.matrix.length;
  const cols = assignment.matrix[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    return {
      W: Array.from({ length: rows }, () => Array(rank).fill(0)),
      H: Array.from({ length: rank }, () => Array(cols).fill(0)),
      iterations: 0,
      residual: 0,
    };
  }

  const { W, H } = initializeFactors(rows, cols, rank);

  let previousResidual = Infinity;
  let iterations = 0;

  for (; iterations < maxIterations; iterations += 1) {
    updateH(assignment.matrix, W, H, l1Reg);
    updateW(assignment.matrix, W, H, l1Reg);

    const residual = frobeniusResidual(assignment.matrix, W, H);
    if (Math.abs(previousResidual - residual) <= tolerance) {
      previousResidual = residual;
      break;
    }
    previousResidual = residual;
  }

  return { W, H, iterations: iterations + 1, residual: previousResidual };
}

function initializeFactors(rows: number, cols: number, rank: number) {
  const W = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: rank }, (_, r) => (i + r + 1) / (rank + rows)),
  );

  const H = Array.from({ length: rank }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r + c + 1) / (rank + cols)),
  );

  return { W, H };
}

function updateH(
  A: number[][],
  W: number[][],
  H: number[][],
  l1Reg: number,
) {
  const WT = transpose(W);
  const numerator = multiplyMatrices(WT, A);
  const denominator = multiplyMatrices(
    multiplyMatrices(WT, W),
    H,
  ).map((row) => row.map((value) => value + l1Reg + EPSILON));

  for (let i = 0; i < H.length; i += 1) {
    for (let j = 0; j < H[0].length; j += 1) {
      H[i][j] = H[i][j] * (numerator[i][j] / denominator[i][j]);
    }
  }
}

function updateW(
  A: number[][],
  W: number[][],
  H: number[][],
  l1Reg: number,
) {
  const HT = transpose(H);
  const numerator = multiplyMatrices(A, HT);
  const denominator = multiplyMatrices(
    W,
    multiplyMatrices(H, HT),
  ).map((row) => row.map((value) => value + l1Reg + EPSILON));

  for (let i = 0; i < W.length; i += 1) {
    for (let j = 0; j < W[0].length; j += 1) {
      W[i][j] = W[i][j] * (numerator[i][j] / denominator[i][j]);
    }
  }
}

function transpose(matrix: number[][]) {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const result = Array.from({ length: cols }, () =>
    Array(rows).fill(0),
  );

  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      result[j][i] = matrix[i][j];
    }
  }

  return result;
}

function multiplyMatrices(a: number[][], b: number[][]) {
  const rowsA = a.length;
  const colsA = a[0]?.length ?? 0;
  const rowsB = b.length;
  const colsB = b[0]?.length ?? 0;

  if (colsA !== rowsB) {
    throw new Error('Matrix dimensions do not align for multiplication.');
  }

  const result = Array.from({ length: rowsA }, () =>
    Array(colsB).fill(0),
  );

  for (let i = 0; i < rowsA; i += 1) {
    for (let k = 0; k < colsA; k += 1) {
      for (let j = 0; j < colsB; j += 1) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

function frobeniusResidual(
  original: number[][],
  W: number[][],
  H: number[][],
) {
  const reconstruction = multiplyMatrices(W, H);
  let sum = 0;
  for (let i = 0; i < original.length; i += 1) {
    for (let j = 0; j < original[0].length; j += 1) {
      const diff = original[i][j] - reconstruction[i][j];
      sum += diff * diff;
    }
  }
  return Math.sqrt(sum);
}

function buildAssignmentsFromFactors(
  plotPointIds: string[],
  W: number[][],
): CanonicalAssignment[] {
  return plotPointIds.map((id, rowIdx) => {
    const row = W[rowIdx];
    let bestIdx = 0;
    let bestValue = -Infinity;
    row.forEach((value, idx) => {
      if (value > bestValue) {
        bestIdx = idx;
        bestValue = value;
      }
    });
    return {
      plotPointId: id,
      canonicalId: `factor-${bestIdx}`,
      score: bestValue,
    };
  });
}
