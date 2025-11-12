import type { PlotPoint } from '../types/myth';
import {
  buildAgreementMatrix,
  buildAssignmentMatrix,
  type AgreementMatrixOptions,
  type AgreementMatrixResult,
  type AssignmentMatrixOptions,
  type AssignmentMatrixResult,
} from './canonicalMatrices';

export interface MatrixProviderOptions {
  assignment?: AssignmentMatrixOptions;
  agreement?: AgreementMatrixOptions;
}

export interface MatrixProviderResult {
  assignment: AssignmentMatrixResult;
  agreement?: AgreementMatrixResult;
}

export class MatrixProvider {
  constructor(
    private readonly plotPoints: PlotPoint[],
    private readonly options: MatrixProviderOptions = {},
  ) {}

  prepare(withAgreement = false): MatrixProviderResult {
    const assignment = buildAssignmentMatrix(
      this.plotPoints,
      this.options.assignment,
    );

    const agreement = withAgreement
      ? buildAgreementMatrix(assignment, this.options.agreement)
      : undefined;

    return { assignment, agreement };
  }
}
