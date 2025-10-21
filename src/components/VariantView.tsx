import { useState } from 'react';
import { MythVariant, Mytheme, PlotPoint as PlotPointType } from '../types/myth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimelineView } from './TimelineView';
import { GroupedView } from './GroupedView';
import { GridView } from './GridView';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { LayoutList, Grid3x3, FolderTree } from 'lucide-react';

interface VariantViewProps {
  variant: MythVariant;
  mythemes: Mytheme[];
  onUpdateVariant: (variant: MythVariant) => void;
}

export function VariantView({ variant, mythemes, onUpdateVariant }: VariantViewProps) {
  const [activeTab, setActiveTab] = useState('timeline');

  const handleUpdatePlotPoint = (id: string, updates: Partial<PlotPointType>) => {
    const updatedPlotPoints = variant.plotPoints.map(point =>
      point.id === id ? { ...point, ...updates } : point
    );
    onUpdateVariant({ ...variant, plotPoints: updatedPlotPoints });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2>{variant.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Source: {variant.source}</p>
          </div>
          <Badge variant="outline">
            {variant.plotPoints.length} plot points
          </Badge>
        </div>
      </Card>

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
            onUpdatePlotPoint={handleUpdatePlotPoint}
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <GridView plotPoints={variant.plotPoints} mythemes={mythemes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
