import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

const isServer = typeof window === 'undefined';

export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env?.SSR || isServer) {
      cachedClient = createStaticSupabaseStub();
      return cachedClient;
    }
    throw new Error(
      'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the runtime environment.',
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

function createStaticSupabaseStub(): SupabaseClient {
  const stub = {
    auth: {
      async signOut() {
        return { error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
      async signInWithPassword() {
        return {
          data: { session: null, user: null },
          error: new Error('Authentication is unavailable during prerender.'),
        };
      },
      async signUp() {
        return {
          data: { user: null, session: null },
          error: new Error('Authentication is unavailable during prerender.'),
        };
      },
    },
    from() {
      throw new Error('Database access is unavailable during prerender.');
    },
    rpc() {
      throw new Error('Database access is unavailable during prerender.');
    },
    storage: {
      from() {
        throw new Error('Storage access is unavailable during prerender.');
      },
    },
  };

  return stub as unknown as SupabaseClient;
}
