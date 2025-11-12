import { describe, expect, it } from 'vitest';

import type { CanonicalAssignment } from '../../canonicalization/types';
import { MetricSuite } from '../../canonicalization/metrics';
import type { CanonicalizationInput } from '../types';

const baseInput: CanonicalizationInput = {
  mythId: 'myth-1',
  plotPoints: [
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
          collaboratorCategoryId: 'cat-b',
          collaboratorEmail: 'beta@example.com',
          categoryName: 'Conflict',
        },
      ],
    },
  ],
  collaboratorCategories: [
    {
      id: 'cat-a',
      mythId: 'myth-1',
      collaboratorEmail: 'alpha@example.com',
      name: 'Opening',
    },
    {
      id: 'cat-b',
      mythId: 'myth-1',
      collaboratorEmail: 'beta@example.com',
      name: 'Conflict',
    },
  ],
  assignment: {
    matrix: [
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    plotPointIds: ['p1', 'p2', 'p3'],
    categoryIds: ['cat-a', 'cat-b'],
  },
  metadata: {},
};

const assignments: CanonicalAssignment[] = [
  { plotPointId: 'p1', canonicalId: 'canon-1' },
  { plotPointId: 'p2', canonicalId: 'canon-2' },
  { plotPointId: 'p3', canonicalId: 'canon-1' },
];

describe('MetricSuite', () => {
  it('computes purity, entropy, and coverage', () => {
    const input = { ...baseInput };
    const metrics = MetricSuite.run({ assignments, canonicalInput: input });

    expect(metrics.coverage).toBeCloseTo(1);
    expect(metrics.purityByCanonical['canon-1']).toBeCloseTo(0.5);
    expect(metrics.purityByCanonical['canon-2']).toBeCloseTo(1);
    expect(metrics.entropyByCanonical['canon-1']).toBeGreaterThan(0);
  });

  it('computes agreement gain when agreement matrix is present', () => {
    const agreementInput: CanonicalizationInput = {
      ...baseInput,
      agreement: {
        matrix: [
          [1, 0.2, 0.5],
          [0.2, 1, 0.1],
          [0.5, 0.1, 1],
        ],
        plotPointIds: ['p1', 'p2', 'p3'],
      },
    };

    const metrics = MetricSuite.run({
      assignments,
      canonicalInput: agreementInput,
    });

    expect(metrics.agreementGain).toBeDefined();
    expect(metrics.agreementGain).toBeGreaterThan(0);
  });
});
