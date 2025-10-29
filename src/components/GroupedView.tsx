import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import {
  CollaboratorCategory,
  PlotPoint as PlotPointType,
  Mytheme,
} from '../types/myth';
import { PlotPoint } from './PlotPoint';

const ITEM_TYPE = 'PLOT_POINT';
const UNCATEGORIZED_COLUMN_ID = '__uncategorized__';

interface GroupedViewProps {
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  categories: string[];
  collaboratorCategories?: CollaboratorCategory[];
  viewerEmail?: string;
  onUpdatePlotPoint?: (id: string, updates: Partial<PlotPointType>) => Promise<void>;
  onAssignCategory?: (
    plotPointId: string,
    categoryId: string | null,
    categoryName?: string,
  ) => Promise<void>;
  onDeletePlotPoint?: (id: string) => void;
  onEditPlotPoint?: (plotPoint: PlotPointType) => void;
  canEdit?: boolean;
}

interface DraggablePlotPointProps {
  plotPoint: PlotPointType;
  mythemes: Mytheme[];
  canEdit: boolean;
  viewerEmail?: string;
  currentCategoryId: string;
}

function DraggablePlotPoint({
  plotPoint,
  mythemes,
  canEdit,
  viewerEmail,
  currentCategoryId,
}: DraggablePlotPointProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: plotPoint.id, currentCategory: currentCategoryId },
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
        viewerEmail={viewerEmail}
      />
    </div>
  );
}

interface CategoryDropZoneProps {
  title: string;
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  canEdit: boolean;
  viewerEmail?: string;
  onDrop: (plotPointId: string) => void;
  acceptSelf?: string;
  description?: string;
}

function CategoryDropZone({
  title,
  plotPoints,
  mythemes,
  canEdit,
  viewerEmail,
  onDrop,
  acceptSelf,
  description,
}: CategoryDropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { id: string; currentCategory: string }) => {
      if (!canEdit) return;
      if (acceptSelf !== undefined && item.currentCategory === acceptSelf) {
        return;
      }
      onDrop(item.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={canEdit ? drop : undefined}
      className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-950' : 'border-gray-300'
      }`}
    >
      <h3 className="mb-3 font-semibold">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-3">{description}</p>}
      <div className="space-y-2">
        {plotPoints.length === 0 && !description && (
          <p className="text-gray-400 text-center py-8">
            {canEdit ? 'Drop plot points here' : 'No plot points in this category'}
          </p>
        )}
        {plotPoints.map((point) => (
          <DraggablePlotPoint
            key={point.id}
            plotPoint={point}
            mythemes={mythemes}
            canEdit={canEdit}
            viewerEmail={viewerEmail}
            currentCategoryId={acceptSelf ?? ''}
          />
        ))}
      </div>
    </div>
  );
}

export function GroupedView({
  plotPoints,
  mythemes,
  categories,
  collaboratorCategories = [],
  viewerEmail,
  onAssignCategory,
  onDeletePlotPoint,
  onEditPlotPoint,
  canEdit = true,
}: GroupedViewProps) {
  const normalizedViewerEmail = viewerEmail?.toLowerCase() ?? '';
  const viewerCategories = collaboratorCategories.filter(
    (category) => category.collaboratorEmail === normalizedViewerEmail,
  );

  const plotPointsByCategory = new Map<string, PlotPointType[]>();
  plotPointsByCategory.set(UNCATEGORIZED_COLUMN_ID, []);
  viewerCategories.forEach((category) => {
    plotPointsByCategory.set(category.id, []);
  });

  plotPoints.forEach((point) => {
    const assignment = (point.collaboratorCategories ?? []).find(
      (entry) => entry.collaboratorEmail === normalizedViewerEmail,
    );
    if (assignment && assignment.collaboratorCategoryId) {
      const list = plotPointsByCategory.get(assignment.collaboratorCategoryId) ?? [];
      list.push(point);
      plotPointsByCategory.set(assignment.collaboratorCategoryId, list);
    } else {
      const list = plotPointsByCategory.get(UNCATEGORIZED_COLUMN_ID) ?? [];
      list.push(point);
      plotPointsByCategory.set(UNCATEGORIZED_COLUMN_ID, list);
    }
  });

  const handleAssign = async (plotPointId: string, categoryId: string | null, name?: string) => {
    if (!onAssignCategory) return;
    await onAssignCategory(plotPointId, categoryId, name);
  };

  const requestNewCategory = async (plotPointId: string) => {
    if (!onAssignCategory) return;
    const name = window.prompt('Name for new category');
    if (!name || !name.trim()) {
      return;
    }
    await onAssignCategory(plotPointId, null, name.trim());
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CategoryDropZone
          key="uncategorized"
          title="Uncategorized"
          plotPoints={plotPointsByCategory.get(UNCATEGORIZED_COLUMN_ID) ?? []}
          mythemes={mythemes}
          canEdit={canEdit}
          viewerEmail={viewerEmail}
          acceptSelf={UNCATEGORIZED_COLUMN_ID}
          onDrop={async (plotPointId) => {
            if (!canEdit) return;
            await handleAssign(plotPointId, null);
          }}
        />
        {viewerCategories.map((category) => (
          <CategoryDropZone
            key={category.id}
            title={category.name}
            plotPoints={plotPointsByCategory.get(category.id) ?? []}
            mythemes={mythemes}
            canEdit={canEdit}
            viewerEmail={viewerEmail}
            acceptSelf={category.id}
            onDrop={async (plotPointId) => {
              if (!canEdit) return;
              await handleAssign(plotPointId, category.id, category.name);
            }}
          />
        ))}
        {canEdit && onAssignCategory && (
          <CategoryDropZone
            key="new"
            title="Create New Category"
            plotPoints={[]}
            mythemes={mythemes}
            canEdit={canEdit}
            viewerEmail={viewerEmail}
            description="Drag a plot point here to create a new personal category."
            onDrop={requestNewCategory}
          />
        )}
      </div>
    </DndProvider>
  );
}
