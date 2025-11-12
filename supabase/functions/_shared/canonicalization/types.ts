import type {
  CollaboratorCategory,
  PlotPoint,
} from './mythTypes.ts';
import type {
  AgreementMatrixResult,
  AssignmentMatrixResult,
} from './canonicalMatrices.ts';

export type CanonicalizationMode =
  | 'graph'
  | 'factorization'
  | 'consensus'
  | 'hierarchical';

export interface CanonicalizationParameters {
  targetCanonicalCount?: number;
  [key: string]: unknown;
}

export interface CanonicalizationInput {
  mythId: string;
  plotPoints: PlotPoint[];
  collaboratorCategories: CollaboratorCategory[];
  assignment: AssignmentMatrixResult;
  agreement?: AgreementMatrixResult;
  metadata?: Record<string, unknown>;
}

export interface CanonicalAssignment {
  plotPointId: string;
  canonicalId: string;
  score?: number;
}

export interface CanonicalCategoryPrevalence {
  canonicalId: string;
  totals: Record<string, number>;
}

export interface MetricSummary {
  coverage: number;
  purityByCanonical: Record<string, number>;
  entropyByCanonical: Record<string, number>;
  agreementGain?: number;
  extras?: Record<string, unknown>;
}

export interface CanonicalizationResult {
  assignments: CanonicalAssignment[];
  prevalence: CanonicalCategoryPrevalence[];
  metrics?: MetricSummary;
  diagnostics?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
}

export interface ParameterDefinition {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select' | 'text';
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number }>;
}

export interface CanonicalizationAlgorithm<
  P extends CanonicalizationParameters = CanonicalizationParameters,
> {
  readonly mode: CanonicalizationMode;
  parameterDefinitions?: ParameterDefinition[];
  run(input: CanonicalizationInput, params: P): Promise<CanonicalizationResult>;
}
