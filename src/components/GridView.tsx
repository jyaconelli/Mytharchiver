import { PlotPoint as PlotPointType, Mytheme, CATEGORIES } from '../types/myth';
import { PlotPoint } from './PlotPoint';

interface GridViewProps {
  plotPoints: PlotPointType[];
  mythemes: Mytheme[];
}

export function GridView({ plotPoints, mythemes }: GridViewProps) {
  // Sort plot points chronologically
  const sortedPlotPoints = [...plotPoints].sort((a, b) => a.order - b.order);
  
  // Create grid structure: arrange chronologically left-to-right, top-to-bottom
  // Each row can hold as many categories as we have
  const numColumns = CATEGORIES.length;
  
  // Calculate how many rows we need
  const numRows = Math.ceil(sortedPlotPoints.length / numColumns);
  
  // Create a 2D array to hold the grid
  const grid: (PlotPointType | null)[][] = Array(numRows)
    .fill(null)
    .map(() => Array(numColumns).fill(null));
  
  // Fill the grid left-to-right, top-to-bottom
  sortedPlotPoints.forEach((point, index) => {
    const row = Math.floor(index / numColumns);
    const col = index % numColumns;
    grid[row][col] = point;
  });

  const getCategoryHeaderColor = (category: string) => {
    const colors: Record<string, string> = {
      'Introduction': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'Conflict': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'Journey': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      'Transformation': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'Resolution': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Aftermath': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(250px, 1fr))` }}>
          {/* Header row */}
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className={`p-3 rounded-t-lg text-center ${getCategoryHeaderColor(category)}`}
            >
              {category}
            </div>
          ))}
          
          {/* Data rows */}
          {grid.map((row, rowIndex) => (
            row.map((point, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} className="min-h-[100px]">
                {point ? (
                  <PlotPoint plotPoint={point} mythemes={mythemes} showCategory={false} />
                ) : (
                  <div className="h-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg" />
                )}
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}
