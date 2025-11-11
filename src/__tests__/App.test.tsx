import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import App from '../App';

const { mockUseSupabaseAuth, AuthGateMock, ArchiveLayoutMock } = vi.hoisted(() => ({
  mockUseSupabaseAuth: vi.fn(),
  AuthGateMock: vi.fn(() => <div data-testid="auth-gate">Auth</div>),
  ArchiveLayoutMock: vi.fn(() => <div data-testid="archive-layout">Archive</div>),
}));

vi.mock('../hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: mockUseSupabaseAuth,
}));

vi.mock('../components/AuthGate', () => ({
  AuthGate: AuthGateMock,
}));

vi.mock('../routes/ArchiveLayout', () => ({
  ArchiveLayout: ArchiveLayoutMock,
}));

vi.mock('../lib/supabaseClient', () => {
  const client = { auth: { signOut: vi.fn() } };
  return {
    getSupabaseClient: () => client,
  };
});

const baseSession = {
  user: {
    id: 'user-1',
    email: 'user@example.com',
    user_metadata: { full_name: 'Test User' },
  },
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSupabaseAuth.mockReturnValue({ session: null, authLoading: false });
  });

  it('renders a loading indicator while authentication state is pending', () => {
    mockUseSupabaseAuth.mockReturnValue({ session: null, authLoading: true });

    render(<App />);

    expect(screen.getByText('Checking your session…', { exact: false })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the auth gate', () => {
    mockUseSupabaseAuth.mockReturnValue({ session: null, authLoading: false });

    render(<App />);

    expect(AuthGateMock).toHaveBeenCalled();
    expect(screen.getByTestId('auth-gate')).toBeInTheDocument();
    expect(ArchiveLayoutMock).not.toHaveBeenCalled();
  });

  it('renders the archive layout when a session is present', () => {
    mockUseSupabaseAuth.mockReturnValue({ session: baseSession, authLoading: false });

    render(<App />);

    expect(ArchiveLayoutMock).toHaveBeenCalledTimes(1);
    const props = ArchiveLayoutMock.mock.calls[0]?.[0];
    expect(props?.session).toBe(baseSession);
    expect(screen.getByTestId('archive-layout')).toBeInTheDocument();
    expect(AuthGateMock).not.toHaveBeenCalled();
  });
});
