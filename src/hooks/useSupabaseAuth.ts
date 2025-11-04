import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncProfile = async () => {
      if (!session) {
        return;
      }

      const supabase = getSupabaseClient();
      const email = session.user.email?.toLowerCase();
      if (!email) {
        return;
      }

      const metadata = session.user.user_metadata ?? {};
      const displayName =
        (metadata.display_name as string | undefined) ??
        (metadata.full_name as string | undefined) ??
        (metadata.name as string | undefined) ??
        null;
      const avatarUrl =
        (metadata.avatar_url as string | undefined) ??
        (metadata.picture as string | undefined) ??
        null;

      try {
        await supabase.from('user_profiles').upsert(
          {
            email,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          { onConflict: 'email' },
        );
      } catch (error) {
        console.warn('Unable to sync user profile', error);
      }
    };

    syncProfile();
  }, [session]);

  return { session, authLoading };
}
