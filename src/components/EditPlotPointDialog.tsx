import { useEffect, useState } from 'react';
import { PlotPoint as PlotPointType, Mytheme } from '../types/myth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Loader2, X } from 'lucide-react';

interface EditPlotPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotPoint: PlotPointType | null;
  categories: string[];
  mythemes: Mytheme[];
  onSave: (updates: { text: string; category: string; mythemeRefs: string[] }) => Promise<void>;
}

export function EditPlotPointDialog({
  open,
  onOpenChange,
  plotPoint,
  categories,
  mythemes,
  onSave,
}: EditPlotPointDialogProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [selectedMythemes, setSelectedMythemes] = useState<string[]>([]);
  const [showMythemeSelector, setShowMythemeSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && plotPoint) {
      setText(plotPoint.text);
      setCategory(plotPoint.category);
      setSelectedMythemes(plotPoint.mythemeRefs ?? []);
      setShowMythemeSelector(false);
      setError(null);
    }
  }, [open, plotPoint]);

  const toggleMytheme = (mythemeId: string) => {
    setSelectedMythemes(prev =>
      prev.includes(mythemeId)
        ? prev.filter(id => id !== mythemeId)
        : [...prev, mythemeId]
    );
  };

  const removeMytheme = (mythemeId: string) => {
    setSelectedMythemes(prev => prev.filter(id => id !== mythemeId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!plotPoint || !text.trim() || !category) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSave({
        text,
        category,
        mythemeRefs: selectedMythemes,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the plot point.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMythemeObjects = mythemes.filter(m => selectedMythemes.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Plot Point {plotPoint ? `(Order #${plotPoint.order})` : ''}</DialogTitle>
        </DialogHeader>
        <p className="sr-only">Edit plot point content, category, and mytheme references</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plot-text">Plot Point Text</Label>
              <Textarea
                id="edit-plot-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Update the narrative detail…"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plot-category">Category</Label>
              <Select
                value={category}
                onValueChange={setCategory}
                required
              >
                <SelectTrigger id="edit-plot-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Referenced Mythemes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMythemeSelector(!showMythemeSelector)}
                >
                  {showMythemeSelector ? 'Hide' : 'Select'} Mythemes
                </Button>
              </div>

              {selectedMythemeObjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMythemeObjects.map((mytheme) => (
                    <Badge key={mytheme.id} variant="secondary" className="gap-1">
                      {mytheme.name}
                      <button
                        type="button"
                        onClick={() => removeMytheme(mytheme.id)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {showMythemeSelector && (
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {mythemes.length === 0 ? (
                    <p className="text-gray-500">No mythemes available. Create some first!</p>
                  ) : (
                    mythemes.map((mytheme) => (
                      <div key={mytheme.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-mytheme-${mytheme.id}`}
                          checked={selectedMythemes.includes(mytheme.id)}
                          onCheckedChange={() => toggleMytheme(mytheme.id)}
                        />
                        <Label
                          htmlFor={`edit-mytheme-${mytheme.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span>{mytheme.name}</span>
                          <span className="text-gray-500 ml-2">({mytheme.type})</span>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !plotPoint}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
