import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';

interface AddMythDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, description: string) => Promise<void>;
}

export function AddMythDialog({ open, onOpenChange, onAdd }: AddMythDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAdd(name, description);
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add the myth folder.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Myth Folder</DialogTitle>
        </DialogHeader>
        <p className="sr-only">Create a new myth folder to organize variants</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="myth-name">Myth Name</Label>
              <Input
                id="myth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Prometheus Steals Fire"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="myth-description">Description</Label>
              <Textarea
                id="myth-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the myth..."
                rows={3}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Myth
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
