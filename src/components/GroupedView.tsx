import { PlotPoint as PlotPointType, Mytheme } from '../types/myth';
import { PlotPoint } from './PlotPoint';
import { Card } from './ui/card';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface GroupedViewProps {
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  categories: string[];
  onUpdatePlotPoint?: (id: string, updates: Partial<PlotPointType>) => Promise<void>;
  onDeletePlotPoint?: (id: string) => void;
  onEditPlotPoint?: (plotPoint: PlotPointType) => void;
  canEdit?: boolean;
}

interface DraggablePlotPointProps {
  plotPoint: PlotPointType;
  mythemes: Mytheme[];
  onDrop: (id: string, newCategory: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (plotPoint: PlotPointType) => void;
  canEdit: boolean;
}

const ITEM_TYPE = 'PLOT_POINT';

function DraggablePlotPoint({
  plotPoint,
  mythemes,
  onDrop,
  onDelete,
  onEdit,
  canEdit,
}: DraggablePlotPointProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: plotPoint.id, currentCategory: plotPoint.category },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: canEdit,
  }));

  return (
    <div ref={canEdit ? drag : undefined} className={canEdit ? 'cursor-move' : ''}>
      <PlotPoint
        plotPoint={plotPoint}
        mythemes={mythemes}
        showCategory={false}
        isDragging={isDragging}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  );
}

interface CategoryDropZoneProps {
  category: string;
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  onDrop: (id: string, newCategory: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (plotPoint: PlotPointType) => void;
  canEdit: boolean;
}

function CategoryDropZone({
  category,
  plotPoints,
  mythemes,
  onDrop,
  onDelete,
  onEdit,
  canEdit,
}: CategoryDropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { id: string; currentCategory: string }) => {
      if (!canEdit || item.currentCategory === category) {
        return;
      }
      if (item.currentCategory !== category) {
        onDrop(item.id, category);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Introduction': 'border-slate-300 dark:border-slate-700',
      'Conflict': 'border-red-300 dark:border-red-700',
      'Journey': 'border-amber-300 dark:border-amber-700',
      'Transformation': 'border-purple-300 dark:border-purple-700',
      'Resolution': 'border-green-300 dark:border-green-700',
      'Aftermath': 'border-blue-300 dark:border-blue-700',
    };
    return colors[category] || 'border-gray-300';
  };

  const sortedPlotPoints = [...plotPoints].sort((a, b) => a.order - b.order);

  return (
    <div
      ref={canEdit ? drop : undefined}
      className={`border-2 rounded-lg p-4 min-h-[200px] ${getCategoryColor(category)} ${
        isOver ? 'bg-blue-50 dark:bg-blue-950' : ''
      }`}
    >
      <h3 className="mb-3">{category}</h3>
      <div className="space-y-2">
        {sortedPlotPoints.map((point) => (
          <DraggablePlotPoint
            key={point.id}
            plotPoint={point}
            mythemes={mythemes}
            onDrop={onDrop}
            onDelete={onDelete}
            onEdit={onEdit}
            canEdit={canEdit}
          />
        ))}
        {sortedPlotPoints.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            {canEdit ? 'Drop plot points here' : 'No plot points in this category'}
          </p>
        )}
      </div>
    </div>
  );
}

export function GroupedView({
  plotPoints,
  mythemes,
  categories,
  onUpdatePlotPoint,
  onDeletePlotPoint,
  onEditPlotPoint,
  canEdit = true,
}: GroupedViewProps) {
  const handleDrop = (id: string, newCategory: string) => {
    if (canEdit && onUpdatePlotPoint) {
      void onUpdatePlotPoint(id, { category: newCategory });
    }
  };

  const groupedPoints = categories.reduce((acc, category) => {
    acc[category] = plotPoints.filter(p => p.category === category);
    return acc;
  }, {} as Record<string, PlotPointType[]>);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryDropZone
            key={category}
            category={category}
            plotPoints={groupedPoints[category] || []}
            mythemes={mythemes}
            onDrop={handleDrop}
            onDelete={onDeletePlotPoint}
            onEdit={onEditPlotPoint}
            canEdit={canEdit && Boolean(onUpdatePlotPoint)}
          />
        ))}
      </div>
    </DndProvider>
  );
}
