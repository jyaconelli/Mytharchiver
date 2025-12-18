import { getSupabaseClient } from '../supabaseClient';
import { guardSupabaseError } from './error';
import { MythCategoryRow } from './types';

const supabase = getSupabaseClient();

export const fetchMythCategoriesByMythIds = async (
  mythIds: string[],
): Promise<MythCategoryRow[]> => {
  if (mythIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_categories')
    .select('id, myth_id, name, sort_order')
    .in('myth_id', mythIds)
    .order('sort_order', { ascending: true });

  guardSupabaseError('myth_categories', result.error, ['PGRST116']);
  return (result.data as MythCategoryRow[] | null) ?? [];
};

export const insertCanonicalCategories = async (
  mythId: string,
  names: string[],
): Promise<MythCategoryRow[]> => {
  if (names.length === 0) {
    return [];
  }

  const batch = names.map((name, index) => ({ myth_id: mythId, name, sort_order: index }));
  const result = await supabase
    .from('myth_categories')
    .insert(batch)
    .select('id, myth_id, name, sort_order');

  guardSupabaseError('myth_categories (create)', result.error);
  return (result.data as MythCategoryRow[] | null) ?? [];
};

export const fetchCategoriesForMyth = async (mythId: string): Promise<MythCategoryRow[]> => {
  const result = await supabase
    .from('myth_categories')
    .select('id, myth_id, name, sort_order')
    .eq('myth_id', mythId)
    .order('sort_order', { ascending: true });

  guardSupabaseError('myth_categories (fetch)', result.error, ['PGRST116']);
  return (result.data as MythCategoryRow[] | null) ?? [];
};

export const insertMythCategory = async (payload: {
  myth_id: string;
  name: string;
  sort_order: number;
}): Promise<MythCategoryRow> => {
  const { myth_id, name, sort_order } = payload;
  const result = await supabase
    .from('myth_categories')
    .insert({ myth_id, name, sort_order })
    .select('id, myth_id, name, sort_order')
    .single();

  guardSupabaseError('myth_categories (create)', result.error);
  return result.data as MythCategoryRow;
};

export const deleteMythCategories = async (ids: string[]) => {
  if (ids.length === 0) {
    return { success: true };
  }

  const result = await supabase.from('myth_categories').delete().in('id', ids);
  guardSupabaseError('myth_categories (delete)', result.error);
  return { success: true };
};

export const updateMythCategory = async (id: string, name: string, sortOrder: number) => {
  const result = await supabase
    .from('myth_categories')
    .update({ name, sort_order: sortOrder })
    .eq('id', id);
  guardSupabaseError('myth_categories (update)', result.error);
  return { success: true };
};
