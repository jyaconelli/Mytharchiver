import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';
import {
  CollaboratorRole,
  DEFAULT_CATEGORIES,
  Myth,
  MythCollaborator,
  MythVariant,
  Mytheme,
} from '../types/myth';

type MythRow = {
  id: string;
  name: string | null;
  description: string | null;
  variants: MythVariant[] | null;
  user_id: string;
  categories: string[] | null;
};

type CollaboratorRow = {
  id: string;
  myth_id: string;
  email: string | null;
  role: CollaboratorRole;
};

type MythemeRow = {
  id: string;
  name: string;
  type: 'character' | 'event' | 'place' | 'object';
};

type ProfileSettingsRow = {
  categories: string[] | null;
};

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseMythRow = (row: MythRow): Myth => ({
  id: row.id,
  name: row.name ?? '',
  description: row.description ?? '',
  variants: Array.isArray(row.variants) ? row.variants : [],
  categories:
    Array.isArray(row.categories) && row.categories.length > 0
      ? row.categories
      : [...DEFAULT_CATEGORIES],
  ownerId: row.user_id,
  collaborators: [],
});

export function useMythArchive(session: Session | null, currentUserEmail: string) {
  const supabase = getSupabaseClient();
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [myths, setMyths] = useState<Myth[]>([]);
  const [mythemes, setMythemes] = useState<Mytheme[]>([]);

  const loadArchiveData = useCallback(async () => {
    if (!session) {
      return;
    }

    setDataLoading(true);
    setDataError(null);

    try {
      const normalizedEmail = session.user.email?.toLowerCase() ?? null;

      const ownedMythsQuery = supabase
        .from('myth_folders')
        .select('id, name, description, variants, user_id, categories')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      const collaboratorLinksQuery = normalizedEmail
        ? supabase.from('myth_collaborators').select('myth_id').eq('email', normalizedEmail)
        : Promise.resolve({ data: [], error: null } as {
            data: { myth_id: string }[];
            error: null;
          });

      const mythemesQuery = supabase
        .from('mythemes')
        .select('id, name, type')
        .eq('user_id', session.user.id)
        .order('name');

      const settingsQuery = supabase
        .from('profile_settings')
        .select('categories')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const [ownedMythsResult, collaboratorLinksResult, mythemesResult, settingsResult] =
        await Promise.all([ownedMythsQuery, collaboratorLinksQuery, mythemesQuery, settingsQuery]);

      if (ownedMythsResult.error) throw ownedMythsResult.error;
      const collaboratorLinksData = collaboratorLinksResult as {
        data: { myth_id: string }[] | null;
        error: { message: string; code: string } | null;
      };
      if (collaboratorLinksData.error) {
        throw collaboratorLinksData.error;
      }
      if (mythemesResult.error) throw mythemesResult.error;
      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }

      const ownedMythRows = (ownedMythsResult.data as MythRow[] | null) ?? [];
      const collaboratorMythIds = collaboratorLinksData.data?.map((link) => link.myth_id) ?? [];

      let collaboratorMythRows: MythRow[] = [];
      if (collaboratorMythIds.length > 0) {
        const collaboratorMythsResult = await supabase
          .from('myth_folders')
          .select('id, name, description, variants, user_id, categories')
          .in('id', collaboratorMythIds)
          .order('created_at', { ascending: true });

        if (collaboratorMythsResult.error && collaboratorMythsResult.error.code !== 'PGRST116') {
          throw collaboratorMythsResult.error;
        }
        collaboratorMythRows = (collaboratorMythsResult.data as MythRow[] | null) ?? [];
      }

      const allMythRowsMap = new Map<string, MythRow>();
      ownedMythRows.forEach((row) => {
        allMythRowsMap.set(row.id, row);
      });
      collaboratorMythRows.forEach((row) => {
        if (!allMythRowsMap.has(row.id)) {
          allMythRowsMap.set(row.id, row);
        }
      });

      const mythIds = Array.from(allMythRowsMap.keys());

      let collaboratorRows: CollaboratorRow[] = [];
      if (mythIds.length > 0) {
        const collaboratorListResult = await supabase
          .from('myth_collaborators')
          .select('id, myth_id, email, role')
          .in('myth_id', mythIds)
          .order('created_at', { ascending: true });

        if (collaboratorListResult.error && collaboratorListResult.error.code !== 'PGRST116') {
          throw collaboratorListResult.error;
        }

        collaboratorRows = (collaboratorListResult.data as CollaboratorRow[] | null) ?? [];
      }

      const collaboratorsByMyth = new Map<string, MythCollaborator[]>();
      collaboratorRows.forEach((row) => {
        const collaborator: MythCollaborator = {
          id: row.id,
          mythId: row.myth_id,
          email: (row.email ?? '').toLowerCase(),
          role: row.role,
        };
        const existing = collaboratorsByMyth.get(row.myth_id) ?? [];
        existing.push(collaborator);
        collaboratorsByMyth.set(row.myth_id, existing);
      });

      const mythemeRows = (mythemesResult.data as MythemeRow[] | null) ?? [];
      const categoriesValue =
        (settingsResult.data as ProfileSettingsRow | null)?.categories ?? null;

      const finalMyths = Array.from(allMythRowsMap.values()).map((row) => {
        const myth = parseMythRow(row);
        myth.collaborators = collaboratorsByMyth.get(row.id) ?? [];
        if (
          myth.categories.length === 0 &&
          Array.isArray(categoriesValue) &&
          categoriesValue.length > 0
        ) {
          myth.categories = [...categoriesValue];
        }
        return myth;
      });

      setMyths(finalMyths);
      setMythemes(mythemeRows);
    } catch (error) {
      console.error(error);
      setDataError(error instanceof Error ? error.message : 'Unable to load your myth archive.');
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setMyths([]);
      setMythemes([]);
      setDataLoading(false);
      setDataError(null);
      return;
    }

    loadArchiveData();
  }, [session, loadArchiveData]);

  const addMyth = useCallback(
    async (name: string, description: string) => {
      if (!session) {
        throw new Error('You must be signed in to add myths.');
      }

      const { data, error } = await supabase
        .from('myth_folders')
        .insert({
          name,
          description,
          variants: [],
          categories: DEFAULT_CATEGORIES,
          user_id: session.user.id,
        })
        .select('id, name, description, variants, user_id')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const mythRow = data as MythRow;
      const myth = parseMythRow(mythRow);

      let collaborators: MythCollaborator[] = myth.collaborators;

      if (currentUserEmail) {
        const { data: ownerCollaboratorData, error: ownerCollaboratorError } = await supabase
          .from('myth_collaborators')
          .insert({
            myth_id: myth.id,
            email: currentUserEmail,
            role: 'owner',
          })
          .select('id, myth_id, email, role')
          .single();

        if (!ownerCollaboratorError && ownerCollaboratorData) {
          const ownerRow = ownerCollaboratorData as CollaboratorRow;
          collaborators = [
            {
              id: ownerRow.id,
              mythId: ownerRow.myth_id,
              email: (ownerRow.email ?? '').toLowerCase(),
              role: ownerRow.role,
            },
          ];
        }
      }

      myth.collaborators = collaborators;

      setMyths((prev) => [...prev, myth]);
    },
    [session, currentUserEmail],
  );

  const addVariant = useCallback(
    async (mythId: string, name: string, source: string) => {
      if (!session) {
        throw new Error('Select a myth before adding variants.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Selected myth could not be found.');
      }

      const newVariant: MythVariant = {
        id: createLocalId(),
        name,
        source,
        plotPoints: [],
      };

      const updatedVariants = [...myth.variants, newVariant];

      const { error } = await supabase
        .from('myth_folders')
        .update({ variants: updatedVariants })
        .eq('id', mythId);

      if (error) {
        throw new Error(error.message);
      }

      setMyths((prev) =>
        prev.map((m) => (m.id === mythId ? { ...m, variants: updatedVariants } : m)),
      );
    },
    [session, myths],
  );

  const updateVariant = useCallback(
    async (mythId: string, updatedVariant: MythVariant) => {
      if (!session) {
        throw new Error('Select a myth before updating variants.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Selected myth could not be found.');
      }

      const updatedVariants = myth.variants.map((variant) =>
        variant.id === updatedVariant.id ? updatedVariant : variant,
      );

      const { error } = await supabase
        .from('myth_folders')
        .update({ variants: updatedVariants })
        .eq('id', mythId);

      if (error) {
        throw new Error(error.message);
      }

      setMyths((prev) =>
        prev.map((m) => (m.id === mythId ? { ...m, variants: updatedVariants } : m)),
      );
    },
    [session, myths],
  );

  const addMytheme = useCallback(
    async (name: string, type: 'character' | 'event' | 'place' | 'object') => {
      if (!session) {
        throw new Error('You must be signed in to add mythemes.');
      }

      const { data, error } = await supabase
        .from('mythemes')
        .insert({
          name,
          type,
          user_id: session.user.id,
        })
        .select('id, name, type')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setMythemes((prev) => [...prev, data as MythemeRow]);
    },
    [session],
  );

  const deleteMytheme = useCallback(async (id: string) => {
    const { error } = await supabase.from('mythemes').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    setMythemes((prev) => prev.filter((mytheme) => mytheme.id !== id));
  }, []);

  const updateMythCategories = useCallback(
    async (mythId: string, updatedCategories: string[]) => {
      if (!session) {
        throw new Error('You must be signed in to update categories.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Myth not found.');
      }

      const { error } = await supabase
        .from('myth_folders')
        .update({ categories: updatedCategories })
        .eq('id', mythId);

      if (error) {
        throw new Error(error.message);
      }

      setMyths((prev) =>
        prev.map((m) => (m.id === mythId ? { ...m, categories: [...updatedCategories] } : m)),
      );
    },
    [session, myths],
  );

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
      const collaborator: MythCollaborator = {
        id: collaboratorRow.id,
        mythId: collaboratorRow.myth_id,
        email: (collaboratorRow.email ?? '').toLowerCase(),
        role: collaboratorRow.role,
      };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === mythId ? { ...m, collaborators: [...m.collaborators, collaborator] } : m,
        ),
      );
    },
    [session, myths],
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
    [],
  );

  const removeCollaborator = useCallback(async (collaboratorId: string) => {
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
  }, []);

  return {
    dataLoading,
    dataError,
    myths,
    mythemes,
    loadArchiveData,
    addMyth,
    addVariant,
    updateVariant,
    addMytheme,
    deleteMytheme,
    updateMythCategories,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
  };
}
