import type { Myth, PlotPoint } from '../../types/myth';

export type AlgorithmMode =
  | 'graph'
  | 'factorization'
  | 'consensus'
  | 'hierarchical'
  | 'directive';

export type ParameterState = {
  algorithm: AlgorithmMode;
  targetCanonicalCount: number;
  useAutoK: boolean;
  optimizationGoal: 'purity' | 'variance' | 'consensus';
  minClusterSize: number;
};

export type CanonicalizationRunRow = {
  id: string;
  myth_id: string;
  mode: AlgorithmMode;
  params: Record<string, unknown> | null;
  assignments: CanonicalAssignmentRow[] | null;
  prevalence: CanonicalPrevalenceRow[] | null;
  metrics: MetricsRow | null;
  diagnostics: Record<string, unknown> | null;
  category_labels: Record<string, string> | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  created_at: string;
};

export type CanonicalAssignmentRow = {
  plotPointId: string;
  canonicalId: string;
  score?: number;
};

export type CanonicalPrevalenceRow = {
  canonicalId: string;
  totals: Record<string, number>;
};

export type MetricsRow = {
  coverage?: number;
  purityByCanonical?: Record<string, number>;
  entropyByCanonical?: Record<string, number>;
  agreementGain?: number;
};

export type CanonicalContributorSlice = {
  id: string;
  name: string;
  share: number;
  color: string;
};

export type CanonicalCategoryView = {
  id: string;
  label: string;
  size: number;
  purity: number;
  entropy: number;
  contributors: CanonicalContributorSlice[];
  samples: string[];
};

export type CanonicalizationRunView = {
  id: string;
  createdAt: string;
  mode: AlgorithmMode;
  status: CanonicalizationRunRow['status'];
  coverage: number;
  averagePurity: number;
  averageEntropy: number;
  agreementGain?: number;
  categories: CanonicalCategoryView[];
};

export type PlotPointLookup = Map<string, PlotPoint>;

export const RUN_LIMIT = 20;

export type SummaryCard = {
  label: string;
  value: string;
  description: string;
};

export type CanonicalizationTransforms = {
  transformRunRow: (row: CanonicalizationRunRow, myth: Myth) => CanonicalizationRunView | null;
  buildSummaryCards: (run: CanonicalizationRunView | null) => SummaryCard[];
};
