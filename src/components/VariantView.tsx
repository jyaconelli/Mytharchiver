import { useEffect, useState } from 'react';
import { MythVariant, Mytheme, PlotPoint as PlotPointType } from '../types/myth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimelineView } from './TimelineView';
import { GroupedView } from './GroupedView';
import { GridView } from './GridView';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LayoutList, Grid3x3, FolderTree, Plus, Loader2 } from 'lucide-react';
import { AddPlotPointDialog } from './AddPlotPointDialog';
import { EditPlotPointDialog } from './EditPlotPointDialog';

interface VariantViewProps {
  variant: MythVariant;
  mythemes: Mytheme[];
  categories: string[];
  onUpdateVariant: (variant: MythVariant) => Promise<void>;
  canEdit?: boolean;
}

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `plot-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function VariantView({
  variant,
  mythemes,
  categories,
  onUpdateVariant,
  canEdit = true,
}: VariantViewProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showAddPlotPoint, setShowAddPlotPoint] = useState(false);
  const [showEditPlotPoint, setShowEditPlotPoint] = useState(false);
  const [plotPointBeingEdited, setPlotPointBeingEdited] = useState<PlotPointType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) {
      setShowAddPlotPoint(false);
      setShowEditPlotPoint(false);
      setPlotPointBeingEdited(null);
    }
  }, [canEdit]);

  const persistVariant = async (nextVariant: MythVariant) => {
    setSaving(true);
    setError(null);
    try {
      await onUpdateVariant(nextVariant);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the variant.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlotPoint = async (id: string, updates: Partial<PlotPointType>) => {
    if (!canEdit) return;
    const updatedPlotPoints = variant.plotPoints.map(point =>
      point.id === id ? { ...point, ...updates } : point
    );
    await persistVariant({ ...variant, plotPoints: updatedPlotPoints });
  };

  const handleAddPlotPoint = async (text: string, category: string, mythemeRefs: string[]) => {
    if (!canEdit) return;
    const newPlotPoint: PlotPointType = {
      id: createLocalId(),
      text,
      category,
      order: variant.plotPoints.length + 1,
      mythemeRefs,
    };
    await persistVariant({ ...variant, plotPoints: [...variant.plotPoints, newPlotPoint] });
  };

  const handleRequestEditPlotPoint = (plotPoint: PlotPointType) => {
    if (!canEdit) return;
    setPlotPointBeingEdited(plotPoint);
    setShowEditPlotPoint(true);
  };

  const handleSavePlotPoint = async (updates: { text: string; category: string; mythemeRefs: string[] }) => {
    if (!canEdit || !plotPointBeingEdited) {
      return;
    }

    if (!plotPointBeingEdited) {
      return;
    }

    const updatedPlotPoints = variant.plotPoints.map(point =>
      point.id === plotPointBeingEdited.id ? { ...point, ...updates } : point
    );

    await persistVariant({ ...variant, plotPoints: updatedPlotPoints });
    setShowEditPlotPoint(false);
    setPlotPointBeingEdited(null);
  };

  const handleCloseEditDialog = (open: boolean) => {
    setShowEditPlotPoint(open);
    if (!open) {
      setPlotPointBeingEdited(null);
    }
  };

  const handleDeletePlotPoint = async (id: string) => {
    if (!canEdit) return;
    const remaining = variant.plotPoints.filter(point => point.id !== id);
    const reindexed = remaining.map((point, index) => ({
      ...point,
      order: index + 1,
    }));
    await persistVariant({ ...variant, plotPoints: reindexed });
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
            <Badge variant="outline">
              {variant.plotPoints.length} plot points
            </Badge>
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
            categories={categories}
            mythemes={mythemes}
            nextOrder={variant.plotPoints.length + 1}
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
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
