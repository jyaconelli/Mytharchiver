import { Myth } from '../types/myth';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Folder, ChevronRight } from 'lucide-react';

interface MythListProps {
  myths: Myth[];
  selectedMythId: string | null;
  onSelectMyth: (mythId: string) => void;
}

export function MythList({ myths, selectedMythId, onSelectMyth }: MythListProps) {
  return (
    <div className="space-y-3">
      {myths.map((myth) => (
        <Card
          key={myth.id}
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            selectedMythId === myth.id
              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950'
              : ''
          }`}
          onClick={() => onSelectMyth(myth.id)}
        >
          <div className="flex items-start gap-3">
            <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate">{myth.name}</h3>
                <ChevronRight className="w-5 h-5 shrink-0 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {myth.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {myth.variants.length} {myth.variants.length === 1 ? 'variant' : 'variants'}
                </Badge>
                <Badge variant="outline">
                  {myth.variants.reduce((sum, v) => sum + v.plotPoints.length, 0)} total plot points
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
