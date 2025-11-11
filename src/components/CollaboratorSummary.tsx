import { Button } from './ui/button';
import { Users } from 'lucide-react';
import { Myth } from '../types/myth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type CollaboratorSummaryProps = {
  myth: Myth;
  currentUserEmail: string;
  sessionUserId: string;
  currentUserDisplayName?: string | null;
  currentUserAvatarUrl?: string | null;
  onManage: () => void;
};

export function CollaboratorSummary({
  myth,
  currentUserEmail,
  sessionUserId,
  currentUserDisplayName,
  currentUserAvatarUrl,
  onManage,
}: CollaboratorSummaryProps) {
  const collaboratorsForDisplay = getCollaboratorsForDisplay(
    myth,
    currentUserEmail,
    sessionUserId,
    currentUserDisplayName,
    currentUserAvatarUrl,
  );
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
            <div
              key={collaborator.id}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs uppercase tracking-wide dark:border-gray-700 dark:bg-gray-900"
            >
              <Avatar className="h-6 w-6 border border-gray-200 text-[0.65rem] font-semibold dark:border-gray-600">
                <AvatarImage
                  src={collaborator.avatarUrl ?? undefined}
                  alt={collaborator.displayName ?? collaborator.email}
                />
                <AvatarFallback>{collaborator.initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left normal-case leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-[0.75rem] font-semibold text-gray-800 dark:text-gray-100">
                    {collaborator.displayName ?? collaborator.email}
                  </span>
                  {collaborator.isCurrentUser && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-[1px] text-[0.55rem] font-semibold uppercase text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      You
                    </span>
                  )}
                </div>
                <span className="text-[0.65rem] text-gray-500 dark:text-gray-400">
                  {collaborator.label}
                </span>
                <span className="text-[0.6rem] text-gray-400 dark:text-gray-500">
                  {collaborator.email}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function getCollaboratorsForDisplay(
  myth: Myth,
  currentUserEmail: string,
  sessionUserId: string,
  currentUserDisplayName?: string | null,
  currentUserAvatarUrl?: string | null,
) {
  const collaborators = [...myth.collaborators];
  const normalizedEmail = currentUserEmail?.toLowerCase();
  const hasOwnerEntry = collaborators.some((collaborator) => collaborator.role === 'owner');

  if (myth.ownerId === sessionUserId && normalizedEmail && !hasOwnerEntry) {
    collaborators.push({
      id: `owner-${myth.id}`,
      mythId: myth.id,
      email: normalizedEmail,
      role: 'owner',
      displayName: currentUserDisplayName ?? null,
      avatarUrl: currentUserAvatarUrl ?? null,
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
      displayName: collaborator.displayName ?? null,
      avatarUrl: collaborator.avatarUrl ?? null,
      initials: getInitials(collaborator.displayName ?? collaborator.email),
      isCurrentUser: collaborator.email === normalizedEmail,
      label:
        collaborator.role === 'owner'
          ? 'Owner'
          : collaborator.role.charAt(0).toUpperCase() + collaborator.role.slice(1),
    }));
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
