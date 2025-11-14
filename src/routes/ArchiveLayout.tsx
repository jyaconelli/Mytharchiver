import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import { AppHeader } from '../components/AppHeader';
import { AddMythemeDialog } from '../components/AddMythemeDialog';
import { ManageMythemesDialog } from '../components/ManageMythemesDialog';
import { ManageCategoriesDialog } from '../components/ManageCategoriesDialog';
import { ManageCollaboratorsDialog } from '../components/ManageCollaboratorsDialog';
import { Button } from '../components/ui/button';
import {
  useCollaboratorActions,
  useMythArchive,
  useMythemesContext,
  useMythsContext,
} from '../providers/MythArchiveProvider';
import { getSupabaseClient } from '../lib/supabaseClient';
import { CollaboratorCategory, CollaboratorRole, Myth, MythVariant, Mytheme } from '../types/myth';
import { LoadingAnimation } from '../components/LoadingAnimation';

type ArchiveLayoutProps = {
  session: Session;
  supabaseClient: ReturnType<typeof getSupabaseClient>;
  children: ReactNode;
};

type ArchiveLayoutContextValue = {
  currentUserEmail: string;
  currentUserDisplayName: string | null;
  currentUserAvatarUrl: string | null;
  sessionUserId: string;
  openManageCollaborators: (mythId: string) => void;
};

const ArchiveLayoutContext = createContext<ArchiveLayoutContextValue | undefined>(undefined);

