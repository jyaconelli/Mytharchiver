import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSupabaseAuth } from '../useSupabaseAuth';

const supabaseStub = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
};

let profileUpsertMock: ReturnType<typeof vi.fn>;
vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => supabaseStub,
}));

describe('useSupabaseAuth', () => {
  beforeEach(() => {
    profileUpsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    supabaseStub.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'owner@example.com',
            user_metadata: {
              display_name: 'Owner One',
              avatar_url: 'owner.png',
            },
          },
        },
      },
      error: null,
    });

    supabaseStub.auth.onAuthStateChange.mockReset();
    supabaseStub.auth.onAuthStateChange.mockImplementation((callback) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    supabaseStub.from.mockReturnValue({
      upsert: profileUpsertMock,
    } as any);
  });

  it('returns the current session and syncs profile data', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    await waitFor(() => expect(result.current.session).not.toBeNull());

    expect(result.current.session?.user.email).toBe('owner@example.com');
    expect(profileUpsertMock).toHaveBeenCalledWith(
      {
        email: 'owner@example.com',
        display_name: 'Owner One',
        avatar_url: 'owner.png',
      },
      { onConflict: 'email' },
    );
  });

  it('updates session when auth state changes', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    await waitFor(() => expect(result.current.session).not.toBeNull());
    await waitFor(() => expect(supabaseStub.auth.onAuthStateChange).toHaveBeenCalled());

    const handler = supabaseStub.auth.onAuthStateChange.mock.calls[0][0] as
      | ((event: string, session: any) => void | Promise<void>)
      | undefined;
    if (!handler) {
      throw new Error('Auth change handler not registered');
    }

    const newSession = {
      user: {
        id: 'user-2',
        email: 'second@example.com',
        user_metadata: {},
      },
    };

    await act(async () => {
      await handler('SIGNED_IN', newSession);
    });

    await waitFor(() => expect(result.current.session?.user.id).toBe('user-2'));
  });
});
