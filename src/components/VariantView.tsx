import { useState } from 'react';
import { MythVariant, Mytheme, PlotPoint as PlotPointType } from '../types/myth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimelineView } from './TimelineView';
import { GroupedView } from './GroupedView';
import { GridView } from './GridView';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LayoutList, Grid3x3, FolderTree, Plus } from 'lucide-react';
import { AddPlotPointDialog } from './AddPlotPointDialog';

interface VariantViewProps {
  variant: MythVariant;
  mythemes: Mytheme[];
  categories: string[];
  onUpdateVariant: (variant: MythVariant) => void;
}

export function VariantView({ variant, mythemes, categories, onUpdateVariant }: VariantViewProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showAddPlotPoint, setShowAddPlotPoint] = useState(false);

  const handleUpdatePlotPoint = (id: string, updates: Partial<PlotPointType>) => {
    const updatedPlotPoints = variant.plotPoints.map(point =>
      point.id === id ? { ...point, ...updates } : point
    );
    onUpdateVariant({ ...variant, plotPoints: updatedPlotPoints });
  };

  const handleAddPlotPoint = (text: string, category: string, mythemeRefs: string[]) => {
    const newPlotPoint: PlotPointType = {
      id: `p${Date.now()}`,
      text,
      category,
      order: variant.plotPoints.length + 1,
      mythemeRefs,
    };
    onUpdateVariant({ ...variant, plotPoints: [...variant.plotPoints, newPlotPoint] });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2>{variant.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Source: {variant.source}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {variant.plotPoints.length} plot points
            </Badge>
            <Button onClick={() => setShowAddPlotPoint(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Plot Point
            </Button>
          </div>
        </div>
      </Card>

      <AddPlotPointDialog
        open={showAddPlotPoint}
        onOpenChange={setShowAddPlotPoint}
        onAdd={handleAddPlotPoint}
        categories={categories}
        mythemes={mythemes}
        nextOrder={variant.plotPoints.length + 1}
      />

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
          <TimelineView plotPoints={variant.plotPoints} mythemes={mythemes} />
        </TabsContent>

        <TabsContent value="grouped" className="mt-4">
          <GroupedView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            categories={categories}
            onUpdatePlotPoint={handleUpdatePlotPoint}
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <GridView 
            plotPoints={variant.plotPoints} 
            mythemes={mythemes} 
            categories={categories}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
