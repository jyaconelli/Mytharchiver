import type {
  CanonicalAssignment,
  CanonicalizationInput,
  CanonicalCategoryPrevalence,
} from './types.ts';

export function buildPrevalence(
  assignments: CanonicalAssignment[],
  input: Pick<CanonicalizationInput, 'plotPoints'>,
): CanonicalCategoryPrevalence[] {
  const lookup = new Map<string, CanonicalCategoryPrevalence>();

  assignments.forEach((assignment) => {
    const point = input.plotPoints.find(
      (p) => p.id === assignment.plotPointId,
    );
    if (!point?.collaboratorCategories) return;

    const target =
      lookup.get(assignment.canonicalId) ??
      lookup
        .set(assignment.canonicalId, {
          canonicalId: assignment.canonicalId,
          totals: {},
        })
        .get(assignment.canonicalId)!;

    point.collaboratorCategories.forEach((collabAssignment) => {
      target.totals[collabAssignment.collaboratorCategoryId] =
        (target.totals[collabAssignment.collaboratorCategoryId] ?? 0) + 1;
    });
  });

  return Array.from(lookup.values());
}
