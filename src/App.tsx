import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { getSupabaseClient } from './lib/supabaseClient';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { AuthGate } from './components/AuthGate';
import { ArchiveLayout } from './routes/ArchiveLayout';
import { MythListPage } from './routes/MythListPage';
import { MythDetailPage } from './routes/MythDetailPage';
import { VariantDetailPage } from './routes/VariantDetailPage';
import { ContributionRequestPage } from './routes/ContributionRequestPage';
import { LoadingAnimation } from './components/LoadingAnimation';

export default function App() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { session, authLoading } = useSupabaseAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <LoadingAnimation message="Checking your session…" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthGate />} />
        <Route
          path="/"
          element={
            session ? (
              <ArchiveLayout session={session} supabaseClient={supabase} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        >
          <Route index element={<MythListPage />} />
          <Route path="myths/:mythId" element={<MythDetailPage />} />
          <Route path="myths/:mythId/variants/:variantId" element={<VariantDetailPage />} />
        </Route>
        <Route path="/contribute/:token" element={<ContributionRequestPage />} />
        <Route path="*" element={<Navigate to={session ? '/' : '/auth'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
