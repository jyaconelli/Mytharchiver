import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { CanonicalizationLabPage } from '../CanonicalizationLabPage';

const useArchiveMock = vi.fn();
const mockLimit = vi.fn();

const supabaseMock = {
  from: vi.fn(),
  functions: {
    invoke: vi.fn(),
  },
  rpc: vi.fn(),
};

vi.mock('../ArchiveLayout', () => ({
  useArchive: () => useArchiveMock(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => supabaseMock,
}));

const baseMyth = {
  id: 'myth-1',
  name: 'Sky Forge',
  description: 'Legend of the sky smiths.',
  contributorInstructions: '',
  ownerId: 'owner-1',
  categories: [],
  variants: [
    {
      id: 'variant-1',
      name: 'Variant 1',
      source: '',
      plotPoints: [
        {
          id: 'pp-1',
          text: 'Forge the star-metal.',
          order: 1,
          category: '',
          mythemeRefs: [],
          collaboratorCategories: [],
        },
      ],
    },
  ],
  collaborators: [],
  canonicalCategories: [],
  collaboratorCategories: [
    {
      id: 'cat-a',
      mythId: 'myth-1',
      collaboratorEmail: 'alpha@example.com',
      name: 'Alpha Notes',
    },
  ],
};

const sampleRunRow = {
  id: 'run-1',
  myth_id: 'myth-1',
  mode: 'graph' as const,
  params: {},
  assignments: [{ plotPointId: 'pp-1', canonicalId: 'canon-a' }],
  prevalence: [{ canonicalId: 'canon-a', totals: { 'cat-a': 3 } }],
  metrics: {
    coverage: 1,
    purityByCanonical: { 'canon-a': 0.8 },
    entropyByCanonical: { 'canon-a': 0.2 },
    agreementGain: 4.5,
  },
  diagnostics: null,
  category_labels: { 'canon-a': 'Anvil Path' },
  status: 'succeeded' as const,
  created_at: '2025-11-10T00:00:00Z',
};

function setupSupabaseRunsResponse(...responses: Array<{ data: unknown; error: unknown }>) {
  mockLimit.mockReset();
  responses.forEach((response) => {
    mockLimit.mockResolvedValueOnce(response);
  });
  supabaseMock.from.mockImplementation((table: string) => {
    if (table !== 'canonicalization_runs') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      };
    }
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = mockLimit;
    return query;
  });
}

function renderWithRouter(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/myths/:mythId/canonicalization" element={<CanonicalizationLabPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CanonicalizationLabPage', () => {
  beforeEach(() => {
    useArchiveMock.mockReset();
    supabaseMock.functions.invoke.mockReset();
    supabaseMock.rpc.mockReset();
    setupSupabaseRunsResponse({ data: [sampleRunRow], error: null });
  });

  it('renders parameter rail, summary cards, and history when myth exists', async () => {
    useArchiveMock.mockReturnValue({
      myths: [baseMyth],
      isInitialLoad: false,
    });

    renderWithRouter('/myths/myth-1/canonicalization');

    expect(screen.getByTestId('canonicalization-lab')).toBeInTheDocument();
    expect(screen.getByTestId('parameter-rail')).toBeInTheDocument();
    expect(screen.getByTestId('run-history')).toBeInTheDocument();
    await screen.findByText(/Agreement Graph ·/i);
  });

  it('shows loading animation when archive data is still loading', () => {
    useArchiveMock.mockReturnValue({
      myths: [],
      isInitialLoad: true,
    });

    renderWithRouter('/myths/myth-1/canonicalization');

    expect(screen.getByText(/Loading canonicalization lab/i)).toBeInTheDocument();
  });

  it('renders myth not found state if myth is missing', () => {
    useArchiveMock.mockReturnValue({
      myths: [],
      isInitialLoad: false,
    });

    renderWithRouter('/myths/missing-id/canonicalization');

    expect(screen.getByText(/Myth not found/i)).toBeInTheDocument();
  });

  it('invokes supabase function when running analysis', async () => {
    useArchiveMock.mockReturnValue({
      myths: [baseMyth],
      isInitialLoad: false,
    });
    setupSupabaseRunsResponse(
      { data: [sampleRunRow], error: null },
      { data: [sampleRunRow], error: null },
    );
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { run: { id: 'run-2' } },
      error: null,
    });

    renderWithRouter('/myths/myth-1/canonicalization');

    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));

    await waitFor(() => expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1));
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('canonicalization-run', {
      body: expect.objectContaining({ mythId: 'myth-1' }),
    });
  });

  it('renames a category via RPC', async () => {
    useArchiveMock.mockReturnValue({
      myths: [baseMyth],
      isInitialLoad: false,
    });
    setupSupabaseRunsResponse(
      { data: [sampleRunRow], error: null },
      { data: [sampleRunRow], error: null },
    );
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    renderWithRouter('/myths/myth-1/canonicalization');

    const inputs = await screen.findAllByLabelText(/Category name/i);
    const input = inputs[0];
    fireEvent.change(input, { target: { value: 'Custom Name' } });
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => expect(supabaseMock.rpc).toHaveBeenCalledTimes(1));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('canonicalization_set_label', {
      p_run_id: 'run-1',
      p_canonical_id: 'canon-a',
      p_label: 'Custom Name',
    });
  });
});
