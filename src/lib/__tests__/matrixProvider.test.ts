import { describe, expect, it } from 'vitest';

import type { PlotPoint } from '../../types/myth';
import { MatrixProvider } from '../matrixProvider';

const samplePlotPoints: PlotPoint[] = [
  {
    id: 'p1',
    text: 'First',
    order: 1,
    mythemeRefs: [],
    category: 'Intro',
    collaboratorCategories: [
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@email',
        categoryName: 'Opening',
      },
    ],
  },
  {
    id: 'p2',
    text: 'Second',
    order: 2,
    mythemeRefs: [],
    category: 'Conflict',
    collaboratorCategories: [
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-b',
        collaboratorEmail: 'beta@email',
        categoryName: 'Conflict',
      },
    ],
  },
];

describe('MatrixProvider', () => {
  it('returns assignment matrix with provided options', () => {
    const provider = new MatrixProvider(samplePlotPoints, {
      assignment: {
        normalizeWithinPlotPoint: true,
      },
    });

    const { assignment } = provider.prepare();
    expect(assignment.matrix.length).toBe(samplePlotPoints.length);
    expect(assignment.categoryIds).toEqual(['cat-a', 'cat-b']);
  });

  it('optionally computes agreement matrix', () => {
    const provider = new MatrixProvider(samplePlotPoints, {
      agreement: { normalize: true },
    });

    const { assignment, agreement } = provider.prepare(true);
    expect(assignment.matrix.length).toBe(2);
    expect(agreement).toBeDefined();
    expect(agreement?.matrix.length).toBe(2);
    expect(agreement?.matrix[0][0]).toBe(1);
  });
});
