import { CollaboratorRole } from '../../types/myth';
import { getSupabaseClient } from '../supabaseClient';
import { guardSupabaseError } from './error';
import { CollaboratorRow } from './types';

const supabase = getSupabaseClient();

export const fetchCollaboratorLinksByEmail = async (email: string) => {
  const result = await supabase.from('myth_collaborators').select('myth_id').eq('email', email);

  guardSupabaseError('myth_collaborators (collaborator links)', result.error);
  return (result.data as { myth_id: string }[] | null) ?? [];
};

export const fetchCollaboratorsByMythIds = async (
  mythIds: string[],
): Promise<CollaboratorRow[]> => {
  if (mythIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from('myth_collaborators')
    .select('id, myth_id, email, role')
    .in('myth_id', mythIds)
    .order('created_at', { ascending: true });

  guardSupabaseError('myth_collaborators (list)', result.error, ['PGRST116']);
  return (result.data as CollaboratorRow[] | null) ?? [];
};

export const insertMythCollaborator = async (payload: {
  mythId: string;
  email: string;
  role: CollaboratorRole;
}): Promise<CollaboratorRow> => {
  const { mythId, email, role } = payload;

  const result = await supabase
    .from('myth_collaborators')
    .insert({ myth_id: mythId, email, role })
    .select('id, myth_id, email, role')
    .single();

  guardSupabaseError('myth_collaborators (create)', result.error);
  return result.data as CollaboratorRow;
};
