import { FormEvent, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2 } from 'lucide-react';

interface AddMythemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, type: 'character' | 'event' | 'place' | 'object') => Promise<void>;
}

export function AddMythemeDialog({ open, onOpenChange, onAdd }: AddMythemeDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'character' | 'event' | 'place' | 'object'>('character');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAdd(name, type);
      setName('');
      setType('character');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add the mytheme.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Mytheme</DialogTitle>
        </DialogHeader>
        <p className="sr-only">Create a new mytheme for tagging in plot points</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mytheme-name">Mytheme Name</Label>
              <Input
                id="mytheme-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Zeus, Mount Olympus, Fire"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mytheme-type">Type</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger id="mytheme-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="place">Place</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Mytheme
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
