import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi } from 'vitest';

import { ManageCollaboratorsDialog } from '../ManageCollaboratorsDialog';
import { Myth } from '../../types/myth';

const setupDomMocks = () => {
  const proto = window.HTMLElement.prototype as HTMLElement & {
    hasPointerCapture?: (pointerId: number) => boolean;
    releasePointerCapture?: (pointerId: number) => void;
    scrollIntoView?: () => void;
  };

  if (typeof proto.hasPointerCapture !== 'function') {
    Object.defineProperty(proto, 'hasPointerCapture', {
      value: () => false,
      configurable: true,
    });
  }
  if (typeof proto.releasePointerCapture !== 'function') {
    Object.defineProperty(proto, 'releasePointerCapture', {
      value: () => {},
      configurable: true,
    });
  }
  if (typeof proto.scrollIntoView !== 'function') {
    Object.defineProperty(proto, 'scrollIntoView', {
      value: () => {},
      configurable: true,
    });
  }
  if (typeof window.ResizeObserver === 'undefined') {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error mock for tests
    window.ResizeObserver = MockResizeObserver;
  }
};

const createMyth = (overrides: Partial<Myth> = {}): Myth => ({
  id: 'myth-1',
  name: 'Fire Theft',
  description: '',
  contributorInstructions: '',
  ownerId: 'owner-1',
  categories: [],
  variants: [],
  collaborators: [
    {
      id: 'collab-1',
      mythId: 'myth-1',
      email: 'owner@example.com',
      role: 'owner',
      displayName: 'Olive Owner',
    },
    {
      id: 'collab-2',
      mythId: 'myth-1',
      email: 'scribe@example.com',
      role: 'editor',
      displayName: 'Eddie Editor',
    },
    {
      id: 'collab-3',
      mythId: 'myth-1',
      email: 'watcher@example.com',
      role: 'viewer',
      displayName: 'Vera Viewer',
    },
  ],
  canonicalCategories: [],
  collaboratorCategories: [],
  ...overrides,
});

const selectOption = async (
  user: ReturnType<(typeof userEvent)['setup']>,
  trigger: HTMLElement,
  name: string,
) => {
  await user.click(trigger);
  const option = screen
    .getAllByText(name, { exact: true })
    .find((element) => element.closest('[data-slot="select-item"]'));
  if (!option) {
    throw new Error(`Option ${name} not found`);
  }
  await user.click(option.closest('[data-slot="select-item"]') as HTMLElement);
};

describe('ManageCollaboratorsDialog', () => {
  beforeAll(() => {
    setupDomMocks();
  });

  test('allows owners to manage collaborators', async () => {
    const user = userEvent.setup();
    const myth = createMyth();
    const onAddCollaborator = vi.fn().mockResolvedValue(undefined);
    const onUpdateCollaboratorRole = vi.fn().mockResolvedValue(undefined);
    const onRemoveCollaborator = vi.fn().mockResolvedValue(undefined);

    render(
      <ManageCollaboratorsDialog
        open
        onOpenChange={vi.fn()}
        myth={myth}
        canManage
        currentUserEmail="owner@example.com"
        onAddCollaborator={onAddCollaborator}
        onUpdateCollaboratorRole={onUpdateCollaboratorRole}
        onRemoveCollaborator={onRemoveCollaborator}
      />,
    );

    expect(screen.getByText(/share “fire theft”/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'helper@example.com');
    await user.click(screen.getByRole('button', { name: /add collaborator/i }));
    expect(onAddCollaborator).toHaveBeenCalledWith('myth-1', 'helper@example.com', 'viewer');

    const editorItem = screen.getByText('scribe@example.com').closest('li') as HTMLLIElement;
    const roleTrigger = within(editorItem).getByRole('combobox');
    await selectOption(user, roleTrigger, 'Viewer');
    expect(onUpdateCollaboratorRole).toHaveBeenCalledWith('collab-2', 'viewer');

    const removeButton = within(editorItem).getByRole('button', { hidden: true });
    await user.click(removeButton);
    expect(onRemoveCollaborator).toHaveBeenCalledWith('collab-2');

    expect(screen.queryByText(/unable to update role/i)).not.toBeInTheDocument();
  });

  test('shows errors when updates fail', async () => {
    const user = userEvent.setup();
    const myth = createMyth();

    render(
      <ManageCollaboratorsDialog
        open
        onOpenChange={vi.fn()}
        myth={myth}
        canManage
        currentUserEmail="owner@example.com"
        onAddCollaborator={vi.fn().mockRejectedValue(new Error('Unable to add collaborator.'))}
        onUpdateCollaboratorRole={vi.fn().mockRejectedValue(new Error('Unable to update role.'))}
        onRemoveCollaborator={vi
          .fn()
          .mockRejectedValue(new Error('Unable to remove collaborator.'))}
      />,
    );

    await user.type(screen.getByLabelText(/email/i), 'error@example.com');
    await user.click(screen.getByRole('button', { name: /add collaborator/i }));
    expect(await screen.findByText(/unable to add collaborator/i)).toBeInTheDocument();

    const editorItem = screen.getByText('scribe@example.com').closest('li') as HTMLLIElement;
    const roleTrigger = within(editorItem).getByRole('combobox');
    await selectOption(user, roleTrigger, 'Viewer');
    expect(await screen.findByText(/unable to update role/i)).toBeInTheDocument();

    const removeButton = within(editorItem).getByRole('button', { hidden: true });
    await user.click(removeButton);
    expect(await screen.findByText(/unable to remove collaborator/i)).toBeInTheDocument();
  });

  test('renders view-only message when user cannot manage', () => {
    const myth = createMyth({
      ownerId: 'owner-2',
      collaborators: [
        { id: 'collab-9', mythId: 'myth-1', email: 'owner@example.com', role: 'owner' },
      ],
    });

    render(
      <ManageCollaboratorsDialog
        open
        onOpenChange={vi.fn()}
        myth={myth}
        canManage={false}
        currentUserEmail="viewer@example.com"
        onAddCollaborator={vi.fn()}
        onUpdateCollaboratorRole={vi.fn()}
        onRemoveCollaborator={vi.fn()}
      />,
    );

    expect(screen.getByText(/only owners can manage collaborators/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });
});
