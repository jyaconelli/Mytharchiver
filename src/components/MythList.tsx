import { Myth } from '../types/myth';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Folder, ChevronRight, Plus, Users } from 'lucide-react';

interface MythListProps {
  myths: Myth[];
  selectedMythId: string | null;
  onSelectMyth: (mythId: string) => void;
  onAddMyth: () => void;
}

export function MythList({ myths, selectedMythId, onSelectMyth, onAddMyth }: MythListProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAddMyth} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Myth Folder
        </Button>
      </div>
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
              {myth.collaborators.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  <div className="flex flex-wrap items-center gap-2">
                    {myth.collaborators.slice(0, 3).map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <Avatar className="h-6 w-6 border border-gray-200 text-[0.65rem] font-semibold dark:border-gray-600">
                          <AvatarImage
                            src={collaborator.avatarUrl ?? undefined}
                            alt={collaborator.displayName ?? collaborator.email}
                          />
                          <AvatarFallback>
                            {getInitials(collaborator.displayName ?? collaborator.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[0.7rem] font-medium text-gray-800 dark:text-gray-100">
                            {collaborator.displayName ?? collaborator.email}
                          </span>
                          <span className="text-[0.6rem] text-gray-500 dark:text-gray-400">
                            {collaborator.role === 'owner'
                              ? 'Owner'
                              : collaborator.role.charAt(0).toUpperCase() +
                                collaborator.role.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {myth.collaborators.length > 3 && (
                      <Badge variant="secondary" className="text-[0.65rem]">
                        +{myth.collaborators.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function getInitials(label: string) {
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '??'
  );
}
