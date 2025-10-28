import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi, type Mock } from 'vitest';

import App from '../App';

const {
  mockUseSupabaseAuth,
  mockUseMythArchive,
  AuthGateMock,
  AppHeaderMock,
  MythListMock,
  VariantSelectorMock,
  VariantViewMock,
  AddMythDialogMock,
  AddVariantDialogMock,
  AddMythemeDialogMock,
  ManageCategoriesDialogMock,
  ManageMythemesDialogMock,
  ManageCollaboratorsDialogMock,
  CollaboratorSummaryMock,
  mockSupabaseSignOut,
} = vi.hoisted(() => ({
  mockUseSupabaseAuth: vi.fn(),
  mockUseMythArchive: vi.fn(),
  AuthGateMock: vi.fn(() => <div data-testid="auth-gate">AuthGate</div>),
  AppHeaderMock: vi.fn(
    ({ title, subtitle }: { title: string; subtitle?: string | null }) => (
      <header data-testid="app-header">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
    ),
  ),
  MythListMock: vi.fn(
    ({ myths, onAddMyth }: { myths: Array<unknown>; onAddMyth: () => void }) => (
      <div data-testid="myth-list" onClick={onAddMyth}>
        Myth list count: {myths.length}
      </div>
    ),
  ),
  VariantSelectorMock: vi.fn(() => (
    <div data-testid="variant-selector">Variant selector</div>
  )),
  VariantViewMock: vi.fn(() => <div data-testid="variant-view">Variant view</div>),
  AddMythDialogMock: vi.fn(({ open }: { open: boolean }) => (
    <div data-testid="add-myth-dialog">Add myth dialog open: {String(open)}</div>
  )),
  AddVariantDialogMock: vi.fn(({ open }: { open: boolean }) => (
    <div data-testid="add-variant-dialog">Add variant dialog open: {String(open)}</div>
  )),
  AddMythemeDialogMock: vi.fn(({ open }: { open: boolean }) => (
    <div data-testid="add-mytheme-dialog">Add mytheme dialog open: {String(open)}</div>
  )),
  ManageCategoriesDialogMock: vi.fn(({ open }: { open: boolean }) => (
    <div data-testid="manage-categories-dialog">
      Manage categories dialog open: {String(open)}
    </div>
  )),
  ManageMythemesDialogMock: vi.fn(({ open }: { open: boolean }) => (
    <div data-testid="manage-mythemes-dialog">
      Manage mythemes dialog open: {String(open)}
    </div>
  )),
  ManageCollaboratorsDialogMock: vi.fn(({ open }: { open: boolean }) => (
    <div data-testid="manage-collaborators-dialog">
      Manage collaborators dialog open: {String(open)}
    </div>
  )),
  CollaboratorSummaryMock: vi.fn(() => (
    <div data-testid="collaborator-summary">Collaborator summary</div>
  )),
  mockSupabaseSignOut: vi.fn(),
}));

vi.mock('../hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: mockUseSupabaseAuth,
}));

vi.mock('../hooks/useMythArchive', () => ({
  useMythArchive: mockUseMythArchive,
}));

vi.mock('../components/AuthGate', () => ({
  AuthGate: AuthGateMock,
}));

vi.mock('../components/AppHeader', () => ({
  AppHeader: AppHeaderMock,
}));

vi.mock('../components/MythList', () => ({
  MythList: MythListMock,
}));

vi.mock('../components/VariantSelector', () => ({
  VariantSelector: VariantSelectorMock,
}));

vi.mock('../components/VariantView', () => ({
  VariantView: VariantViewMock,
}));

vi.mock('../components/AddMythDialog', () => ({
  AddMythDialog: AddMythDialogMock,
}));

vi.mock('../components/AddVariantDialog', () => ({
  AddVariantDialog: AddVariantDialogMock,
}));

vi.mock('../components/AddMythemeDialog', () => ({
  AddMythemeDialog: AddMythemeDialogMock,
}));

vi.mock('../components/ManageCategoriesDialog', () => ({
  ManageCategoriesDialog: ManageCategoriesDialogMock,
}));

vi.mock('../components/ManageMythemesDialog', () => ({
  ManageMythemesDialog: ManageMythemesDialogMock,
}));

