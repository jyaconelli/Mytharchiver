import { PlotPoint as PlotPointType, Mytheme } from '../types/myth';
import { PlotPoint } from './PlotPoint';

interface TimelineViewProps {
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  onDeletePlotPoint?: (id: string) => void;
  onEditPlotPoint?: (plotPoint: PlotPointType) => void;
}

export function TimelineView({
  plotPoints,
  mythemes,
  onDeletePlotPoint,
  onEditPlotPoint,
}: TimelineViewProps) {
  const sortedPlotPoints = [...plotPoints].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-4 relative">
          {sortedPlotPoints.map((point) => (
            <div key={point.id} className="relative pl-10">
              <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900" />
              <PlotPoint
                plotPoint={point}
                mythemes={mythemes}
                onDelete={onDeletePlotPoint}
                onEdit={onEditPlotPoint}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
