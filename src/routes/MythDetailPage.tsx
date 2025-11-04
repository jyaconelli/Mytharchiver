import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { VariantSelector } from '../components/VariantSelector';
import { CollaboratorSummary } from '../components/CollaboratorSummary';
import { AddVariantDialog } from '../components/AddVariantDialog';
import { useArchive } from './ArchiveLayout';
import { CollaboratorRole } from '../types/myth';
import { LoadingAnimation } from '../components/LoadingAnimation';

export function MythDetailPage() {
  const { mythId } = useParams<{ mythId: string }>();
  const navigate = useNavigate();
  const {
    myths,
    addVariant,
    currentUserEmail,
    currentUserDisplayName,
    currentUserAvatarUrl,
    sessionUserId,
    openManageCollaborators,
    isInitialLoad,
  } = useArchive();
  const [showAddVariant, setShowAddVariant] = useState(false);

  const myth = useMemo(
    () => myths.find((candidate) => candidate.id === mythId) ?? null,
    [myths, mythId],
  );

  const selectedMythRole: CollaboratorRole | 'owner' | null = useMemo(() => {
    if (!myth) {
      return null;
    }
    if (myth.ownerId === sessionUserId) {
      return 'owner';
    }
    const collaborator = myth.collaborators.find(
      (person) => person.email === currentUserEmail,
    );
    return collaborator?.role ?? null;
  }, [myth, sessionUserId, currentUserEmail]);

  const canEdit = selectedMythRole === 'owner' || selectedMythRole === 'editor';

  if (isInitialLoad) {
    return (
      <div className="flex justify-center py-16">
        <LoadingAnimation message="Loading myth…" />
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

  return (
    <div className="space-y-6">
      <div>
        <h2>{myth.name}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{myth.description}</p>
      </div>

      <CollaboratorSummary
        myth={myth}
        currentUserEmail={currentUserEmail}
        sessionUserId={sessionUserId}
        currentUserDisplayName={currentUserDisplayName}
        currentUserAvatarUrl={currentUserAvatarUrl}
        onManage={() => openManageCollaborators(myth.id)}
      />

      <VariantSelector
        variants={myth.variants}
        selectedVariantId={null}
        onSelectVariant={(variant) => navigate(`/myths/${myth.id}/variants/${variant}`)}
        onAddVariant={canEdit ? () => setShowAddVariant(true) : undefined}
        canEdit={canEdit}
      />

      <AddVariantDialog
        open={canEdit && showAddVariant}
        onOpenChange={setShowAddVariant}
        onAdd={async (name, source) => {
          await addVariant(myth.id, name, source);
        }}
      />
    </div>
  );
}
