import { createContext, useContext, useMemo, type Context, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { useMythData } from '../hooks/useMythData';
import { useMythemeData } from '../hooks/useMythemeData';
import { useCollaboratorManagement } from '../hooks/useCollaboratorManagement';
import { CollaboratorCategory, CollaboratorRole, Myth, MythVariant, Mytheme } from '../types/myth';

export type MythDataContextValue = {
  myths: Myth[];
  loading: boolean;
  error: string | null;
  loadMyths: () => Promise<void>;
  addMyth: (name: string, description: string, contributorInstructions?: string) => Promise<void>;
  addVariant: (mythId: string, name: string, source: string) => Promise<void>;
  updateVariant: (mythId: string, variant: MythVariant) => Promise<void>;
  updateContributorInstructions: (mythId: string, instructions: string) => Promise<void>;
  updateMythCategories: (mythId: string, updatedCategories: string[]) => Promise<void>;
  createCollaboratorCategory: (mythId: string, name: string) => Promise<CollaboratorCategory>;
};

export type MythemeDataContextValue = {
  mythemes: Mytheme[];
  loading: boolean;
  error: string | null;
  loadMythemes: () => Promise<void>;
  addMytheme: (name: string, type: 'character' | 'event' | 'place' | 'object') => Promise<void>;
  deleteMytheme: (id: string) => Promise<void>;
};

export type CollaboratorActionsContextValue = {
  addCollaborator: (mythId: string, email: string, role: CollaboratorRole) => Promise<void>;
  updateCollaboratorRole: (collaboratorId: string, role: CollaboratorRole) => Promise<void>;
  removeCollaborator: (collaboratorId: string) => Promise<void>;
};

export type MythArchiveContextValue = MythDataContextValue &
  MythemeDataContextValue &
  CollaboratorActionsContextValue & {
    dataLoading: boolean;
    dataError: string | null;
    loadArchiveData: () => Promise<void>;
  };

const MythArchiveContext = createContext<MythArchiveContextValue | undefined>(undefined);
const MythsContext = createContext<MythDataContextValue | undefined>(undefined);
const MythemesContext = createContext<MythemeDataContextValue | undefined>(undefined);
const CollaboratorContext = createContext<CollaboratorActionsContextValue | undefined>(undefined);

type MythArchiveProviderProps = {
  session: Session;
  children: ReactNode;
};

export function MythArchiveProvider({ session, children }: MythArchiveProviderProps) {
  const currentUserEmail = session.user.email?.toLowerCase() ?? '';
  const mythData = useMythData(session, currentUserEmail);
  const mythemeData = useMythemeData(session);
  const collaboratorActions = useCollaboratorManagement({
    session,
    myths: mythData.myths,
    setMyths: mythData.setMyths,
  });

  const mythDataValue = useMemo<MythDataContextValue>(
    () => ({
      myths: mythData.myths,
      loading: mythData.loading,
      error: mythData.error,
      loadMyths: mythData.loadMyths,
      addMyth: mythData.addMyth,
      addVariant: mythData.addVariant,
      updateVariant: mythData.updateVariant,
      updateContributorInstructions: mythData.updateContributorInstructions,
      updateMythCategories: mythData.updateMythCategories,
      createCollaboratorCategory: mythData.createCollaboratorCategory,
    }),
    [
      mythData.myths,
      mythData.loading,
      mythData.error,
      mythData.loadMyths,
      mythData.addMyth,
      mythData.addVariant,
      mythData.updateVariant,
      mythData.updateContributorInstructions,
      mythData.updateMythCategories,
      mythData.createCollaboratorCategory,
    ],
  );

  const mythemeDataValue = useMemo<MythemeDataContextValue>(
    () => ({
      mythemes: mythemeData.mythemes,
      loading: mythemeData.loading,
      error: mythemeData.error,
      loadMythemes: mythemeData.loadMythemes,
      addMytheme: mythemeData.addMytheme,
      deleteMytheme: mythemeData.deleteMytheme,
    }),
    [
      mythemeData.mythemes,
      mythemeData.loading,
      mythemeData.error,
      mythemeData.loadMythemes,
      mythemeData.addMytheme,
      mythemeData.deleteMytheme,
    ],
  );

  const collaboratorValue = useMemo<CollaboratorActionsContextValue>(
    () => ({
      addCollaborator: collaboratorActions.addCollaborator,
      updateCollaboratorRole: collaboratorActions.updateCollaboratorRole,
      removeCollaborator: collaboratorActions.removeCollaborator,
    }),
    [
      collaboratorActions.addCollaborator,
      collaboratorActions.updateCollaboratorRole,
      collaboratorActions.removeCollaborator,
    ],
  );

  const archiveValue = useMemo<MythArchiveContextValue>(
    () => ({
      ...mythDataValue,
      ...mythemeDataValue,
      ...collaboratorValue,
      dataLoading: mythData.loading || mythemeData.loading,
      dataError: mythData.error ?? mythemeData.error ?? null,
      loadArchiveData: async () => {
        await Promise.all([mythData.loadMyths(), mythemeData.loadMythemes()]);
      },
    }),
    [
      mythDataValue,
      mythemeDataValue,
      collaboratorValue,
      mythData.loading,
      mythemeData.loading,
      mythData.error,
      mythemeData.error,
      mythData.loadMyths,
      mythemeData.loadMythemes,
    ],
  );

  return (
    <MythsContext.Provider value={mythDataValue}>
      <MythemesContext.Provider value={mythemeDataValue}>
        <CollaboratorContext.Provider value={collaboratorValue}>
          <MythArchiveContext.Provider value={archiveValue}>{children}</MythArchiveContext.Provider>
        </CollaboratorContext.Provider>
      </MythemesContext.Provider>
    </MythsContext.Provider>
  );
}

function useRequiredContext<T>(context: Context<T | undefined>, hookName: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${hookName} must be used within a MythArchiveProvider`);
  }
  return value;
}

export function useMythArchive() {
  return useRequiredContext(MythArchiveContext, 'useMythArchive');
}

export function useMythsContext() {
  return useRequiredContext(MythsContext, 'useMythsContext');
}

export function useMythemesContext() {
  return useRequiredContext(MythemesContext, 'useMythemesContext');
}

export function useCollaboratorActions() {
  return useRequiredContext(CollaboratorContext, 'useCollaboratorActions');
}
