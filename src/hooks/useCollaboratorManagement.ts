import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';
import { CollaboratorRole, Myth, MythCollaborator } from '../types/myth';

type CollaboratorRow = {
  id: string;
  myth_id: string;
  email: string | null;
  role: CollaboratorRole;
};

type UseCollaboratorManagementOptions = {
  session: Session | null;
  myths: Myth[];
  setMyths: Dispatch<SetStateAction<Myth[]>>;
};

export function useCollaboratorManagement({
  session,
  myths,
  setMyths,
}: UseCollaboratorManagementOptions) {
  const supabase = getSupabaseClient();

  const addCollaborator = useCallback(
    async (mythId: string, email: string, role: CollaboratorRole) => {
      if (!session) {
        throw new Error('You must be signed in to manage collaborators.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Email is required.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Myth not found.');
      }

      if (myth.collaborators.some((collaborator) => collaborator.email === normalizedEmail)) {
        throw new Error('This collaborator has already been added.');
      }

      const { data, error } = await supabase
        .from('myth_collaborators')
        .insert({
          myth_id: mythId,
          email: normalizedEmail,
          role,
        })
        .select('id, myth_id, email, role')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const collaboratorRow = data as CollaboratorRow;
      const profile = await supabase
        .from('profiles')
        .select('email, display_name, avatar_url')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile.error && profile.error.code !== 'PGRST116') {
        throw new Error(profile.error.message);
      }

      const collaborator: MythCollaborator = {
        id: collaboratorRow.id,
        mythId: collaboratorRow.myth_id,
        email: (collaboratorRow.email ?? '').toLowerCase(),
        role: collaboratorRow.role,
        displayName: profile.data?.display_name ?? null,
        avatarUrl: profile.data?.avatar_url ?? null,
      };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === mythId ? { ...m, collaborators: [...m.collaborators, collaborator] } : m,
        ),
      );
    },
    [session, myths, supabase, setMyths],
  );

  const updateCollaboratorRole = useCallback(
    async (collaboratorId: string, role: CollaboratorRole) => {
      const { data, error } = await supabase
        .from('myth_collaborators')
        .update({ role })
        .eq('id', collaboratorId)
        .select('id, myth_id, email, role')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const updatedRow = data as CollaboratorRow;

      setMyths((prev) =>
        prev.map((m) =>
          m.id === updatedRow.myth_id
            ? {
                ...m,
                collaborators: m.collaborators.map((collaborator) =>
                  collaborator.id === collaboratorId
                    ? { ...collaborator, role: updatedRow.role }
                    : collaborator,
                ),
              }
            : m,
        ),
      );
    },
    [supabase, setMyths],
  );

  const removeCollaborator = useCallback(
    async (collaboratorId: string) => {
      const { data, error } = await supabase
        .from('myth_collaborators')
        .delete()
        .eq('id', collaboratorId)
        .select('myth_id, id')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const removedRow = data as { myth_id: string };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === removedRow.myth_id
            ? { ...m, collaborators: m.collaborators.filter((c) => c.id !== collaboratorId) }
            : m,
        ),
      );
    },
    [supabase, setMyths],
  );

  return {
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
  };
}
