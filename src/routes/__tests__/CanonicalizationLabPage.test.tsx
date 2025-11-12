import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalizationLabPage } from '../CanonicalizationLabPage';

const useArchiveMock = vi.fn();

vi.mock('../ArchiveLayout', () => ({
  useArchive: () => useArchiveMock(),
}));

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
  });

  it('renders parameter rail, summary cards, and history when myth exists', () => {
    useArchiveMock.mockReturnValue({
      myths: [
        {
          id: 'myth-1',
          name: 'Sky Forge',
          description: 'Legend of the sky smiths.',
          contributorInstructions: '',
          ownerId: 'owner-1',
          categories: [],
          variants: [],
          collaborators: [],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
      isInitialLoad: false,
    });

    renderWithRouter('/myths/myth-1/canonicalization');

    expect(screen.getByTestId('canonicalization-lab')).toBeInTheDocument();
    expect(screen.getByTestId('parameter-rail')).toBeInTheDocument();
    expect(screen.getByTestId('run-history')).toBeInTheDocument();
    expect(screen.getByText(/Sky Forge · Canonicalization Lab/i)).toBeInTheDocument();
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
});
