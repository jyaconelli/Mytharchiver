import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { VariantSelector } from '../components/VariantSelector';
import { CollaboratorSummary } from '../components/CollaboratorSummary';
import { AddVariantDialog } from '../components/AddVariantDialog';
import { ContributionRequestsPanel } from '../components/ContributionRequestsPanel';
import { useArchiveLayoutContext } from './ArchiveLayout';
import { useMythsContext } from '../providers/MythArchiveProvider';
import { CollaboratorRole } from '../types/myth';
import { LoadingAnimation } from '../components/LoadingAnimation';

export function MythDetailPage() {
  const { mythId } = useParams<{ mythId: string }>();
  const navigate = useNavigate();
  const { myths, addVariant, updateContributorInstructions, loading } = useMythsContext();
  const {
    currentUserEmail,
    currentUserDisplayName,
    currentUserAvatarUrl,
    sessionUserId,
    openManageCollaborators,
  } = useArchiveLayoutContext();
  const [showAddVariant, setShowAddVariant] = useState(false);

  const isInitialLoad = loading && myths.length === 0;

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
    const collaborator = myth.collaborators.find((person) => person.email === currentUserEmail);
    return collaborator?.role ?? null;
  }, [myth, sessionUserId, currentUserEmail]);

  const canEdit = selectedMythRole === 'owner' || selectedMythRole === 'editor';
  const canManageInvites = selectedMythRole === 'owner';
  const isOwner = selectedMythRole === 'owner';

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

      {isOwner && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-100"
          data-testid="canonicalization-callout"
        >
          <div>
            <p className="font-semibold">Canonicalization Lab</p>
            <p className="text-s font-robot text-blue-900/80 dark:text-blue-200/80">
              Run category consolidation experiments and review contributor statistics.
            </p>
          </div>
          <Link
            className="border border-blue-900 bg-yellow-50 px-3 py-1.5 text-sm font-medium text-blue-900 transition hover:bg-yellow-100 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
            to={`/myths/${myth.id}/canonicalization`}
          >
            Open Lab
          </Link>
        </div>
      )}

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
        viewerEmail={currentUserEmail}
      />

      <AddVariantDialog
        open={canEdit && showAddVariant}
        onOpenChange={setShowAddVariant}
        onAdd={async (name, source) => {
          await addVariant(myth.id, name, source);
        }}
      />

      <ContributionRequestsPanel
        mythId={myth.id}
        mythName={myth.name}
        contributorInstructions={myth.contributorInstructions}
        canManage={Boolean(canManageInvites)}
        onUpdateInstructions={async (instructions) =>
          updateContributorInstructions(myth.id, instructions)
        }
      />
    </div>
  );
}
