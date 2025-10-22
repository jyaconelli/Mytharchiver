import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Users } from 'lucide-react';
import { Myth } from '../types/myth';

type CollaboratorSummaryProps = {
  myth: Myth;
  currentUserEmail: string;
  sessionUserId: string;
  onManage: () => void;
};

export function CollaboratorSummary({
  myth,
  currentUserEmail,
  sessionUserId,
  onManage,
}: CollaboratorSummaryProps) {
  const collaboratorsForDisplay = getCollaboratorsForDisplay(myth, currentUserEmail, sessionUserId);
  const canManage = myth.ownerId === sessionUserId;

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Collaborators
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {collaboratorsForDisplay.length}{' '}
            {collaboratorsForDisplay.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onManage}>
          <Users className="mr-2 h-4 w-4" />
          {canManage ? 'Manage' : 'View'}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {collaboratorsForDisplay.length === 0 ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">No collaborators yet.</span>
        ) : (
          collaboratorsForDisplay.map((collaborator) => (
            <Badge
              key={collaborator.id}
              variant="outline"
              className="flex items-center gap-2 text-xs uppercase tracking-wide"
            >
              <span className="font-semibold">{collaborator.label}</span>
              <span className="normal-case text-[0.7rem] text-gray-600 dark:text-gray-200">
                {collaborator.email}
              </span>
            </Badge>
          ))
        )}
      </div>
    </section>
  );
}

function getCollaboratorsForDisplay(myth: Myth, currentUserEmail: string, sessionUserId: string) {
  const collaborators = [...myth.collaborators];
  const normalizedEmail = currentUserEmail?.toLowerCase();
  const hasOwnerEntry = collaborators.some((collaborator) => collaborator.role === 'owner');

  if (myth.ownerId === sessionUserId && normalizedEmail && !hasOwnerEntry) {
    collaborators.push({
      id: `owner-${myth.id}`,
      mythId: myth.id,
      email: normalizedEmail,
      role: 'owner',
    });
  }

  const roleWeight: Record<string, number> = {
    owner: 0,
    editor: 1,
    viewer: 2,
  };

  return collaborators
    .sort((a, b) => {
      const diff = (roleWeight[a.role] ?? 99) - (roleWeight[b.role] ?? 99);
      if (diff !== 0) return diff;
      return a.email.localeCompare(b.email);
    })
    .map((collaborator) => ({
      id: collaborator.id,
      email: collaborator.email,
      label:
        collaborator.role === 'owner'
          ? 'Owner'
          : collaborator.role.charAt(0).toUpperCase() + collaborator.role.slice(1),
    }));
}
