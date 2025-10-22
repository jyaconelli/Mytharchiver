import { FormEvent, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';

interface AddVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, source: string) => Promise<void>;
}

export function AddVariantDialog({ open, onOpenChange, onAdd }: AddVariantDialogProps) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !source.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAdd(name, source);
      setName('');
      setSource('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add the variant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Myth Variant</DialogTitle>
        </DialogHeader>
        <p className="sr-only">Create a new variant with plot points for this myth</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variant-name">Variant Name</Label>
              <Input
                id="variant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Hesiod's Version"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant-source">Source</Label>
              <Input
                id="variant-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Theogony, Works and Days"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Variant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
