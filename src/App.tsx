import { useMemo, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { getSupabaseClient } from './lib/supabaseClient';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { AuthGate } from './components/AuthGate';
import { ArchiveLayout } from './routes/ArchiveLayout';
import { MythListPage } from './routes/MythListPage';
import { MythDetailPage } from './routes/MythDetailPage';
import { VariantDetailPage } from './routes/VariantDetailPage';
import { CanonicalizationLabPage } from './routes/CanonicalizationLabPage';
import { ContributionRequestPage } from './routes/ContributionRequestPage';
import { LoadingAnimation } from './components/LoadingAnimation';
import { MythArchiveProvider } from './providers/MythArchiveProvider';

function ClientNavigate({ to, fallback }: { to: string; fallback?: ReactNode }) {
  if (typeof window === 'undefined') {
    return fallback ?? null;
  }

  return <Navigate to={to} replace />;
}

export default function App() {
  const { session, authLoading } = useSupabaseAuth();
  const supabase = useMemo(() => (session ? getSupabaseClient() : null), [session]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <LoadingAnimation message="Checking your session…" />
      </div>
    );
  }

  const renderArchiveRoute = (page: ReactNode) => {
    if (!session || !supabase) {
      return <ClientNavigate to="/auth" fallback={<AuthGate />} />;
    }

    return (
      <MythArchiveProvider session={session}>
        <ArchiveLayout session={session} supabaseClient={supabase}>
          {page}
        </ArchiveLayout>
      </MythArchiveProvider>
    );
  };

  return (
    <Routes>
      <Route
        path="/auth"
        element={session ? <ClientNavigate to="/" fallback={<AuthGate />} /> : <AuthGate />}
      />
      <Route path="/" element={renderArchiveRoute(<MythListPage />)} />
      <Route path="/myths/:mythId" element={renderArchiveRoute(<MythDetailPage />)} />
      <Route
        path="/myths/:mythId/variants/:variantId"
        element={renderArchiveRoute(<VariantDetailPage />)}
      />
      <Route
        path="/myths/:mythId/canonicalization"
        element={renderArchiveRoute(<CanonicalizationLabPage />)}
      />
      <Route path="/contribute/:token" element={<ContributionRequestPage />} />
      <Route
        path="*"
        element={
          <ClientNavigate to={session ? '/' : '/auth'} fallback={session ? null : <AuthGate />} />
        }
      />
    </Routes>
  );
}
