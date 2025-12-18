import { getSupabaseClient } from '../supabaseClient';
import { guardSupabaseError } from './error';
import { MythVariantRow } from './types';

const supabase = getSupabaseClient();

export const fetchVariantsByMythIds = async (mythIds: string[]): Promise<MythVariantRow[]> => {
  if (mythIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_variants')
    .select(
      'id, myth_id, name, source, sort_order, created_at, created_by_user_id, contributor_email, contributor_name, contributor_type, contribution_request_id',
    )
    .in('myth_id', mythIds)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  guardSupabaseError('myth_variants', result.error, ['PGRST116']);
  return (result.data as MythVariantRow[] | null) ?? [];
};
