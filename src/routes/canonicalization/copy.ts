import type { AlgorithmMode, ParameterState } from './types';

export const ALGORITHM_MODE_DETAILS: Record<AlgorithmMode, { label: string; description: string }> = {
  graph: {
    label: 'Agreement Graph',
    description:
      'Builds a graph of plot points linked by annotator agreement and partitions it into cohesive clusters.',
  },
  factorization: {
    label: 'Assignment Factorization',
    description: 'Uses a matrix factorization of plot point × annotator votes to infer shared canonical bases.',
  },
  consensus: {
    label: 'Consensus Labeling',
    description: 'Optimizes for maximum voting consensus per plot point using weighted annotator reliability.',
  },
  hierarchical: {
    label: 'Hierarchical Merge/Split',
    description: 'Agglomeratively merges related plot points and splits noisy clusters until stability is reached.',
  },
};

export const OPTIMIZATION_GOAL_DETAILS: Record<
  ParameterState['optimizationGoal'],
  { label: string; description: string }
> = {
  purity: {
    label: 'Purity maximization',
    description: 'Prioritize clusters dominated by a single contributor so each canonical feels consistent.',
  },
  variance: {
    label: 'Variance minimization',
    description: 'Balance contributor representation to keep categories evenly distributed.',
  },
  consensus: {
    label: 'Consensus stability',
    description: 'Penalize frequent reassignments to favor canonical categories annotators broadly agree upon.',
  },
};

export const METRIC_CARD_COPY = [
  {
    key: 'coverage',
    label: 'Coverage',
    description: 'Share of plot points that received any canonical assignment. Higher coverage means fewer uncategorized points.',
  },
  {
    key: 'averagePurity',
    label: 'Avg Purity',
    description:
      'Average portion of assignments inside a canonical category that come from its dominant contributor. Closer to 100% indicates a focused interpretation.',
  },
  {
    key: 'averageEntropy',
    label: 'Avg Entropy',
    description:
      'Average normalized entropy of contributor participation per category. Lower values imply less mixing of conflicting annotations.',
  },
  {
    key: 'agreementGain',
    label: 'Agreement Gain',
    description:
      'Change in cross-annotator agreement compared to baseline collaborator categories. Positive points indicate improved consensus.',
  },
] as const;

export const PARAMETER_TIPS = {
  algorithm:
    'Choose how canonical categories are generated. Algorithms vary in how aggressively they cluster plot points and reconcile conflicting annotations.',
  autoDetect:
    'When enabled, the lab sweeps a range of candidate cluster counts and keeps the first stable elbow/gap result. Target count input is disabled.',
  targetCanonicalCount:
    'Sets the desired number of canonical categories when auto-detect is off. Raising the number encourages finer splits, while lowering it merges similar plot points.',
  optimizationGoal:
    'Determines which scoring signal the runner optimizes after clustering. Use it to emphasize consensus, contributor purity, or balanced variance.',
  minClusterSize:
    'Smallest number of plot points allowed per canonical category. Tiny clusters under this threshold will be merged or dropped.',
};

export type MetricCardKey = (typeof METRIC_CARD_COPY)[number]['key'];
