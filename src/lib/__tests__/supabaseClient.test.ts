import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a singleton Supabase client', async () => {
    const createClient = vi.fn(() => ({ marker: 'client' }));
    vi.doMock('@supabase/supabase-js', () => ({ createClient }));

    const { getSupabaseClient } = await import('../supabaseClient');

    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
