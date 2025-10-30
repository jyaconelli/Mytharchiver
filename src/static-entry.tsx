import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import type { Session } from '@supabase/supabase-js';
import type { ComponentType } from 'react';

import { AppContainer } from './App';
import type { SupabaseAuthClient } from './routes/ArchiveLayout';
import type { BootstrappedAuthState } from './hooks/useSupabaseAuth';

type RenderOptions = {
  session?: Session | null;
  authLoading?: boolean;
};

const staticSupabaseClient: SupabaseAuthClient = {
  auth: {
    async signOut() {
      return { error: null };
    },
  },
};

export function render(
  url: string,
  { session = null, authLoading = false }: RenderOptions = {},
) {
  const context: { url?: string } = {};
  const html = renderToString(
    <AppContainer
      RouterComponent={StaticRouter as unknown as ComponentType<any>}
      routerProps={{ location: url, context }}
      initialSession={session}
      initialAuthLoading={authLoading}
      supabaseClientOverride={staticSupabaseClient}
    />,
  );

  const bootstrap: BootstrappedAuthState = {
    session,
    authLoading,
  };

  return {
    html,
    redirect: context.url ?? null,
    bootstrap,
  };
}
