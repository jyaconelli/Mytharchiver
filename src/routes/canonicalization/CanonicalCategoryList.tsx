import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import type { CanonicalCategoryView } from './types';

type CanonicalCategoryListProps = {
  categories: CanonicalCategoryView[];
  selectedCanonicalId: string | null;
  onSelectCanonicalId: (canonicalId: string | null) => void;
  labelDrafts: Record<string, string>;
  labelErrors: Record<string, string | null>;
  savingLabels: Record<string, boolean>;
  onLabelDraftChange: (canonicalId: string, value: string) => void;
  onRenameCategory: (canonicalId: string) => void;
  canRenameCategory: boolean;
  plotPointsVisibility: Record<string, boolean>;
  onTogglePlotPointsVisibility: (canonicalId: string) => void;
};

export function CanonicalCategoryList({
  categories,
  selectedCanonicalId,
  onSelectCanonicalId,
  labelDrafts,
  labelErrors,
  savingLabels,
  onLabelDraftChange,
  onRenameCategory,
  canRenameCategory,
  plotPointsVisibility,
  onTogglePlotPointsVisibility,
}: CanonicalCategoryListProps) {
  return (
    <section aria-labelledby="canonical-categories">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="canonical-categories" className="text-lg font-semibold">
            Canonical Categories
          </h3>
          <p className="text-sm text-muted-foreground">
            Stacked bars show collaborator influence per category. Click a bar to inspect samples
            and contributors.
          </p>
        </div>
      </div>
      <Accordion
        type="single"
        collapsible
        value={selectedCanonicalId ?? ''}
        onValueChange={(value) => onSelectCanonicalId(value || null)}
        className="mt-4 space-y-4"
      >
        {categories.map((category) => {
          const isSelected = category.id === selectedCanonicalId;
          const plotPointsExpanded = plotPointsVisibility[category.id] ?? false;
          const labelDraft = labelDrafts[category.id] ?? category.label;
          const labelError = labelErrors[category.id] ?? null;
          const isSaving = Boolean(savingLabels[category.id]);

          return (
            <AccordionItem
              key={category.id}
              value={category.id}
              data-testid="canonical-category-card"
              className={`rounded-lg border border-border transition data-[state=open]:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-500/10'
                  : 'bg-card dark:border-white/5'
              }`}
            >
              <div className="p-4">
                <AccordionTrigger className="w-full rounded-md p-0 text-left hover:no-underline focus-visible:ring-2 focus-visible:ring-blue-400">
                  <div className="flex w-full items-center justify-between text-sm font-medium">
                    <span>{category.label}</span>
                    <span className="text-muted-foreground">{category.size} pts</span>
                  </div>
                </AccordionTrigger>
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`category-input-${category.id}`} className="text-xs">
                      Category name
                    </Label>
                    <Input
                      id={`category-input-${category.id}`}
                      value={labelDraft}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        onLabelDraftChange(category.id, event.currentTarget.value);
                      }}
                      className="mt-1"
                      placeholder="Category name"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRenameCategory(category.id);
                    }}
                    disabled={isSaving || !canRenameCategory}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
                {labelError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {labelError}
                  </p>
                )}
                <div className="mt-3 flex h-3 overflow-hidden rounded bg-muted">
                  {category.contributors.map((contributor) => (
                    <div
                      key={contributor.id}
                      className="h-full text-[10px]/3 text-center text-white first:rounded-l last:rounded-r"
                      style={{
                        width: `${contributor.share * 100}%`,
                        backgroundColor: contributor.color,
                      }}
                      title={`${contributor.name} · ${Math.round(contributor.share * 100)}%`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Top contributors:{' '}
                  {category.contributors
                    .slice(0, 3)
                    .map((contributor) => `${contributor.name} (${Math.round(contributor.share * 100)}%)`)
                    .join(', ')}
                </p>
                <AccordionContent className="pt-4">
                  <section
                    aria-labelledby={`cluster-detail-${category.id}-header`}
                    id={`cluster-detail-${category.id}`}
                    className="rounded-lg border border-border p-4"
                  >
                    <h3 id={`cluster-detail-${category.id}-header`} className="text-lg font-semibold">
                      {category.label} · Detail
                    </h3>
                    <div className="mt-3 grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Collaborator Influence
                        </p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {category.contributors.map((contributor) => (
                            <li
                              key={contributor.id}
                              className="flex items-center justify-between rounded border border-border/60 px-3 py-2"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block size-3 rounded-full"
                                  style={{ backgroundColor: contributor.color }}
                                  aria-hidden
                                />
                                {contributor.name}
                              </span>
                              <span className="text-muted-foreground">
                                {Math.round(contributor.share * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Representative Plot Points
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0 text-xs font-semibold"
                            onClick={(event) => {
                              event.stopPropagation();
                              onTogglePlotPointsVisibility(category.id);
                            }}
                          >
                            {plotPointsExpanded ? 'Hide all plot points' : 'See all plot points'}
                          </Button>
                        </div>
                        {plotPointsExpanded && (
                          <ul className="mt-2 space-y-2 text-sm">
                            {category.samples.map((sample, index) => (
                              <li key={`${category.id}-sample-${index}`} className="rounded bg-muted p-3">
                                {sample}
                              </li>
                            ))}
                            {category.samples.length === 0 && (
                              <li className="rounded bg-muted/40 p-3 text-muted-foreground">
                                No sample plot points available.
                              </li>
                            )}
                          </ul>
                        )}
                        {!plotPointsExpanded && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Plot points hidden. Select “See all plot points” to review every sample.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                </AccordionContent>
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
