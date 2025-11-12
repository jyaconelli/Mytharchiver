import { describe, expect, it } from 'vitest';

import type { PlotPoint } from '../../types/myth';
import {
  buildAgreementMatrix,
  buildAssignmentMatrix,
} from '../canonicalMatrices';

const basePlotPoints: PlotPoint[] = [
  {
    id: 'p1',
    text: 'First plot point',
    order: 1,
    mythemeRefs: [],
    category: 'Intro',
    collaboratorCategories: [
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@example.com',
        categoryName: 'Opening Motifs',
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
    text: 'Second plot point',
    order: 2,
    mythemeRefs: [],
    category: 'Conflict',
    collaboratorCategories: [
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@example.com',
        categoryName: 'Opening Motifs',
      },
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-c',
        collaboratorEmail: 'gamma@example.com',
        categoryName: 'Journey',
      },
    ],
  },
];

describe('canonicalMatrices', () => {
  it('builds assignment matrices that respect collaborator weights', () => {
    const { matrix, categoryIds } = buildAssignmentMatrix(basePlotPoints, {
      collaboratorWeights: { 'alpha@example.com': 2 },
      categories: [
        { id: 'cat-a', mythId: 'm1', collaboratorEmail: 'alpha', name: '' },
        { id: 'cat-b', mythId: 'm1', collaboratorEmail: 'beta', name: '' },
        { id: 'cat-c', mythId: 'm1', collaboratorEmail: 'gamma', name: '' },
      ],
    });

    expect(categoryIds).toEqual(['cat-a', 'cat-b', 'cat-c']);
    expect(matrix).toEqual([
      [2, 1, 0],
      [2, 0, 1],
    ]);
  });

  it('normalizes assignments per collaborator within a plot point when requested', () => {
    const customPlotPoints: PlotPoint[] = [
      {
        ...basePlotPoints[0],
        collaboratorCategories: [
          {
            plotPointId: 'p1',
            collaboratorCategoryId: 'cat-a',
            collaboratorEmail: 'alpha@example.com',
            categoryName: 'Opening Motifs',
          },
          {
            plotPointId: 'p1',
            collaboratorCategoryId: 'cat-b',
            collaboratorEmail: 'alpha@example.com',
            categoryName: 'Conflict',
          },
        ],
      },
    ];

    const { matrix } = buildAssignmentMatrix(customPlotPoints, {
      normalizeWithinPlotPoint: true,
    });

    expect(matrix[0]).toEqual([0.5, 0.5]);
  });

  it('builds agreement matrices that are symmetric', () => {
    const assignment = buildAssignmentMatrix(basePlotPoints);
    const agreement = buildAgreementMatrix(assignment);

    expect(agreement.matrix).toEqual([
      [2, 1],
      [1, 2],
    ]);
  });

  it('normalizes agreement values when requested', () => {
    const assignment = buildAssignmentMatrix(basePlotPoints);
    const agreement = buildAgreementMatrix(assignment, { normalize: true });

    expect(agreement.matrix[0][0]).toBeCloseTo(1);
    expect(agreement.matrix[1][1]).toBeCloseTo(1);
    expect(agreement.matrix[0][1]).toBeLessThan(1);
    expect(agreement.matrix[0][1]).toBeGreaterThan(0);
  });
});
