import { BrowserRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from './lib/supabaseClient';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { AppRoutes } from './AppRoutes';
import type { SupabaseAuthClient } from './routes/ArchiveLayout';

type AppContainerProps = {
  RouterComponent: ComponentType<any>;
  routerProps?: Record<string, unknown>;
  initialSession?: Session | null;
  initialAuthLoading?: boolean;
  supabaseClientOverride?: SupabaseAuthClient;
};

export function AppContainer({
  RouterComponent,
  routerProps,
  initialSession,
  initialAuthLoading,
  supabaseClientOverride,
}: AppContainerProps) {
  const supabase = useMemo(
    () => supabaseClientOverride ?? getSupabaseClient(),
    [supabaseClientOverride],
  );
  const { session: liveSession, authLoading: liveAuthLoading } = useSupabaseAuth();
  const [useInitialState, setUseInitialState] = useState(
    initialSession !== undefined || initialAuthLoading !== undefined,
  );

  useEffect(() => {
    if (useInitialState) {
      setUseInitialState(false);
    }
  }, [useInitialState]);

  const session =
    useInitialState && initialSession !== undefined ? initialSession : liveSession;
  const authLoading =
    useInitialState && initialAuthLoading !== undefined
      ? initialAuthLoading
      : liveAuthLoading;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-gray-600 dark:text-gray-400">Checking your session…</p>
      </div>
    );
  }

  const Router = RouterComponent;

  return (
    <Router {...(routerProps ?? {})}>
      <AppRoutes session={session} supabaseClient={supabase} />
    </Router>
  );
}

export default function App() {
  return <AppContainer RouterComponent={BrowserRouter} />;
}
