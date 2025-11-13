import type { Myth } from '../../types/myth';
import { ALGORITHM_MODE_DETAILS, METRIC_CARD_COPY } from './copy';
import type {
  CanonicalAssignmentRow,
  CanonicalCategoryView,
  CanonicalContributorSlice,
  CanonicalizationRunRow,
  CanonicalizationRunView,
  PlotPointLookup,
  SummaryCard,
} from './types';

export function buildSummaryCards(run: CanonicalizationRunView | null): SummaryCard[] {
  return METRIC_CARD_COPY.map((card) => {
    let value = '—';
    if (run) {
      switch (card.key) {
        case 'coverage':
          value = `${Math.round(run.coverage * 100)}%`;
          break;
        case 'averagePurity':
          value = `${Math.round(run.averagePurity * 100)}%`;
          break;
        case 'averageEntropy':
          value = `${Math.round(run.averageEntropy * 100)}%`;
          break;
        case 'agreementGain':
          value =
            typeof run.agreementGain === 'number' ? `${run.agreementGain.toFixed(1)} pts` : '—';
          break;
        default:
          value = '—';
      }
    }

    return {
      label: card.label,
      value,
      description: card.description,
    } satisfies SummaryCard;
  });
}

export function transformRunRow(
  row: CanonicalizationRunRow,
  myth: Myth,
): CanonicalizationRunView | null {
  const assignments = Array.isArray(row.assignments) ? row.assignments : [];
  if (assignments.length === 0) {
    return null;
  }

  const plotPointLookup = buildPlotPointLookup(myth.variants);
  const collaboratorLookup = new Map(
    myth.collaboratorCategories.map((category) => [category.id, category.name]),
  );

  const metrics = row.metrics ?? {};
  const purityMap = metrics.purityByCanonical ?? {};
  const entropyMap = metrics.entropyByCanonical ?? {};
  const prevalence = Array.isArray(row.prevalence) ? row.prevalence : [];
  const prevalenceMap = new Map(prevalence.map((entry) => [entry.canonicalId, entry.totals]));
  const labelMap = row.category_labels ?? {};

  const groups = new Map<
    string,
    { assignments: CanonicalAssignmentRow[]; prevalence?: Record<string, number> }
  >();

  assignments.forEach((assignment) => {
    const group = groups.get(assignment.canonicalId) ?? { assignments: [] };
    group.assignments.push(assignment);
    if (!group.prevalence && prevalenceMap.has(assignment.canonicalId)) {
      group.prevalence = prevalenceMap.get(assignment.canonicalId);
    }
    groups.set(assignment.canonicalId, group);
  });

  const categories: CanonicalCategoryView[] = Array.from(groups.entries()).map(
    ([canonicalId, group]) => {
      const contributors = buildContributors(group.prevalence ?? {}, collaboratorLookup);
      const samples = buildSamples(group.assignments, plotPointLookup);
      return {
        id: canonicalId,
        label: labelMap[canonicalId] ?? canonicalId,
        size: group.assignments.length,
        purity: purityMap[canonicalId] ?? 0,
        entropy: entropyMap[canonicalId] ?? 0,
        contributors,
        samples,
      };
    },
  );

  categories.sort((a, b) => b.size - a.size);
  categories.forEach((category, index) => {
    if (!labelMap[category.id]) {
      category.label = `Category ${index + 1}`;
    }
  });

  const averagePurity = computeAverage(Object.values(purityMap));
  const averageEntropy = computeAverage(Object.values(entropyMap));

  return {
    id: row.id,
    createdAt: row.created_at ?? new Date().toISOString(),
    mode: row.mode,
    status: row.status,
    coverage: metrics.coverage ?? 0,
    agreementGain: metrics.agreementGain ?? undefined,
    averagePurity,
    averageEntropy,
    categories,
  };
}

function buildPlotPointLookup(variants: Myth['variants']) {
  const lookup: PlotPointLookup = new Map();
  variants.forEach((variant) => {
    (variant.plotPoints ?? []).forEach((point) => {
      lookup.set(point.id, point);
    });
  });
  return lookup;
}

function buildContributors(
  totals: Record<string, number>,
  collaboratorLookup: Map<string, string>,
): CanonicalContributorSlice[] {
  const entries = Object.entries(totals);
  const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
  if (totalCount === 0) return [];
  return entries
    .map(([categoryId, count]) => ({
      id: categoryId,
      name: collaboratorLookup.get(categoryId) ?? `Category ${categoryId}`,
      share: count / totalCount,
      color: getColorForId(categoryId),
    }))
    .sort((a, b) => b.share - a.share);
}

function buildSamples(assignments: CanonicalAssignmentRow[], plotPointLookup: PlotPointLookup) {
  return assignments
    .map((assignment) => plotPointLookup.get(assignment.plotPointId)?.text ?? null)
    .filter((text): text is string => Boolean(text))
    .slice(0, 3);
}

function computeAverage(values: number[]) {
  if (values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

export function formatModeLabel(mode: CanonicalizationRunRow['mode']) {
  return ALGORITHM_MODE_DETAILS[mode]?.label ?? mode;
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function getColorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}
