import { getSupabaseClient } from '../supabaseClient';
import { createSupabaseError } from './error';

const supabase = getSupabaseClient();

export const fetchSettings = async (userId: string) => {
  const settingsResult = await supabase
    .from('profile_settings')
    .select('categories')
    .eq('user_id', userId)
    .maybeSingle();

  if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
    throw createSupabaseError('profile_settings', settingsResult.error);
  }

  return settingsResult;
};
