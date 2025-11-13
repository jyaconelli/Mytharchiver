import type { ParameterState } from './types';

export const DEFAULT_PARAMS: ParameterState = {
  algorithm: 'graph',
  targetCanonicalCount: 5,
  useAutoK: false,
  optimizationGoal: 'purity',
  minClusterSize: 3,
};
