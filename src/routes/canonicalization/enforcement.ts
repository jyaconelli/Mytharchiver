import type { AlgorithmMode } from './types';

export type ParameterKey =
  | 'autoDetect'
  | 'targetCanonicalCount'
  | 'optimizationGoal'
  | 'minClusterSize';

export type EnforcementLevel = 'strict' | 'influence' | 'na';

type EnforcementMatrix = Record<AlgorithmMode, Record<ParameterKey, EnforcementLevel>>;

const ENFORCEMENT_BY_MODE: EnforcementMatrix = {
  graph: {
    autoDetect: 'influence',
    targetCanonicalCount: 'influence',
    optimizationGoal: 'na',
    minClusterSize: 'influence',
  },
  factorization: {
    autoDetect: 'na',
    targetCanonicalCount: 'na',
    optimizationGoal: 'na',
    minClusterSize: 'na',
  },
  consensus: {
    autoDetect: 'strict',
    targetCanonicalCount: 'strict',
    optimizationGoal: 'na',
    minClusterSize: 'na',
  },
  hierarchical: {
    autoDetect: 'na',
    targetCanonicalCount: 'na',
    optimizationGoal: 'na',
    minClusterSize: 'na',
  },
};

export function getParameterEnforcement(mode: AlgorithmMode) {
  return ENFORCEMENT_BY_MODE[mode];
}
