import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { VariantView } from '../components/VariantView';
import { CollaboratorSummary } from '../components/CollaboratorSummary';
import { useArchiveLayoutContext } from './ArchiveLayout';
import { useMythemesContext, useMythsContext } from '../providers/MythArchiveProvider';
import { CollaboratorRole, VariantContributorType } from '../types/myth';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { Badge } from '../components/ui/badge';
import { UserCircle2 } from 'lucide-react';

export function VariantDetailPage() {
  const { mythId, variantId } = useParams<{ mythId: string; variantId: string }>();
  const { myths, updateVariant, createCollaboratorCategory, loading } = useMythsContext();
  const { mythemes } = useMythemesContext();
  const {
    currentUserEmail,
    currentUserDisplayName,
    currentUserAvatarUrl,
    sessionUserId,
    openManageCollaborators,
  } = useArchiveLayoutContext();

  const isInitialLoad = loading && myths.length === 0;

  const myth = useMemo(
    () => myths.find((candidate) => candidate.id === mythId) ?? null,
    [myths, mythId],
  );

  const variant = useMemo(
    () => myth?.variants.find((candidate) => candidate.id === variantId) ?? null,
    [myth, variantId],
  );

  const selectedMythRole: CollaboratorRole | 'owner' | null = useMemo(() => {
    if (!myth) {
      return null;
    }
    if (myth.ownerId === sessionUserId) {
      return 'owner';
    }
    const collaborator = myth.collaborators.find((person) => person.email === currentUserEmail);
    return collaborator?.role ?? null;
  }, [myth, sessionUserId, currentUserEmail]);

  const canEdit = selectedMythRole === 'owner' || selectedMythRole === 'editor';

  const contributorTypeLabel: Record<VariantContributorType, string> = {
    owner: 'Owner',
    collaborator: 'Collaborator',
    invitee: 'Guest contributor',
    unknown: 'Contributor',
  };

  const displayContributorName = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const contributorCard = variant?.contributor ? (
    <div className="border-dashed border-2 border-gray-400 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-3">
        <UserCircle2 className="h-8 w-8 text-black" />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Contributed by
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {variant.contributor.email &&
            currentUserEmail &&
            variant.contributor.email === currentUserEmail
              ? 'You'
              : (displayContributorName(variant.contributor.name) ??
                variant.contributor.email ??
                'Unknown contributor')}
          </p>
          {displayContributorName(variant.contributor.name) &&
            variant.contributor.email &&
            displayContributorName(variant.contributor.name) !== variant.contributor.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {variant.contributor.email}
              </p>
            )}
        </div>
        <Badge>{contributorTypeLabel[variant.contributor.type]}</Badge>
      </div>
      {variant.contributor.type === 'invitee' && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Submitted through an invitation link.
        </p>
      )}
    </div>
  ) : null;

  if (isInitialLoad) {
    return (
      <div className="flex justify-center py-16">
        <LoadingAnimation message="Loading variant…" />
      </div>
    );
  }

  if (!myth) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-200">
        <h2 className="text-lg font-semibold">Myth not found</h2>
        <p className="mt-2 text-sm">
          The requested myth is unavailable or you may have lost access to it.
        </p>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-200">
        <h2 className="text-lg font-semibold">Variant not found</h2>
        <p className="mt-2 text-sm">
          The requested myth variant could not be located or you no longer have access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CollaboratorSummary
        myth={myth}
        currentUserEmail={currentUserEmail}
        sessionUserId={sessionUserId}
        currentUserDisplayName={currentUserDisplayName}
        currentUserAvatarUrl={currentUserAvatarUrl}
        onManage={() => openManageCollaborators(myth.id)}
      />

      {contributorCard}

      <VariantView
        variant={variant}
        mythemes={mythemes}
        categories={myth.categories}
        canonicalCategories={myth.canonicalCategories}
        collaboratorCategories={myth.collaboratorCategories}
        collaborators={myth.collaborators}
        onUpdateVariant={(updated) => updateVariant(myth.id, updated)}
        canEdit={canEdit}
        viewerEmail={currentUserEmail}
        onCreateCollaboratorCategory={(name) => createCollaboratorCategory(myth.id, name)}
      />
    </div>
  );
}
