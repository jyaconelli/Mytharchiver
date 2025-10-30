import { Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import { AuthGate } from './components/AuthGate';
import { ArchiveLayout } from './routes/ArchiveLayout';
import { MythListPage } from './routes/MythListPage';
import { MythDetailPage } from './routes/MythDetailPage';
import { VariantDetailPage } from './routes/VariantDetailPage';
import type { SupabaseAuthClient } from './routes/ArchiveLayout';

type AppRoutesProps = {
  session: Session | null;
  supabaseClient: SupabaseAuthClient;
};

export function AppRoutes({ session, supabaseClient }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/auth"
        element={session ? <Navigate to="/" replace /> : <AuthGate />}
      />
      <Route
        path="/"
        element={
          session ? (
            <ArchiveLayout session={session} supabaseClient={supabaseClient} />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      >
        <Route index element={<MythListPage />} />
        <Route path="myths/:mythId" element={<MythDetailPage />} />
        <Route path="myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={session ? '/' : '/auth'} replace />}
      />
    </Routes>
  );
}
