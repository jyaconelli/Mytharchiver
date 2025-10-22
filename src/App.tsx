import { useCallback, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { supabase } from './lib/supabaseClient';
import { CollaboratorRole, Myth, MythVariant } from './types/myth';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useMythArchive } from './hooks/useMythArchive';
import { MythList } from './components/MythList';
import { VariantSelector } from './components/VariantSelector';
import { VariantView } from './components/VariantView';
import { AddMythDialog } from './components/AddMythDialog';
import { AddVariantDialog } from './components/AddVariantDialog';
import { AddMythemeDialog } from './components/AddMythemeDialog';
import { ManageCategoriesDialog } from './components/ManageCategoriesDialog';
import { ManageMythemesDialog } from './components/ManageMythemesDialog';
import { ManageCollaboratorsDialog } from './components/ManageCollaboratorsDialog';
import { AuthGate } from './components/AuthGate';
import { AppHeader } from './components/AppHeader';
import { CollaboratorSummary } from './components/CollaboratorSummary';
import { Button } from './components/ui/button';

export default function App() {
  const { session, authLoading } = useSupabaseAuth();
  const currentUserEmail = session?.user.email?.toLowerCase() ?? '';
  const sessionUserId = session?.user.id ?? '';

  const {
    myths,
    mythemes,
    categories,
    dataLoading,
    dataError,
    loadArchiveData,
    addMyth,
    addVariant,
    updateVariant,
    addMytheme,
    deleteMytheme,
    updateCategories,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
  } = useMythArchive(session, currentUserEmail);

  const [selectedMythId, setSelectedMythId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [showAddMyth, setShowAddMyth] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddMytheme, setShowAddMytheme] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageMythemes, setShowManageMythemes] = useState(false);
  const [manageCollaboratorsMythId, setManageCollaboratorsMythId] = useState<string | null>(null);

  const selectedMyth: Myth | null = useMemo(
    () => myths.find((myth) => myth.id === selectedMythId) ?? null,
    [myths, selectedMythId],
  );

  const selectedVariant: MythVariant | null = useMemo(
    () => selectedMyth?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedMyth, selectedVariantId],
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

  const handleBack = useCallback(() => {
    if (selectedVariantId) {
      setSelectedVariantId(null);
    } else if (selectedMythId) {
      setSelectedMythId(null);
    }
  }, [selectedMythId, selectedVariantId]);

  const handleSelectMyth = useCallback((mythId: string) => {
    setSelectedMythId(mythId);
    setSelectedVariantId(null);
  }, []);

  const handleAddMyth = useCallback(
    async (name: string, description: string) => {
      await addMyth(name, description);
    },
    [addMyth],
  );

  const handleAddVariant = useCallback(
    async (name: string, source: string) => {
      if (!selectedMythId) {
        throw new Error('Select a myth before adding a variant.');
      }
      await addVariant(selectedMythId, name, source);
    },
    [addVariant, selectedMythId],
  );

  const handleUpdateVariant = useCallback(
    async (updatedVariant: MythVariant) => {
      if (!selectedMythId) {
        throw new Error('Select a myth before updating variants.');
      }
      await updateVariant(selectedMythId, updatedVariant);
    },
    [selectedMythId, updateVariant],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-gray-600 dark:text-gray-400">Checking your session…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  const canGoBack = Boolean(selectedMythId || selectedVariantId);
  const headerSubtitle = selectedVariant
    ? `${selectedMyth?.name ?? ''} / ${selectedVariant.name}`
    : selectedMyth
      ? selectedMyth.name
      : 'Structural Taxonomy System';

  const manageCollaboratorsMyth = manageCollaboratorsMythId
    ? (myths.find((myth) => myth.id === manageCollaboratorsMythId) ?? null)
    : null;
  const canManageCollaborators = Boolean(
    manageCollaboratorsMyth && manageCollaboratorsMyth.ownerId === sessionUserId,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader
        canGoBack={canGoBack}
        onBack={handleBack}
        title="Myth Archive"
        subtitle={headerSubtitle}
        currentUserEmail={currentUserEmail}
        userDisplayName={session.user.user_metadata?.full_name}
        onOpenManageCategories={() => setShowManageCategories(true)}
        onOpenManageMythemes={() => setShowManageMythemes(true)}
        onSignOut={handleSignOut}
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
            {dataLoading && (
              <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing with Supabase…
              </div>
            )}

            {selectedMyth && (
              <CollaboratorSummary
                myth={selectedMyth}
                currentUserEmail={currentUserEmail}
                sessionUserId={sessionUserId}
                onManage={() => setManageCollaboratorsMythId(selectedMyth.id)}
              />
            )}

            {!selectedMythId && (
              <div className="space-y-6">
                <div>
                  <h2>Myth Folders</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Each myth contains multiple variants with categorized plot points
                  </p>
                </div>
                <MythList
                  myths={myths}
                  selectedMythId={selectedMythId}
                  onSelectMyth={handleSelectMyth}
                  onAddMyth={() => setShowAddMyth(true)}
                />
              </div>
            )}

            {selectedMythId && !selectedVariantId && selectedMyth && (
              <div className="space-y-6">
                <div>
                  <h2>{selectedMyth.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {selectedMyth.description}
                  </p>
                </div>
                <VariantSelector
                  variants={selectedMyth.variants}
                  selectedVariantId={selectedVariantId}
                  onSelectVariant={setSelectedVariantId}
                  onAddVariant={canEditSelectedMyth ? () => setShowAddVariant(true) : undefined}
                  canEdit={canEditSelectedMyth}
                />
              </div>
            )}

            {selectedVariantId && selectedVariant && (
              <VariantView
                variant={selectedVariant}
                mythemes={mythemes}
                categories={categories}
                onUpdateVariant={handleUpdateVariant}
                canEdit={canEditSelectedMyth}
              />
            )}
          </>
        )}
      </main>

      <AddMythDialog open={showAddMyth} onOpenChange={setShowAddMyth} onAdd={handleAddMyth} />
      <AddVariantDialog
        open={canEditSelectedMyth && showAddVariant}
        onOpenChange={setShowAddVariant}
        onAdd={handleAddVariant}
      />
      <AddMythemeDialog open={showAddMytheme} onOpenChange={setShowAddMytheme} onAdd={addMytheme} />
      <ManageCategoriesDialog
        open={showManageCategories}
        onOpenChange={setShowManageCategories}
        categories={categories}
        onUpdateCategories={updateCategories}
      />
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