vi.mock('../components/ManageCollaboratorsDialog', () => ({
  ManageCollaboratorsDialog: ManageCollaboratorsDialogMock,
}));

vi.mock('../components/CollaboratorSummary', () => ({
  CollaboratorSummary: CollaboratorSummaryMock,
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: mockSupabaseSignOut,
    },
  },
}));

function createArchiveState(overrides?: Partial<ReturnType<typeof defaultArchiveState>>) {
  return {
    ...defaultArchiveState(),
    ...overrides,
  };
}

function defaultArchiveState() {
  return {
    myths: [],
    mythemes: [],
    dataLoading: false,
    dataError: null as string | null,
    loadArchiveData: vi.fn(),
    addMyth: vi.fn(),
    addVariant: vi.fn(),
    updateVariant: vi.fn(),
    addMytheme: vi.fn(),
    deleteMytheme: vi.fn(),
    updateMythCategories: vi.fn(),
    addCollaborator: vi.fn(),
    updateCollaboratorRole: vi.fn(),
    removeCollaborator: vi.fn(),
  };
}

const baseSession = {
  user: {
    id: 'user-1',
    email: 'User@Email.com',
    user_metadata: {
      full_name: 'Test User',
    },
  },
};

const getLatestProps = <T,>(mockFn: Mock<[T], unknown>): T => {
  const call = mockFn.mock.calls[mockFn.mock.calls.length - 1];
  if (!call) {
    throw new Error('Mock was not called');
  }
  return call[0];
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseSignOut.mockResolvedValue(undefined);
    mockUseSupabaseAuth.mockReturnValue({ session: null, authLoading: false });
    mockUseMythArchive.mockImplementation(() => defaultArchiveState());
  });

  test('shows loading indicator while authentication status is pending', () => {
    mockUseSupabaseAuth.mockReturnValue({ session: null, authLoading: true });

    const { container } = render(<App />);

    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders AuthGate when no session is found', () => {
    mockUseSupabaseAuth.mockReturnValue({ session: null, authLoading: false });

    render(<App />);

    expect(screen.getByTestId('auth-gate')).toBeInTheDocument();
    expect(AuthGateMock).toHaveBeenCalledTimes(1);
  });

  test('renders archive layout with myth list when authenticated', () => {
    const myths = [
      {
        id: 'myth-1',
        name: 'Myth One',
        description: 'First myth',
        ownerId: 'user-1',
        collaborators: [],
        categories: [],
        variants: [],
      },
      {
        id: 'myth-2',
        name: 'Myth Two',
        description: 'Second myth',
        ownerId: 'user-1',
        collaborators: [],
        categories: [],
        variants: [],
      },
    ];

    mockUseSupabaseAuth.mockReturnValue({ session: baseSession, authLoading: false });
    mockUseMythArchive.mockImplementation(() => createArchiveState({ myths }));

    const { container } = render(<App />);

    expect(AppHeaderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Myth Archive',
        currentUserEmail: 'user@email.com',
      }),
      expect.anything(),
    );
    expect(MythListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        myths,
      }),
      expect.anything(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('allows retrying archive load when an error occurs', async () => {
    const user = userEvent.setup();
    const loadArchiveData = vi.fn();

    mockUseSupabaseAuth.mockReturnValue({ session: baseSession, authLoading: false });
    mockUseMythArchive.mockImplementation(() =>
      createArchiveState({
        dataError: 'Network request failed',
        loadArchiveData,
      }),
    );

    render(<App />);

    expect(screen.getByText(/unable to load archive data/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(loadArchiveData).toHaveBeenCalledTimes(1);
  });

  test('supports myth and variant interactions', async () => {
    const addMyth = vi.fn().mockResolvedValue(undefined);
    const addVariant = vi.fn().mockResolvedValue(undefined);
    const updateVariant = vi.fn().mockResolvedValue(undefined);
    const addMytheme = vi.fn().mockResolvedValue(undefined);
    const deleteMytheme = vi.fn().mockResolvedValue(undefined);
    const updateMythCategories = vi.fn().mockResolvedValue(undefined);
    const addCollaborator = vi.fn().mockResolvedValue(undefined);
    const updateCollaboratorRole = vi.fn().mockResolvedValue(undefined);
    const removeCollaborator = vi.fn().mockResolvedValue(undefined);

    const mythOne = {
      id: 'myth-1',
      name: 'Myth One',
      description: 'First myth',
      ownerId: 'user-1',
      collaborators: [
        {
          email: 'other@example.com',
          role: 'viewer' as const,
        },
      ],
      categories: ['Origins'],
      variants: [
        {
          id: 'variant-1',
          name: 'Variant Alpha',
          source: 'Historian',
          plotPoints: [],
        },
      ],
    };

    const mythTwo = {
      id: 'myth-2',
      name: 'Myth Two',
      description: 'Second myth',
      ownerId: 'owner-2',
      collaborators: [
        {
          email: 'user@email.com',
          role: 'editor' as const,
        },
      ],
      categories: ['Themes'],
      variants: [
        {
          id: 'variant-2',
          name: 'Variant Beta',
          source: 'Archivist',
          plotPoints: [],
        },
      ],
    };

    const archiveState = createArchiveState({
      myths: [mythOne, mythTwo],
      mythemes: [{ id: 'theme-1', name: 'Hero', color: '#fff', type: 'character' as const }],
      dataLoading: true,
      addMyth,
      addVariant,
      updateVariant,
      addMytheme,
      deleteMytheme,
      updateMythCategories,
      addCollaborator,
      updateCollaboratorRole,
      removeCollaborator,
    });

    mockUseSupabaseAuth.mockReturnValue({ session: baseSession, authLoading: false });
    mockUseMythArchive.mockImplementation(() => archiveState);

    render(<App />);

    expect(screen.getByText(/Syncing with Supabase/i)).toBeInTheDocument();

    await expect(
      getLatestProps(AddVariantDialogMock).onAdd('Variant before selection', 'Source'),
    ).rejects.toThrow(/Select a myth/i);

    await act(() => {
      getLatestProps(MythListMock).onSelectMyth('myth-1');
    });

    const headerAfterMythSelect = getLatestProps(AppHeaderMock);
    expect(headerAfterMythSelect.subtitle).toBe('Myth One');
    expect(headerAfterMythSelect.canGoBack).toBe(true);

    expect(getLatestProps(CollaboratorSummaryMock).myth.id).toBe('myth-1');

    const variantSelectorProps = getLatestProps(VariantSelectorMock);
    expect(variantSelectorProps.canEdit).toBe(true);

    await act(() => {
      variantSelectorProps.onAddVariant?.();
    });

    const addVariantDialogProps = getLatestProps(AddVariantDialogMock);
    expect(addVariantDialogProps.open).toBe(true);
    await expect(addVariantDialogProps.onAdd('Variant Alpha', 'Source Text')).resolves.toBeUndefined();
    expect(addVariant).toHaveBeenCalledWith('myth-1', 'Variant Alpha', 'Source Text');

    await act(() => {
      addVariantDialogProps.onOpenChange(false);
    });

    await act(() => {
      getLatestProps(VariantSelectorMock).onSelectVariant('variant-1');
    });

    const headerWithVariant = getLatestProps(AppHeaderMock);
    expect(headerWithVariant.subtitle).toBe('Myth One / Variant Alpha');

    const variantViewProps = getLatestProps(VariantViewMock);
    await expect(
      variantViewProps.onUpdateVariant({ id: 'variant-1', name: 'Variant Alpha', source: 'New' }),
    ).resolves.toBeUndefined();
    expect(updateVariant).toHaveBeenCalledWith('myth-1', {
      id: 'variant-1',
      name: 'Variant Alpha',
      source: 'New',
    });

    await act(() => {
      getLatestProps(AppHeaderMock).onBack();
    });
    expect(VariantViewMock.mock.calls.length).toBe(1);

    await act(() => {
      getLatestProps(AppHeaderMock).onBack();
    });
    expect(getLatestProps(MythListMock).selectedMythId).toBeNull();

    await act(() => {
      getLatestProps(MythListMock).onAddMyth();
    });
    expect(getLatestProps(AddMythDialogMock).open).toBe(true);

    await expect(
      getLatestProps(AddMythDialogMock).onAdd('New Myth', 'Description'),
    ).resolves.toBeUndefined();
    expect(addMyth).toHaveBeenCalledWith('New Myth', 'Description');

    await act(() => {
      getLatestProps(AddMythDialogMock).onOpenChange(false);
    });

    await act(() => {
      getLatestProps(MythListMock).onSelectMyth('myth-1');
    });

    await act(() => {
      getLatestProps(AppHeaderMock).onOpenManageCategories();
    });
    expect(getLatestProps(ManageCategoriesDialogMock).open).toBe(true);

    await act(() => {
      getLatestProps(ManageCategoriesDialogMock).onUpdateCategories(['Origins', 'Legends']);
    });
    expect(updateMythCategories).toHaveBeenCalledWith('myth-1', ['Origins', 'Legends']);

    await act(() => {
      getLatestProps(ManageCategoriesDialogMock).onOpenChange(false);
    });
    expect(getLatestProps(ManageCategoriesDialogMock).open).toBe(false);

    await act(() => {
      getLatestProps(ManageCategoriesDialogMock).onOpenChange(true);
    });
    expect(getLatestProps(ManageCategoriesDialogMock).open).toBe(true);

    await act(() => {
      getLatestProps(AppHeaderMock).onOpenManageMythemes();
    });
    expect(getLatestProps(ManageMythemesDialogMock).open).toBe(true);

    await act(() => {
      getLatestProps(ManageMythemesDialogMock).onDelete('theme-1');
    });
    expect(deleteMytheme).toHaveBeenCalledWith('theme-1');

    await act(() => {
      getLatestProps(ManageMythemesDialogMock).onAdd();
    });
    expect(getLatestProps(ManageMythemesDialogMock).open).toBe(false);
    expect(getLatestProps(AddMythemeDialogMock).open).toBe(true);

    await expect(
      getLatestProps(AddMythemeDialogMock).onAdd('Mytheme', 'event'),
    ).resolves.toBeUndefined();
    expect(addMytheme).toHaveBeenCalledWith('Mytheme', 'event');

    await act(() => {
      getLatestProps(AddMythemeDialogMock).onOpenChange(false);
    });

    await act(() => {
      getLatestProps(CollaboratorSummaryMock).onManage();
    });
    expect(getLatestProps(ManageCollaboratorsDialogMock).open).toBe(true);
    expect(getLatestProps(ManageCollaboratorsDialogMock).canManage).toBe(true);

    await act(() => {
      getLatestProps(ManageCollaboratorsDialogMock).onAddCollaborator(
        'myth-1',
        'friend@example.com',
        'viewer',
      );
    });
    expect(addCollaborator).toHaveBeenCalledWith('myth-1', 'friend@example.com', 'viewer');

    await act(() => {
      getLatestProps(ManageCollaboratorsDialogMock).onUpdateCollaboratorRole(
        'collab-id',
        'editor',
      );
    });
    expect(updateCollaboratorRole).toHaveBeenCalledWith('collab-id', 'editor');

    await act(() => {
      getLatestProps(ManageCollaboratorsDialogMock).onRemoveCollaborator('collab-id');
    });
    expect(removeCollaborator).toHaveBeenCalledWith('collab-id');

    await act(() => {
      getLatestProps(ManageCollaboratorsDialogMock).onOpenChange(false);
    });

    await act(() => {
      getLatestProps(AppHeaderMock).onSignOut();
    });
    expect(mockSupabaseSignOut).toHaveBeenCalledTimes(1);

    await act(() => {
      getLatestProps(AppHeaderMock).onBack();
    });

    await act(() => {
      getLatestProps(MythListMock).onSelectMyth('myth-2');
    });

    const headerSecondMyth = getLatestProps(AppHeaderMock);
    expect(headerSecondMyth.subtitle).toBe('Myth Two');
    expect(headerSecondMyth.canGoBack).toBe(true);

    const secondVariantSelectorProps = getLatestProps(VariantSelectorMock);
    expect(secondVariantSelectorProps.canEdit).toBe(true);

    await act(() => {
      getLatestProps(CollaboratorSummaryMock).onManage();
    });
    expect(getLatestProps(ManageCollaboratorsDialogMock).canManage).toBe(false);
  });
});
