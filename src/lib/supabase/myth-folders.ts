import { getSupabaseClient } from '../supabaseClient';
import { CollaboratorRole, VariantContributorType } from '../../types/myth';
import {
  CollaboratorCategoryRow,
  CollaboratorPlotPointCategoryRow,
  CollaboratorRow,
  MythCategoryRow,
  MythRow,
  MythVariantRow,
  PlotPointCategoryRow,
  PlotPointRow,
  PlotPointUpsertRow,
  PostgrestErrorLike,
  UserProfileRow,
} from './types';
import { guardSupabaseError } from './error';

const supabase = getSupabaseClient();

export const updateContributorInstructions = async (mythId: string, instructions: string) => {
  const { error } = await supabase
    .from('myth_folders')
    .update({ contributor_instructions: instructions })
    .eq('id', mythId);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
};

export const fetchOwnedMyths = async (userId: string): Promise<MythRow[]> => {
  const result = await supabase
    .from('myth_folders')
    .select('id, name, description, contributor_instructions, variants, user_id, categories')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  guardSupabaseError('myth_folders (owned myths)', result.error);
  return (result.data as MythRow[] | null) ?? [];
};

export const fetchMythsByIds = async (mythIds: string[]): Promise<MythRow[]> => {
  if (mythIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_folders')
    .select('id, name, description, contributor_instructions, variants, user_id, categories')
    .in('id', mythIds)
    .order('created_at', { ascending: true });

  guardSupabaseError('myth_folders (collaborator myths)', result.error, ['PGRST116']);
  return (result.data as MythRow[] | null) ?? [];
};

export const fetchPlotPointsByVariantIds = async (
  variantIds: string[],
): Promise<PlotPointRow[]> => {
  if (variantIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_plot_points')
    .select('id, variant_id, position, text, category, canonical_category_id, mytheme_refs')
    .in('variant_id', variantIds)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  guardSupabaseError('myth_plot_points', result.error, ['PGRST116']);
  return (result.data as PlotPointRow[] | null) ?? [];
};

export const fetchProfilesByEmails = async (emails: string[]): Promise<UserProfileRow[]> => {
  if (emails.length === 0) {
    return [];
  }

  const result = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url')
    .in('email', emails);

  guardSupabaseError('profiles', result.error, ['PGRST116']);
  return (result.data as UserProfileRow[] | null) ?? [];
};

export const fetchPlotPointCategoryAssignmentsByPlotPointIds = async (
  plotPointIds: string[],
): Promise<PlotPointCategoryRow[]> => {
  if (plotPointIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_plot_point_categories')
    .select('plot_point_id, category_id')
    .in('plot_point_id', plotPointIds);

  guardSupabaseError('myth_plot_point_categories', result.error, ['PGRST116']);
  return (result.data as PlotPointCategoryRow[] | null) ?? [];
};

export const fetchCollaboratorCategoriesByMythIds = async (
  mythIds: string[],
): Promise<CollaboratorCategoryRow[]> => {
  if (mythIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_collaborator_categories')
    .select('id, myth_id, collaborator_email, name')
    .in('myth_id', mythIds);

  guardSupabaseError('myth_collaborator_categories', result.error, ['PGRST116']);
  return (result.data as CollaboratorCategoryRow[] | null) ?? [];
};

export const fetchCollaboratorPlotPointCategoryAssignmentsByCategoryIds = async (
  collaboratorCategoryIds: string[],
): Promise<CollaboratorPlotPointCategoryRow[]> => {
  if (collaboratorCategoryIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_collaborator_plot_point_categories')
    .select('plot_point_id, collaborator_category_id')
    .in('collaborator_category_id', collaboratorCategoryIds);

  guardSupabaseError('myth_collaborator_plot_point_categories', result.error, ['PGRST116']);
  return (result.data as CollaboratorPlotPointCategoryRow[] | null) ?? [];
};

export const createMythFolder = async (payload: {
  name: string;
  description: string;
  contributorInstructions: string;
  categories: string[];
  userId: string;
}): Promise<MythRow> => {
  const { name, description, contributorInstructions, categories, userId } = payload;

  const result = await supabase
    .from('myth_folders')
    .insert({
      name,
      description,
      contributor_instructions: contributorInstructions,
      variants: [],
      categories,
      user_id: userId,
    })
    .select('id, name, description, contributor_instructions, variants, user_id, categories')
    .single();

  guardSupabaseError('myth_folders (create)', result.error);
  return result.data as MythRow;
};

export const insertVariant = async (payload: {
  id: string;
  mythId: string;
  name: string;
  source: string;
  sortOrder: number;
  createdByUserId: string;
  contributorEmail: string | null;
  contributorName: string | null;
  contributorType: VariantContributorType;
}): Promise<MythVariantRow> => {
  const {
    id,
    mythId,
    name,
    source,
    sortOrder,
    createdByUserId,
    contributorEmail,
    contributorName,
    contributorType,
  } = payload;

  const result = await supabase
    .from('myth_variants')
    .insert({
      id,
      myth_id: mythId,
      name,
      source,
      sort_order: sortOrder,
      created_by_user_id: createdByUserId,
      contributor_email: contributorEmail,
      contributor_name: contributorName,
      contributor_type: contributorType,
    })
    .select(
      'id, name, source, sort_order, created_by_user_id, contributor_email, contributor_name, contributor_type, contribution_request_id',
    )
    .single();

  guardSupabaseError('myth_variants (insert)', result.error);
  return result.data as MythVariantRow;
};

const insertCollaboratorCategory = async (payload: {
  mythId: string;
  collaboratorEmail: string;
  name: string;
}): Promise<CollaboratorCategoryRow> => {
  const { mythId, collaboratorEmail, name } = payload;

  const result = await supabase
    .from('myth_collaborator_categories')
    .insert({ myth_id: mythId, collaborator_email: collaboratorEmail, name })
    .select('id, myth_id, collaborator_email, name')
    .single();

  guardSupabaseError('myth_collaborator_categories (insert)', result.error);
  return result.data as CollaboratorCategoryRow;
};

const fetchCollaboratorCategoryByUnique = async (
  mythId: string,
  collaboratorEmail: string,
  name: string,
): Promise<CollaboratorCategoryRow | null> => {
  const result = await supabase
    .from('myth_collaborator_categories')
    .select('id, myth_id, collaborator_email, name')
    .eq('myth_id', mythId)
    .eq('collaborator_email', collaboratorEmail)
    .eq('name', name)
    .maybeSingle();

  guardSupabaseError('myth_collaborator_categories (lookup)', result.error, ['PGRST116']);
  return result.data as CollaboratorCategoryRow | null;
};

export const ensureCollaboratorCategory = async (
  mythId: string,
  collaboratorEmail: string,
  name: string,
): Promise<CollaboratorCategoryRow> => {
  try {
    return await insertCollaboratorCategory({ mythId, collaboratorEmail, name });
  } catch (error) {
    const cause = (error as Error & { cause?: PostgrestErrorLike }).cause;
    if (cause?.code === '23505') {
      const existing = await fetchCollaboratorCategoryByUnique(mythId, collaboratorEmail, name);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
};

export const updateVariantMetadata = async (
  variantId: string,
  updates: { name: string; source: string },
) => {
  const { name, source } = updates;
  const result = await supabase.from('myth_variants').update({ name, source }).eq('id', variantId);
  guardSupabaseError('myth_variants (update)', result.error);
  return { success: true };
};

export const fetchPlotPointIdsByVariantId = async (variantId: string): Promise<string[]> => {
  const result = await supabase.from('myth_plot_points').select('id').eq('variant_id', variantId);

  guardSupabaseError('myth_plot_points (ids)', result.error, ['PGRST116']);
  return ((result.data as { id: string }[] | null) ?? []).map((row) => row.id);
};

export const deletePlotPointsByIds = async (ids: string[]) => {
  if (ids.length === 0) {
    return { success: true };
  }

  const result = await supabase.from('myth_plot_points').delete().in('id', ids);
  guardSupabaseError('myth_plot_points (delete)', result.error);
  return { success: true };
};

export const upsertPlotPoints = async (records: PlotPointUpsertRow[]) => {
  if (records.length === 0) {
    return { success: true };
  }

  const result = await supabase.from('myth_plot_points').upsert(records, { onConflict: 'id' });

  guardSupabaseError('myth_plot_points (upsert)', result.error);
  return { success: true };
};

export const deletePlotPointCategoryAssignmentsByPlotPointIds = async (plotPointIds: string[]) => {
  if (plotPointIds.length === 0) {
    return { success: true };
  }

  const result = await supabase
    .from('myth_plot_point_categories')
    .delete()
    .in('plot_point_id', plotPointIds);

  guardSupabaseError('myth_plot_point_categories (delete)', result.error);
  return { success: true };
};

export const deleteCollaboratorPlotPointCategoryAssignmentsByPlotPointIds = async (
  plotPointIds: string[],
) => {
  if (plotPointIds.length === 0) {
    return { success: true };
  }

  const result = await supabase
    .from('myth_collaborator_plot_point_categories')
    .delete()
    .in('plot_point_id', plotPointIds);

  guardSupabaseError('myth_collaborator_plot_point_categories (delete)', result.error);
  return { success: true };
};

export const insertPlotPointCategoryAssignments = async (
  records: PlotPointCategoryRow[],
): Promise<PlotPointCategoryRow[]> => {
  if (records.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_plot_point_categories')
    .insert(records)
    .select('plot_point_id, category_id');

  guardSupabaseError('myth_plot_point_categories (insert)', result.error);
  return (result.data as PlotPointCategoryRow[] | null) ?? [];
};

export const insertCollaboratorPlotPointCategoryAssignments = async (
  records: CollaboratorPlotPointCategoryRow[],
): Promise<CollaboratorPlotPointCategoryRow[]> => {
  if (records.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_collaborator_plot_point_categories')
    .insert(records)
    .select('plot_point_id, collaborator_category_id');

  guardSupabaseError('myth_collaborator_plot_point_categories (insert)', result.error);
  return (result.data as CollaboratorPlotPointCategoryRow[] | null) ?? [];
};

export const updateMythFolderCategories = async (mythId: string, categories: string[]) => {
  const result = await supabase.from('myth_folders').update({ categories }).eq('id', mythId);
  guardSupabaseError('myth_folders (categories update)', result.error);
  return { success: true };
};
