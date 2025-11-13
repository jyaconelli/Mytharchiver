import { describe, expect, it } from 'vitest';

import { HierarchicalRunner } from '../hierarchicalRunner';
import type { CanonicalizationInput } from '../types';
import {
  buildAgreementMatrix,
  buildAssignmentMatrix,
} from '../../canonicalMatrices';

const plotPoints = [
  {
    id: 'p1',
    text: '',
    order: 1,
    mythemeRefs: [],
    category: 'Intro',
    collaboratorCategories: [
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@example.com',
        categoryName: 'Start',
      },
    ],
  },
  {
    id: 'p2',
    text: '',
    order: 2,
    mythemeRefs: [],
    category: 'Conflict',
    collaboratorCategories: [
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@example.com',
        categoryName: 'Start',
      },
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-b',
        collaboratorEmail: 'beta@example.com',
        categoryName: 'Conflict',
      },
    ],
  },
  {
    id: 'p3',
    text: '',
    order: 3,
    mythemeRefs: [],
    category: 'Resolution',
    collaboratorCategories: [
      {
        plotPointId: 'p3',
        collaboratorCategoryId: 'cat-c',
        collaboratorEmail: 'gamma@example.com',
        categoryName: 'Resolution',
      },
    ],
  },
];

const collaboratorCategories = [
  { id: 'cat-a', mythId: 'myth', collaboratorEmail: 'alpha@example.com', name: 'Start' },
  { id: 'cat-b', mythId: 'myth', collaboratorEmail: 'beta@example.com', name: 'Conflict' },
  { id: 'cat-c', mythId: 'myth', collaboratorEmail: 'gamma@example.com', name: 'Resolution' },
];

function buildInput(): CanonicalizationInput {
  const assignment = buildAssignmentMatrix(plotPoints);
  const agreement = buildAgreementMatrix(assignment);
  return {
    mythId: 'myth',
    plotPoints,
    collaboratorCategories,
    assignment,
    agreement,
  };
}

describe('HierarchicalRunner', () => {
  it('merges clusters until the target count', async () => {
    const runner = new HierarchicalRunner();
    const input = buildInput();

    const stoppingCriterion = { type: 'count' as const, value: 2 };
    const result = await runner.run(input, {
      stoppingCriterion,
      linkageMetric: 'agreement',
      maxSteps: 5,
    });

    const uniqueCanonicals = new Set(result.assignments.map((a) => a.canonicalId));
    expect(uniqueCanonicals.size).toBeLessThanOrEqual(stoppingCriterion.value);
    expect(result.metrics?.coverage).toBeCloseTo(1);
  });

  it('auto-splits clusters with high entropy', async () => {
    const runner = new HierarchicalRunner();
    const input = buildInput();

    const result = await runner.run(input, {
      stoppingCriterion: { type: 'count', value: 1 },
      linkageMetric: 'entropy',
      autoSplit: { entropyThreshold: 0.2 },
      maxSteps: 5,
    });

    const uniqueCanonicals = new Set(result.assignments.map((a) => a.canonicalId));
    expect(uniqueCanonicals.size).toBeGreaterThan(1);
  });
});
