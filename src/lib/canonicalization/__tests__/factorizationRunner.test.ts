import { describe, expect, it } from 'vitest';

import type { CanonicalizationInput } from '../types';
import { FactorizationRunner } from '../factorizationRunner';
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
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-c',
        collaboratorEmail: 'gamma@example.com',
        categoryName: 'Resolution',
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

describe('FactorizationRunner', () => {
  it('produces assignments for each plot point', async () => {
    const runner = new FactorizationRunner();
    const input = buildInput();

    const result = await runner.run(input, { rank: 2, maxIterations: 50 });

    expect(result.assignments).toHaveLength(plotPoints.length);
    const uniqueCanonicalIds = new Set(result.assignments.map((a) => a.canonicalId));
    expect(uniqueCanonicalIds.size).toBeLessThanOrEqual(2);
    expect(result.metrics?.coverage).toBeCloseTo(1);
  });
});
