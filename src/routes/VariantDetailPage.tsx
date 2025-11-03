import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { VariantView } from '../components/VariantView';
import { CollaboratorSummary } from '../components/CollaboratorSummary';
import { useArchive } from './ArchiveLayout';
import { CollaboratorRole } from '../types/myth';
import { LoadingAnimation } from '../components/LoadingAnimation';

export function VariantDetailPage() {
  const { mythId, variantId } = useParams<{ mythId: string; variantId: string }>();
  const {
    myths,
    mythemes,
    updateVariant,
    currentUserEmail,
    currentUserDisplayName,
    currentUserAvatarUrl,
    sessionUserId,
    createCollaboratorCategory,
    openManageCollaborators,
    isInitialLoad,
  } = useArchive();

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
