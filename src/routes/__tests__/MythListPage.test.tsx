import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MythListPage } from '../MythListPage';

const useMythsContextMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../providers/MythArchiveProvider', () => ({
  useMythsContext: () => useMythsContextMock(),
}));

vi.mock('../../components/AddMythDialog', () => ({
  AddMythDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-myth-dialog">Open</div> : null,
}));

describe('MythListPage', () => {
  const addMythMock = vi.fn();

  beforeEach(() => {
    useMythsContextMock.mockReturnValue({
      myths: [
        {
          id: 'myth-1',
          name: 'Fire Theft',
          description: 'Prometheus steals fire.',
          contributorInstructions: '',
          ownerId: 'owner-1',
          categories: [],
          variants: [],
          collaborators: [],
          canonicalCategories: [],
          collaboratorCategories: [],
        },
      ],
      addMyth: addMythMock,
      loading: false,
    });
    navigateMock.mockClear();
  });

  it('renders myth list and navigates on selection', () => {
    render(
      <MemoryRouter>
        <MythListPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Fire Theft'));
    expect(navigateMock).toHaveBeenCalledWith('/myths/myth-1');

    expect(screen.queryByTestId('add-myth-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add myth folder/i }));
    expect(screen.getByTestId('add-myth-dialog')).toBeInTheDocument();
  });
});
