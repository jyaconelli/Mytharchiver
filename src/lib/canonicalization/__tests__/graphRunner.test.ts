import { describe, expect, it } from 'vitest';

import { buildAgreementMatrix, buildAssignmentMatrix } from '../../canonicalMatrices';
import type { CanonicalizationInput } from '../types';
import { AgreementGraphRunner } from '../graphRunner';

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

describe('AgreementGraphRunner', () => {
  it('clusters points based on agreement weights', async () => {
    const runner = new AgreementGraphRunner();
    const input = buildInput();

    const result = await runner.run(input, { maxIterations: 5 });

    expect(result.assignments).toHaveLength(3);
    expect(new Set(result.assignments.map((a) => a.canonicalId)).size).toBeGreaterThanOrEqual(2);
    expect(result.metrics?.coverage).toBeCloseTo(1);
  });

  it('enforces target canonical count', async () => {
    const runner = new AgreementGraphRunner();
    const input = buildInput();

    const result = await runner.run(input, {
      maxIterations: 5,
      targetCanonicalCount: 1,
    });

    expect(new Set(result.assignments.map((a) => a.canonicalId)).size).toBe(1);
  });
});
