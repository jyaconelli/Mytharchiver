import { describe, expect, it } from 'vitest';

import { DirectiveSearchRunner } from '../directiveRunner';

const collaboratorCategories = [
  { id: 'cat-a', mythId: 'm', collaboratorEmail: 'alpha@example.com', name: 'Alpha' },
  { id: 'cat-b', mythId: 'm', collaboratorEmail: 'beta@example.com', name: 'Beta' },
];

const fourPointAssignment = {
  matrix: [
    [1, 0],
    [1, 0],
    [0, 1],
    [0, 1],
  ],
  plotPointIds: ['p1', 'p2', 'p3', 'p4'],
  categoryIds: ['cat-a', 'cat-b'],
};

const plotPoints = [
  buildPoint('p1', 'cat-a', 'alpha@example.com'),
  buildPoint('p2', 'cat-a', 'alpha@example.com'),
  buildPoint('p3', 'cat-b', 'beta@example.com'),
  buildPoint('p4', 'cat-b', 'beta@example.com'),
];

function buildPoint(
  id: string,
  categoryId: string,
  collaboratorEmail: string,
) {
  return {
    id,
    text: '',
    order: 1,
    category: '',
    mythemeRefs: [],
    collaboratorCategories: [
      {
        plotPointId: id,
        collaboratorCategoryId: categoryId,
        collaboratorEmail,
        categoryName: 'label',
      },
    ],
  };
}

describe('DirectiveSearchRunner', () => {
  it('clusters by dominant contributor when optimizing purity', async () => {
    const runner = new DirectiveSearchRunner();
    const result = await runner.run(
      {
        mythId: 'm',
        plotPoints,
        collaboratorCategories,
        assignment: fourPointAssignment,
      },
      {
        targetCanonicalCount: 2,
        optimizationGoal: 'purity',
        minClusterSize: 1,
      },
    );

    const lookup = toClusterLookup(result.assignments);
    expect(lookup.get('p1')).toBe(lookup.get('p2'));
    expect(lookup.get('p3')).toBe(lookup.get('p4'));
    expect(lookup.get('p1')).not.toBe(lookup.get('p3'));
  });

  it('balances contributors when optimizing variance', async () => {
    const runner = new DirectiveSearchRunner();
    const result = await runner.run(
      {
        mythId: 'm',
        plotPoints,
        collaboratorCategories,
        assignment: fourPointAssignment,
      },
      {
        targetCanonicalCount: 2,
        optimizationGoal: 'variance',
        minClusterSize: 1,
      },
    );

    const clusters = toClusterMembers(result.assignments);
    clusters.forEach((members) => {
      const contributors = new Set(
        members.map((id) =>
          plotPoints.find((point) => point.id === id)?.collaboratorCategories?.[0]
            ?.collaboratorEmail,
        ),
      );
      expect(contributors.size).toBeGreaterThanOrEqual(2);
    });
  });

  it('groups high-agreement points together when optimizing consensus', async () => {
    const runner = new DirectiveSearchRunner();
    const agreement = {
      plotPointIds: ['p1', 'p2', 'p3', 'p4'],
      matrix: [
        [1, 0.9, 0.2, 0.1],
        [0.9, 1, 0.2, 0.1],
        [0.2, 0.2, 1, 0.85],
        [0.1, 0.1, 0.85, 1],
      ],
    };

    const result = await runner.run(
      {
        mythId: 'm',
        plotPoints,
        collaboratorCategories,
        assignment: fourPointAssignment,
        agreement,
      },
      {
        targetCanonicalCount: 2,
        optimizationGoal: 'consensus',
        minClusterSize: 1,
      },
    );

    const lookup = toClusterLookup(result.assignments);
    expect(lookup.get('p1')).toBe(lookup.get('p2'));
    expect(lookup.get('p3')).toBe(lookup.get('p4'));
  });
});

function toClusterLookup(assignments: { plotPointId: string; canonicalId: string }[]) {
  return new Map(assignments.map((assignment) => [assignment.plotPointId, assignment.canonicalId]));
}

function toClusterMembers(assignments: { plotPointId: string; canonicalId: string }[]) {
  const clusters = new Map<string, string[]>();
  assignments.forEach((assignment) => {
    const existing = clusters.get(assignment.canonicalId) ?? [];
    existing.push(assignment.plotPointId);
    clusters.set(assignment.canonicalId, existing);
  });
  return clusters;
}
