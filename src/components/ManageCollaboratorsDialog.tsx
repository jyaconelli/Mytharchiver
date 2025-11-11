import { useEffect, useMemo, useState, FormEvent } from 'react';
import { Myth, MythCollaborator, CollaboratorRole } from '../types/myth';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Loader2, ShieldAlert, UserMinus } from 'lucide-react';

interface ManageCollaboratorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myth: Myth | null;
  canManage: boolean;
  currentUserEmail: string;
  onAddCollaborator: (mythId: string, email: string, role: CollaboratorRole) => Promise<void>;
  onUpdateCollaboratorRole: (collaboratorId: string, role: CollaboratorRole) => Promise<void>;
  onRemoveCollaborator: (collaboratorId: string) => Promise<void>;
}

const ADDABLE_ROLES: CollaboratorRole[] = ['viewer', 'editor'];

export function ManageCollaboratorsDialog({
  open,
  onOpenChange,
  myth,
  canManage,
  currentUserEmail,
  onAddCollaborator,
  onUpdateCollaboratorRole,
  onRemoveCollaborator,
}: ManageCollaboratorsDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('viewer');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setRole('viewer');
      setFormError(null);
      setInlineError(null);
      setSubmitting(false);
      setUpdatingId(null);
      setRemovingId(null);
    }
  }, [open]);

  const collaborators = useMemo(() => {
    if (!myth) {
      return [] as MythCollaborator[];
    }

    const entries = [...myth.collaborators];
    const roleWeight: Record<CollaboratorRole, number> = {
      owner: 0,
      editor: 1,
      viewer: 2,
    };

    return entries.sort((a, b) => {
      const diff = roleWeight[a.role] - roleWeight[b.role];
      if (diff !== 0) {
        return diff;
      }
      return a.email.localeCompare(b.email);
    });
  }, [myth]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!myth) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await onAddCollaborator(myth.id, email, role);
      setEmail('');
      setRole('viewer');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to add collaborator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: CollaboratorRole) => {
    setUpdatingId(collaboratorId);
    setInlineError(null);
    try {
      await onUpdateCollaboratorRole(collaboratorId, newRole);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Unable to update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    setInlineError(null);
    try {
      await onRemoveCollaborator(collaboratorId);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Unable to remove collaborator.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Collaborators</DialogTitle>
        </DialogHeader>
        {!myth ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a myth folder to manage collaborators.
          </p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Share “{myth.name}”
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Invite teammates by email. Viewers can only read data, editors can modify content,
                and owners can manage sharing.
              </p>
            </div>

            {canManage ? (
              <form
                onSubmit={handleAdd}
                className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600"
              >
                <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                  <div className="space-y-1">
                    <Label htmlFor="collaborator-email">Email</Label>
                    <Input
                      id="collaborator-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="teammate@example.com"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="collaborator-role">Role</Label>
                    <Select
                      value={role}
                      onValueChange={(value: CollaboratorRole) => setRole(value)}
                      disabled={submitting}
                    >
                      <SelectTrigger id="collaborator-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADDABLE_ROLES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Collaborator
                </Button>
              </form>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Only owners can manage collaborators for this myth. You can still see who has
                  access.
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Current collaborators
                </h3>
                <Badge variant="secondary" className="text-xs uppercase">
                  {collaborators.length} total
                </Badge>
              </div>
              {inlineError && (
                <p className="text-sm text-red-600 dark:text-red-400">{inlineError}</p>
              )}
              {collaborators.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  No collaborators yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {collaborators.map((collaborator) => {
                    const isOwner = collaborator.role === 'owner';
                    const isCurrentUser = collaborator.email === currentUserEmail;
                    const displayName = collaborator.displayName ?? collaborator.email;
                    const initials = getInitials(displayName);
                    const roleLabel = isOwner
                      ? 'Owner'
                      : collaborator.role.charAt(0).toUpperCase() + collaborator.role.slice(1);

                    return (
                      <li
                        key={collaborator.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 border border-gray-200 text-sm font-semibold dark:border-gray-600">
                            <AvatarImage
                              src={collaborator.avatarUrl ?? undefined}
                              alt={displayName}
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-gray-800 dark:text-gray-100">
                                {displayName}
                              </span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs uppercase">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="uppercase">{roleLabel}</span>
                              <span className="text-gray-400 dark:text-gray-500">·</span>
                              <span className="truncate">{collaborator.email}</span>
                            </div>
                          </div>
                        </div>
                        {canManage && !isOwner && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={collaborator.role}
                              onValueChange={(value: CollaboratorRole) =>
                                handleRoleChange(collaborator.id, value)
                              }
                              disabled={updatingId === collaborator.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ADDABLE_ROLES.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => handleRemove(collaborator.id)}
                              disabled={removingId === collaborator.id}
                            >
                              {removingId === collaborator.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserMinus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
