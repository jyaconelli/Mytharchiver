import { useState } from 'react';
import { PlotPoint as PlotPointType, Mytheme } from '../types/myth';
import { PlotPoint } from './PlotPoint';
import { Card } from './ui/card';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface GroupedViewProps {
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  categories: string[];
  onUpdatePlotPoint: (id: string, updates: Partial<PlotPointType>) => void;
}

interface DraggablePlotPointProps {
  plotPoint: PlotPointType;
  mythemes: Mytheme[];
  onDrop: (id: string, newCategory: string) => void;
}

const ITEM_TYPE = 'PLOT_POINT';

function DraggablePlotPoint({ plotPoint, mythemes, onDrop }: DraggablePlotPointProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: plotPoint.id, currentCategory: plotPoint.category },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} className="cursor-move">
      <PlotPoint plotPoint={plotPoint} mythemes={mythemes} showCategory={false} isDragging={isDragging} />
    </div>
  );
}

interface CategoryDropZoneProps {
  category: string;
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  onDrop: (id: string, newCategory: string) => void;
}

function CategoryDropZone({ category, plotPoints, mythemes, onDrop }: CategoryDropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { id: string; currentCategory: string }) => {
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
      ref={drop}
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
          />
        ))}
        {sortedPlotPoints.length === 0 && (
          <p className="text-gray-400 text-center py-8">Drop plot points here</p>
        )}
      </div>
    </div>
  );
}

export function GroupedView({ plotPoints, mythemes, categories, onUpdatePlotPoint }: GroupedViewProps) {
  const handleDrop = (id: string, newCategory: string) => {
    onUpdatePlotPoint(id, { category: newCategory });
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
          />
        ))}
      </div>
    </DndProvider>
  );
}
