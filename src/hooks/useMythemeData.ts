import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';
import { Mytheme } from '../types/myth';

type MythemeRow = {
  id: string;
  name: string;
  type: 'character' | 'event' | 'place' | 'object';
  user_id?: string;
};

export function useMythemeData(session: Session | null) {
  const supabase = getSupabaseClient();
  const [mythemes, setMythemes] = useState<Mytheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMythemes = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mythemesResult = await supabase
        .from('mythemes')
        .select('id, name, type')
        .eq('user_id', session.user.id)
        .order('name');

      if (mythemesResult.error) {
        throw new Error(mythemesResult.error.message);
      }

      setMythemes((mythemesResult.data as MythemeRow[] | null) ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load mythemes right now.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (!session) {
      setMythemes([]);
      setLoading(false);
      setError(null);
      return;
    }

    loadMythemes();
  }, [session, loadMythemes]);

  const addMytheme = useCallback(
    async (name: string, type: 'character' | 'event' | 'place' | 'object') => {
      if (!session) {
        throw new Error('You must be signed in to add mythemes.');
      }

      const { data, error: insertError } = await supabase
        .from('mythemes')
        .insert({
          name,
          type,
          user_id: session.user.id,
        })
        .select('id, name, type')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setMythemes((prev) => [...prev, data as MythemeRow]);
    },
    [session, supabase],
  );

  const deleteMytheme = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('mythemes').delete().eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMythemes((prev) => prev.filter((mytheme) => mytheme.id !== id));
    },
    [supabase],
  );

  return {
    mythemes,
    loading,
    error,
    loadMythemes,
    addMytheme,
    deleteMytheme,
  };
}
