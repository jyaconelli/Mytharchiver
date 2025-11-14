import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';

export function useSupabaseAuth() {
  const isBrowser = typeof window !== 'undefined';
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isBrowser);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

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
  }, [isBrowser]);

  return { session, authLoading };
}
