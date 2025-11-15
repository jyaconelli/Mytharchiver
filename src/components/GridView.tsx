import { useMemo } from 'react';
import { COLORS } from '../lib/colors';
import { PlotPoint as PlotPointType, Mytheme } from '../types/myth';
import { PlotPoint } from './PlotPoint';
import { cn } from './ui/utils';

interface GridViewProps {
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
  categories: string[];
  onDeletePlotPoint?: (id: string) => void;
  onEditPlotPoint?: (plotPoint: PlotPointType) => void;
  canEdit?: boolean;
  viewerEmail?: string;
}

export function GridView({
  plotPoints,
  mythemes,
  categories,
  onDeletePlotPoint,
  onEditPlotPoint,
  canEdit = true,
  viewerEmail,
}: GridViewProps) {
  const sortedPlotPoints = [...plotPoints].sort((a, b) => a.order - b.order);

  const baseCategories = Array.from(new Set(categories));
  const categorySet = new Set(baseCategories);

  for (const point of sortedPlotPoints) {
    if (!categorySet.has(point.category)) {
      categorySet.add(point.category);
      baseCategories.push(point.category);
    }
  }

  if (baseCategories.length === 0) {
    baseCategories.push('Uncategorized');
  }

  const colors: { [key: string]: string } = useMemo(
    () =>
      COLORS.map((v, i) => ({ key: baseCategories[i], value: `${v[0]} ${v[1]}` })).reduce(
        (prev, curr) => ({ ...prev, [curr.key]: curr.value }),
        {},
      ),
    [categories.length],
  );
  console.log(colors);

  const numColumns = Math.max(baseCategories.length, 1);
  const categoryIndexMap = new Map(baseCategories.map((category, index) => [category, index]));

  const grid: (PlotPointType | null)[][] = [];
  let lastPosition = -1;

  const ensureRow = (rowIndex: number) => {
    if (!grid[rowIndex]) {
      grid[rowIndex] = Array.from({ length: numColumns }, () => null);
    }
  };

  for (const point of sortedPlotPoints) {
    const columnIndex = categoryIndexMap.get(point.category) ?? 0;
    let rowIndex = 0;

    while (true) {
      const positionIndex = rowIndex * numColumns + columnIndex;

      if (positionIndex <= lastPosition) {
        rowIndex += 1;
        continue;
      }

      ensureRow(rowIndex);

      if (grid[rowIndex][columnIndex]) {
        rowIndex += 1;
        continue;
      }

      grid[rowIndex][columnIndex] = point;
      lastPosition = positionIndex;
      break;
    }
  }

  const getCategoryHeaderColor = (category: string) => {
    const color = colors[category];
    return color || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(250px, 1fr))` }}
        >
          {/* Header row */}
          {baseCategories.map((category) => (
            <div
              key={category}
              className={cn(`p-3 rounded-t-lg text-center`, getCategoryHeaderColor(category))}
            >
              <span className='bg-white font-robot px-1'>{category}</span>
            </div>
          ))}

          {/* Data rows */}
          {grid.length === 0 ? (
            <div className="col-span-full border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {canEdit ? 'No plot points yet.' : 'No plot points to display.'}
            </div>
          ) : (
            grid.map((row, rowIndex) =>
              row.map((point, colIndex) => (
                <div key={`${rowIndex}-${colIndex}`} className="min-h-[100px]">
                  {point ? (
                    <PlotPoint
                      plotPoint={point}
                      mythemes={mythemes}
                      showCategory={false}
                      onDelete={canEdit ? onDeletePlotPoint : undefined}
                      onEdit={canEdit ? onEditPlotPoint : undefined}
                      viewerEmail={viewerEmail}
                    />
                  ) : (
                    <div className="h-full border-2 border-dashed border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              )),
            )
          )}
        </div>
      </div>
    </div>
  );
}
