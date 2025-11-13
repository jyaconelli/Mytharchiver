import { describe, expect, it } from 'vitest';

import { MatrixProvider } from '../../matrixProvider';
import { autoDetectCategoryCount } from '../autoK';

const clusteredPlotPoints = [
  buildPoint('p1', 'cat-quest', 'alpha@example.com'),
  buildPoint('p2', 'cat-quest', 'alpha@example.com'),
  buildPoint('p3', 'cat-twist', 'beta@example.com'),
  buildPoint('p4', 'cat-twist', 'beta@example.com'),
  buildPoint('p5', 'cat-resolution', 'gamma@example.com'),
  buildPoint('p6', 'cat-resolution', 'gamma@example.com'),
];

function buildPoint(id: string, categoryId: string, email: string) {
  return {
    id,
    text: '',
    order: Number(id.replace('p', '')),
    mythemeRefs: [],
    category: categoryId,
    collaboratorCategories: [
      {
        plotPointId: id,
        collaboratorCategoryId: categoryId,
        collaboratorEmail: email,
        categoryName: categoryId,
      },
    ],
  };
}

describe('autoDetectCategoryCount', () => {
  it('prefers the elbow suggestion for clearly separated clusters', () => {
    const provider = new MatrixProvider(clusteredPlotPoints);
    const { assignment } = provider.prepare(false);
    const result = autoDetectCategoryCount({
      assignment,
      minK: 2,
      maxK: 5,
      referenceRuns: 0,
    });

    expect(result.reason).toBe('elbow');
    expect(result.selectedK).toBeGreaterThanOrEqual(2);
    expect(result.selectedK).toBeLessThanOrEqual(5);
    expect(result.elbow?.series.length).toBeGreaterThan(0);
  });

  it('falls back to the gap heuristic when reference runs are provided', () => {
    const provider = new MatrixProvider(clusteredPlotPoints);
    const { assignment } = provider.prepare(false);
    const rng = createDeterministicRng();
    const result = autoDetectCategoryCount({
      assignment,
      minK: 2,
      maxK: 4,
      referenceRuns: 3,
      rng,
    });

    expect(result.reason).toBe('gap');
    expect(result.gap?.series.length).toBeGreaterThan(0);
    expect(result.selectedK).toBeGreaterThanOrEqual(2);
    expect(result.selectedK).toBeLessThanOrEqual(4);
  });
});

function createDeterministicRng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
