import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';

export type BootstrappedAuthState = {
  session: Session | null;
  authLoading: boolean;
};

declare global {
  interface Window {
    __PRELOADED_AUTH__?: BootstrappedAuthState | null;
  }
}

let cachedBootstrapAuth: BootstrappedAuthState | null | undefined;

function consumeBootstrapAuth(): BootstrappedAuthState | null {
  if (cachedBootstrapAuth !== undefined) {
    return cachedBootstrapAuth;
  }
  if (typeof window === 'undefined') {
    cachedBootstrapAuth = null;
    return cachedBootstrapAuth;
  }

  const bootstrap = window.__PRELOADED_AUTH__ ?? null;
  if (bootstrap) {
    delete window.__PRELOADED_AUTH__;
  }
  cachedBootstrapAuth = bootstrap;
  return cachedBootstrapAuth;
}

export function useSupabaseAuth() {
  const bootstrap = consumeBootstrapAuth();
  const [session, setSession] = useState<Session | null>(bootstrap?.session ?? null);
  const [authLoading, setAuthLoading] = useState(bootstrap?.authLoading ?? true);

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

  return { session, authLoading };
}
