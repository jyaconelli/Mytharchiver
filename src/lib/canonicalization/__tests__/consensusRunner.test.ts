import { describe, expect, it } from 'vitest';

import { ConsensusRunner } from '../consensusRunner';
import type { CanonicalizationInput } from '../types';
import { buildAssignmentMatrix } from '../../canonicalMatrices';

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
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-b',
        collaboratorEmail: 'beta@example.com',
        categoryName: 'Conflict',
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
  return {
    mythId: 'myth',
    plotPoints,
    collaboratorCategories,
    assignment,
  };
}

describe('ConsensusRunner', () => {
  it('returns assignments that respect the target canonical count', async () => {
    const runner = new ConsensusRunner();
    const input = buildInput();
    const targetCanonicalCount = 2;

    const result = await runner.run(input, {
      targetCanonicalCount,
      maxIterations: 10,
      splitPenalty: 1,
      mergePenalty: 1,
      balancePenalty: 0.5,
    });

    const uniqueCanonicals = new Set(result.assignments.map((a) => a.canonicalId));
    expect(uniqueCanonicals.size).toBeLessThanOrEqual(targetCanonicalCount);
    expect(result.metrics?.coverage).toBeCloseTo(1);
  });
});