export function ArchiveLayout({ session, supabaseClient, children }: ArchiveLayoutProps) {
  const navigate = useNavigate();
  const supabase = supabaseClient;
  const currentUserEmail = session.user.email?.toLowerCase() ?? '';
  const sessionUserId = session.user.id;
  const userMetadata = session.user.user_metadata ?? {};
  const currentUserDisplayName =
    (userMetadata.display_name as string | undefined) ??
    (userMetadata.full_name as string | undefined) ??
    (userMetadata.name as string | undefined) ??
    null;
  const currentUserAvatarUrl =
    (userMetadata.avatar_url as string | undefined) ??
    (userMetadata.picture as string | undefined) ??
    null;

  const { dataLoading, dataError, loadArchiveData } = useMythArchive();
  const {
    myths,
    loading: mythsLoading,
    addMyth,
    addVariant,
    updateVariant,
    updateContributorInstructions,
    updateMythCategories,
    createCollaboratorCategory,
  } = useMythsContext();
  const { mythemes, addMytheme, deleteMytheme } = useMythemesContext();
  const { addCollaborator, updateCollaboratorRole, removeCollaborator } = useCollaboratorActions();

  const { mythId, variantId } = useParams<{ mythId?: string; variantId?: string }>();

  const selectedMyth: Myth | null = useMemo(
    () => myths.find((myth) => myth.id === mythId) ?? null,
    [myths, mythId],
  );

  const selectedVariant: MythVariant | null = useMemo(
    () =>
      variantId && selectedMyth
        ? (selectedMyth.variants.find((variant) => variant.id === variantId) ?? null)
        : null,
    [selectedMyth, variantId],
  );

  const selectedMythRole: CollaboratorRole | 'owner' | null = useMemo(() => {
    if (!selectedMyth) {
      return null;
    }
    if (selectedMyth.ownerId === sessionUserId) {
      return 'owner';
    }
    const collaborator = selectedMyth.collaborators.find(
      (person) => person.email === currentUserEmail,
    );
    return collaborator?.role ?? null;
  }, [selectedMyth, sessionUserId, currentUserEmail]);

  const canEditSelectedMyth = selectedMythRole === 'owner' || selectedMythRole === 'editor';

  const [showAddMytheme, setShowAddMytheme] = useState(false);
  const [showManageMythemes, setShowManageMythemes] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [manageCollaboratorsMythId, setManageCollaboratorsMythId] = useState<string | null>(null);

  const manageCollaboratorsMyth = manageCollaboratorsMythId
    ? (myths.find((myth) => myth.id === manageCollaboratorsMythId) ?? null)
    : null;

  const canManageCollaborators = Boolean(
    manageCollaboratorsMyth && manageCollaboratorsMyth.ownerId === sessionUserId,
  );

  const isInitialLoad = (dataLoading || mythsLoading) && myths.length === 0 && mythemes.length === 0;

  const handleBack = useCallback(() => {
    if (variantId && mythId) {
      navigate(`/myths/${mythId}`);
    } else if (mythId) {
      navigate('/');
    } else {
      navigate(-1);
    }
  }, [navigate, mythId, variantId]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const canGoBack = Boolean(mythId || variantId);
  const headerSubtitle = selectedVariant
    ? `${selectedMyth?.name ?? ''} / ${selectedVariant.name}`
    : selectedMyth
      ? selectedMyth.name
      : 'Structural Taxonomy System';

  const layoutContextValue = useMemo<ArchiveLayoutContextValue>(
    () => ({
      currentUserEmail,
      currentUserDisplayName,
      currentUserAvatarUrl,
      sessionUserId,
      openManageCollaborators: (mythToManage) => setManageCollaboratorsMythId(mythToManage),
    }),
    [
      currentUserEmail,
      currentUserDisplayName,
      currentUserAvatarUrl,
      sessionUserId,
    ],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader
        canGoBack={canGoBack}
        onBack={handleBack}
        title="Myth Archive"
        subtitle={headerSubtitle}
        currentUserEmail={currentUserEmail}
        userDisplayName={currentUserDisplayName}
        userAvatarUrl={currentUserAvatarUrl}
        onOpenManageCategories={() => {
          if (canEditSelectedMyth && selectedMyth) {
            setShowManageCategories(true);
          }
        }}
        onOpenManageMythemes={() => setShowManageMythemes(true)}
        onSignOut={handleSignOut}
        canManageCategories={Boolean(selectedMyth && canEditSelectedMyth)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dataError ? (
          <div className="max-w-xl mx-auto">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/40">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
                Unable to load archive data
              </h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-200">{dataError}</p>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={loadArchiveData}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {dataLoading && !isInitialLoad && (
              <LoadingAnimation
                message="Syncing with Supabase…"
                size={48}
                className="mb-6 flex-row items-center text-left"
              />
            )}
            <ArchiveLayoutContext.Provider value={layoutContextValue}>
              {children}
            </ArchiveLayoutContext.Provider>
          </>
        )}
      </main>

      <AddMythemeDialog open={showAddMytheme} onOpenChange={setShowAddMytheme} onAdd={addMytheme} />
      <ManageMythemesDialog
        open={showManageMythemes}
        onOpenChange={setShowManageMythemes}
        mythemes={mythemes}
        onDelete={deleteMytheme}
        onAdd={() => {
          setShowManageMythemes(false);
          setShowAddMytheme(true);
        }}
      />
      {selectedMyth && (
        <ManageCategoriesDialog
          open={showManageCategories && canEditSelectedMyth}
          onOpenChange={(open) => {
            if (!open) {
              setShowManageCategories(false);
            } else if (canEditSelectedMyth) {
              setShowManageCategories(true);
            }
          }}
          categories={selectedMyth.categories}
          onUpdateCategories={(updated) => updateMythCategories(selectedMyth.id, updated)}
        />
      )}
      <ManageCollaboratorsDialog
        open={Boolean(manageCollaboratorsMyth)}
        onOpenChange={(open) => {
          if (!open) {
            setManageCollaboratorsMythId(null);
          }
        }}
        myth={manageCollaboratorsMyth}
        canManage={canManageCollaborators}
        currentUserEmail={currentUserEmail}
        onAddCollaborator={addCollaborator}
        onUpdateCollaboratorRole={updateCollaboratorRole}
        onRemoveCollaborator={removeCollaborator}
      />
    </div>
  );
}

export function useArchiveLayoutContext() {
  const value = useContext(ArchiveLayoutContext);
  if (!value) {
    throw new Error('useArchiveLayoutContext must be used within ArchiveLayout');
  }
  return value;
}
