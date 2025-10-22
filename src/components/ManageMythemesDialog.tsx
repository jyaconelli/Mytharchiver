import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Mytheme } from '../types/myth';
import { X, Plus, Loader2 } from 'lucide-react';
import { Card } from './ui/card';

interface ManageMythemesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mythemes: Mytheme[];
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
}

export function ManageMythemesDialog({
  open,
  onOpenChange,
  mythemes,
  onDelete,
  onAdd,
}: ManageMythemesDialogProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setDeletingId(null);
    }
  }, [open]);

  const groupedByType = mythemes.reduce(
    (acc, mytheme) => {
      if (!acc[mytheme.type]) {
        acc[mytheme.type] = [];
      }
      acc[mytheme.type].push(mytheme);
      return acc;
    },
    {} as Record<string, Mytheme[]>,
  );

  const types: Array<'character' | 'event' | 'place' | 'object'> = [
    'character',
    'event',
    'place',
    'object',
  ];

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);

    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the mytheme.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Manage Mythemes</span>
            <Button onClick={onAdd} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Mytheme
            </Button>
          </DialogTitle>
        </DialogHeader>
        <p className="sr-only">View and manage all mythemes by type</p>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}
          {types.map((type) => (
            <div key={type}>
              <h3 className="mb-2 capitalize">{type}s</h3>
              <Card className="p-3">
                <div className="flex flex-wrap gap-2">
                  {groupedByType[type]?.length > 0 ? (
                    groupedByType[type].map((mytheme) => (
                      <Badge key={mytheme.id} variant="secondary" className="gap-1">
                        {mytheme.name}
                        <button
                          type="button"
                          onClick={() => handleDelete(mytheme.id)}
                          className="ml-1 hover:text-red-600"
                          disabled={deletingId === mytheme.id}
                        >
                          {deletingId === mytheme.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-400">No {type}s</p>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
