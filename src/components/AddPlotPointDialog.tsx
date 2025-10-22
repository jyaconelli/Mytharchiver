import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mytheme } from '../types/myth';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { X } from 'lucide-react';

interface AddPlotPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (text: string, category: string, mythemeRefs: string[]) => void;
  categories: string[];
  mythemes: Mytheme[];
  nextOrder: number;
}

export function AddPlotPointDialog({ 
  open, 
  onOpenChange, 
  onAdd, 
  categories, 
  mythemes,
  nextOrder 
}: AddPlotPointDialogProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [selectedMythemes, setSelectedMythemes] = useState<string[]>([]);
  const [showMythemeSelector, setShowMythemeSelector] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && category) {
      onAdd(text, category, selectedMythemes);
      setText('');
      setCategory('');
      setSelectedMythemes([]);
      setShowMythemeSelector(false);
      onOpenChange(false);
    }
  };

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

  const selectedMythemeObjects = mythemes.filter(m => selectedMythemes.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Plot Point (Order #{nextOrder})</DialogTitle>
        </DialogHeader>
        <p className="sr-only">Create a new plot point with category and mytheme references</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plot-text">Plot Point Text</Label>
              <Textarea
                id="plot-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., Prometheus observes humanity struggling without fire"
                rows={3}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plot-category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="plot-category">
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
                          id={`mytheme-${mytheme.id}`}
                          checked={selectedMythemes.includes(mytheme.id)}
                          onCheckedChange={() => toggleMytheme(mytheme.id)}
                        />
                        <Label
                          htmlFor={`mytheme-${mytheme.id}`}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Plot Point</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
