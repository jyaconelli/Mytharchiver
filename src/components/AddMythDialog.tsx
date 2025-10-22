import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface AddMythDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, description: string) => void;
}

export function AddMythDialog({ open, onOpenChange, onAdd }: AddMythDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name, description);
      setName('');
      setDescription('');
      onOpenChange(false);
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Myth</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
