import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CollaboratorCategory,
  MythCollaborator,
  MythCategory,
  MythVariant,
  Mytheme,
  PlotPoint as PlotPointType,
} from '../types/myth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimelineView } from './TimelineView';
import { GroupedView } from './GroupedView';
import { GridView } from './GridView';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LayoutList, Grid3x3, FolderTree, Plus, Loader2, BarChart3 } from 'lucide-react';
import { AddPlotPointDialog } from './AddPlotPointDialog';
import { EditPlotPointDialog } from './EditPlotPointDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { VariantInsights } from './VariantInsights';

export type { VariantInsightMetrics } from './VariantInsights';
export { computeVariantInsightMetrics } from './VariantInsights';

interface VariantViewProps {
  variant: MythVariant;
  mythemes: Mytheme[];
  categories: string[];
  canonicalCategories?: MythCategory[];
  collaboratorCategories?: CollaboratorCategory[];
  collaborators: MythCollaborator[];
  onUpdateVariant: (variant: MythVariant) => Promise<void>;
  onCreateCollaboratorCategory?: (name: string) => Promise<CollaboratorCategory>;
  canEdit?: boolean;
  viewerEmail: string;
}

const UNCATEGORIZED_LABEL = 'Uncategorized';

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `plot-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function VariantView({
  variant,
  mythemes,
  categories,
  canonicalCategories = [],
  collaboratorCategories = [],
  collaborators,
  onUpdateVariant,
  onCreateCollaboratorCategory,
  canEdit = true,
  viewerEmail,
}: VariantViewProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showAddPlotPoint, setShowAddPlotPoint] = useState(false);
  const [showEditPlotPoint, setShowEditPlotPoint] = useState(false);
  const [plotPointBeingEdited, setPlotPointBeingEdited] = useState<PlotPointType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestVariantRef = useRef(variant);

  const canonicalById = useMemo(() => {
    const map = new Map<string, MythCategory>();
    canonicalCategories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [canonicalCategories]);

  const canonicalByName = useMemo(() => {
    const map = new Map<string, MythCategory>();
    canonicalCategories.forEach((category) => {
      map.set(category.name.toLowerCase(), category);
    });
    return map;
  }, [canonicalCategories]);

  const normalizedViewerEmail = viewerEmail.toLowerCase();

  const viewerRole = useMemo(() => {
    if (!normalizedViewerEmail) {
      return null;
    }
    const matchingCollaborator = collaborators.find(
      (collaborator) => collaborator.email?.toLowerCase() === normalizedViewerEmail,
    );
    return matchingCollaborator?.role ?? null;
  }, [collaborators, normalizedViewerEmail]);

  useEffect(() => {
    if (viewerRole !== 'owner' && activeTab === 'insights') {
      setActiveTab('timeline');
    }
  }, [activeTab, viewerRole]);

  const tabListClassName = 'flex h-auto w-full gap-2';

  useEffect(() => {
    latestVariantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    if (!canEdit) {
      setShowAddPlotPoint(false);
      setShowEditPlotPoint(false);
      setPlotPointBeingEdited(null);
    }
  }, [canEdit]);

  const persistVariant = async (nextVariant: MythVariant) => {
    const previousVariant = latestVariantRef.current;
    latestVariantRef.current = nextVariant;
    setSaving(true);
    setError(null);
    try {
      await onUpdateVariant(nextVariant);
    } catch (err) {
      latestVariantRef.current = previousVariant;
      setError(err instanceof Error ? err.message : 'Unable to update the variant.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlotPoint = async (id: string, updates: Partial<PlotPointType>) => {
    if (!canEdit) return;
    const baseVariant = latestVariantRef.current;
    const updatedPlotPoints = baseVariant.plotPoints.map((point) =>
      point.id === id ? { ...point, ...updates } : point,
    );
    await persistVariant({ ...baseVariant, plotPoints: updatedPlotPoints });
  };

  const handleAddPlotPoint = async (text: string, mythemeRefs: string[]) => {
    if (!canEdit) return;
    const baseVariant = latestVariantRef.current;
    const newPlotPoint: PlotPointType = {
      id: createLocalId(),
      text,
      category: UNCATEGORIZED_LABEL,
      order: baseVariant.plotPoints.length + 1,
      mythemeRefs,
      canonicalCategoryId: null,
      collaboratorCategories: [],
    };
    await persistVariant({ ...baseVariant, plotPoints: [...baseVariant.plotPoints, newPlotPoint] });
  };

  const handleRequestEditPlotPoint = (plotPoint: PlotPointType) => {
    if (!canEdit) return;
    setPlotPointBeingEdited(plotPoint);
    setShowEditPlotPoint(true);
  };

  const handleSavePlotPoint = async (updates: {
    text: string;
    category: string;
    mythemeRefs: string[];
  }) => {
    if (!canEdit || !plotPointBeingEdited) {
      return;
    }

    if (!plotPointBeingEdited) {
      return;
    }

    const canonicalCategory = canonicalByName.get(updates.category.toLowerCase()) ?? null;
    const baseVariant = latestVariantRef.current;
    const updatedPlotPoints = baseVariant.plotPoints.map((point) =>
      point.id === plotPointBeingEdited.id ? { ...point, ...updates } : point,
    );

    const normalizedPlotPoints = updatedPlotPoints.map((point) =>
      point.id === plotPointBeingEdited.id
        ? {
            ...point,
            canonicalCategoryId: canonicalCategory
              ? canonicalCategory.id
              : (point.canonicalCategoryId ?? null),
            category: canonicalCategory ? canonicalCategory.name : updates.category,
          }
        : point,
    );

    await persistVariant({ ...baseVariant, plotPoints: normalizedPlotPoints });
    setShowEditPlotPoint(false);
    setPlotPointBeingEdited(null);
  };

  const handleAssignCollaboratorCategory = async (
    plotPointId: string,
    collaboratorCategoryId: string | null,
    categoryName?: string,
  ) => {
    if (!canEdit) {
      return;
    }

    let resolvedCategoryId = collaboratorCategoryId;
    let resolvedName = categoryName?.trim() ?? '';

    if (!resolvedCategoryId && resolvedName) {
      if (onCreateCollaboratorCategory) {
        try {
          const createdCategory = await onCreateCollaboratorCategory(resolvedName);
          resolvedCategoryId = createdCategory.id;
          resolvedName = createdCategory.name;
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to create the category for this plot point.',
          );
          return;
        }
      }
    }

    if (resolvedCategoryId) {
      const nameFromId = collaboratorCategories.find(
        (category) => category.id === resolvedCategoryId,
      )?.name;
      if (nameFromId) {
        resolvedName = nameFromId;
      }
    }

    const baseVariant = latestVariantRef.current;
    const updatedPlotPoints = baseVariant.plotPoints.map((point) => {
      if (point.id !== plotPointId) {
        return point;
      }

      const otherAssignments = (point.collaboratorCategories ?? []).filter(
        (assignment) => assignment.collaboratorEmail !== normalizedViewerEmail,
      );

      if (resolvedName) {
        otherAssignments.push({
          plotPointId,
          collaboratorCategoryId: resolvedCategoryId ?? '',
          collaboratorEmail: normalizedViewerEmail,
          categoryName: resolvedName,
        });
      }

      return {
        ...point,
        collaboratorCategories: otherAssignments,
      };
    });

    await persistVariant({ ...baseVariant, plotPoints: updatedPlotPoints });
  };

  const handleCloseEditDialog = (open: boolean) => {
    setShowEditPlotPoint(open);
    if (!open) {
      setPlotPointBeingEdited(null);
    }
  };

  const handleDeletePlotPoint = async (id: string) => {
    if (!canEdit) return;
    const baseVariant = latestVariantRef.current;
    const remaining = baseVariant.plotPoints.filter((point) => point.id !== id);
    const reindexed = remaining.map((point, index) => ({
      ...point,
      order: index + 1,
    }));
    await persistVariant({ ...baseVariant, plotPoints: reindexed });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2>{variant.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Source: {variant.source}</p>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            )}
            <Badge variant="outline">{variant.plotPoints.length} plot points</Badge>
            {canEdit && (
              <Button onClick={() => setShowAddPlotPoint(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Plot Point
              </Button>
            )}
          </div>
        </div>
      </Card>

      {canEdit && (
        <>
          <AddPlotPointDialog
            open={showAddPlotPoint}
            onOpenChange={setShowAddPlotPoint}
            onAdd={handleAddPlotPoint}
            mythemes={mythemes}
            nextOrder={latestVariantRef.current.plotPoints.length + 1}
          />
          <EditPlotPointDialog
            open={showEditPlotPoint && Boolean(plotPointBeingEdited)}
            onOpenChange={handleCloseEditDialog}
            plotPoint={plotPointBeingEdited}
            categories={categories}
            mythemes={mythemes}
            onSave={handleSavePlotPoint}
          />
        </>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={tabListClassName}>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <LayoutList className="w-4 h-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="grouped" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Grouped
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Grid
          </TabsTrigger>
          {viewerRole === 'owner' && (
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Insights
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
            viewerEmail={viewerEmail}
          />
        </TabsContent>

        <TabsContent value="grouped" className="mt-4">
          <GroupedView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            categories={categories}
            onUpdatePlotPoint={canEdit ? handleUpdatePlotPoint : undefined}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
            canEdit={canEdit}
            collaboratorCategories={collaboratorCategories}
            onAssignCategory={canEdit ? handleAssignCollaboratorCategory : undefined}
            viewerEmail={viewerEmail}
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <GridView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            categories={categories}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
            canEdit={canEdit}
            viewerEmail={viewerEmail}
          />
        </TabsContent>

        {viewerRole === 'owner' && (
          <TabsContent value="insights" className="mt-4">
            <VariantInsights
              plotPoints={variant.plotPoints}
              collaborators={collaborators}
              viewerEmail={viewerEmail}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
