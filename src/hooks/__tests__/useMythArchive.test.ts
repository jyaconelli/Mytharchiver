import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMythArchive } from '../useMythArchive';
import { DEFAULT_CATEGORIES, type MythVariant } from '../../types/myth';

type QueryResult = { data: any; error: any };

const responseQueues: Record<string, QueryResult[]> = {};
const defaultSequences: Record<string, { results: QueryResult[]; index: number }> = {};

const enqueue = (table: string, result: QueryResult) => {
  if (!responseQueues[table]) {
    responseQueues[table] = [];
  }
  responseQueues[table].push(result);
};

const prependResult = (table: string, result: QueryResult) => {
  if (!responseQueues[table]) {
    responseQueues[table] = [];
  }
  responseQueues[table].unshift(result);
};

const overrideTableResults = (table: string, results: QueryResult | QueryResult[]) => {
  const list = Array.isArray(results) ? results : [results];
  responseQueues[table] = [];
  delete defaultSequences[table];
  list.forEach((item) => {
    registerDefault(table, item);
    enqueue(table, item);
  });
};

const registerDefault = (table: string, result: QueryResult) => {
  if (!defaultSequences[table]) {
    defaultSequences[table] = { results: [], index: 0 };
  }
  defaultSequences[table].results.push(cloneResult(result));
};

const cloneResult = (result: QueryResult): QueryResult => ({
  data: result.data && typeof result.data === 'object' ? JSON.parse(JSON.stringify(result.data)) : result.data,
  error: result.error && typeof result.error === 'object' ? JSON.parse(JSON.stringify(result.error)) : result.error,
});

const getFallback = (table: string): QueryResult | undefined => {
  const sequence = defaultSequences[table];
  if (!sequence || sequence.results.length === 0) {
    return undefined;
  }
  const result = cloneResult(sequence.results[sequence.index]);
  sequence.index = (sequence.index + 1) % sequence.results.length;
  return result;
};

const supabaseStub = {
  auth: {
    signOut: vi.fn(),
  },
  from: vi.fn((table: string) => {
    const queue = responseQueues[table];
    if (!queue || queue.length === 0) {
      const fallback = getFallback(table);
      if (fallback) {
        return createThenable(fallback);
      }
      throw new Error(`Unexpected query for table ${table}`);
    }
    const result = queue.shift()!;
    return createThenable(result);
  }),
};

vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => supabaseStub,
}));

const createSession = () =>
  ({
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      user_metadata: {
        display_name: 'Owner One',
        avatar_url: 'owner.png',
      },
    },
  }) as any;

describe('useMythArchive', () => {
  beforeEach(() => {
    supabaseStub.from.mockClear();

    Object.keys(responseQueues).forEach((key) => delete responseQueues[key]);
    Object.keys(defaultSequences).forEach((key) => delete defaultSequences[key]);

    const ownedMyths = {
      data: [
        {
          id: 'myth-1',
          name: 'Fire Theft',
          description: 'story',
          contributor_instructions: '',
          variants: [],
          user_id: 'user-1',
          categories: [],
        },
      ],
      error: null,
    };
    enqueue('myth_folders', ownedMyths);
    registerDefault('myth_folders', ownedMyths);

    const collaboratorLinks = { data: [], error: null };
    const collaboratorList = {
      data: [
        {
          id: 'collab-1',
          myth_id: 'myth-1',
          email: 'scribe@example.com',
          role: 'editor',
        },
      ],
      error: null,
    };
    enqueue('myth_collaborators', collaboratorLinks);
    enqueue('myth_collaborators', collaboratorList);
    registerDefault('myth_collaborators', collaboratorLinks);
    registerDefault('myth_collaborators', collaboratorList);

    const mythemes = { data: [], error: null };
    enqueue('mythemes', mythemes);
    registerDefault('mythemes', mythemes);

    const profileSettings = { data: { categories: ['Legacy'] }, error: null };
    enqueue('profile_settings', profileSettings);
    registerDefault('profile_settings', profileSettings);

    const mythVariants = {
      data: [
        {
          id: 'variant-1',
          myth_id: 'myth-1',
          name: 'Variant A',
          source: 'Source',
          sort_order: 0,
          created_at: '2024-01-01',
        },
      ],
      error: null,
    };
    enqueue('myth_variants', mythVariants);
    registerDefault('myth_variants', mythVariants);

    const plotPoints = {
      data: [
        {
          id: 'point-1',
          variant_id: 'variant-1',
          position: 1,
          text: 'Intro',
          category: 'Legacy',
          mytheme_refs: [],
          canonical_category_id: null,
        },
      ],
      error: null,
    };
    enqueue('myth_plot_points', plotPoints);
    registerDefault('myth_plot_points', plotPoints);

    const mythCategories = {
      data: [{ id: 'cat-1', myth_id: 'myth-1', name: 'Hero', sort_order: 0 }],
      error: null,
    };
    enqueue('myth_categories', mythCategories);
    registerDefault('myth_categories', mythCategories);

    const mythPlotPointCategories = { data: [], error: null };
    enqueue('myth_plot_point_categories', mythPlotPointCategories);
    registerDefault('myth_plot_point_categories', mythPlotPointCategories);

    const collaboratorCategories = { data: [], error: null };
    enqueue('myth_collaborator_categories', collaboratorCategories);
    registerDefault('myth_collaborator_categories', collaboratorCategories);

    const collaboratorPlotPointCategories = { data: [], error: null };
    enqueue('myth_collaborator_plot_point_categories', collaboratorPlotPointCategories);
    registerDefault('myth_collaborator_plot_point_categories', collaboratorPlotPointCategories);

    const profiles = {
      data: [
        {
          id: 'profile-scribe',
          email: 'scribe@example.com',
          display_name: 'Scribe Syd',
          avatar_url: 'scribe.png',
        },
        {
          id: 'profile-owner',
          email: 'owner@example.com',
          display_name: 'Owner One',
          avatar_url: 'owner.png',
        },
      ],
      error: null,
    };
    enqueue('profiles', profiles);
    registerDefault('profiles', profiles);
  });

  const renderArchive = (email = 'owner@example.com') => {
    const hook = renderHook(
      ({ session }) => useMythArchive(session, email),
      { initialProps: { session: null }, legacyRoot: true },
    );

    return {
      ...hook,
      activateSession: (session = createSession()) => hook.rerender({ session }),
    };
  };

  it('loads myths, variants, and collaborator profiles', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    const myth = result.current.myths[0];
    expect(myth.name).toBe('Fire Theft');
    expect(myth.variants[0].plotPoints[0].text).toBe('Intro');

    const collaboratorDetails = myth.collaborators.find(
      (c) => c.email === 'scribe@example.com',
    );
    expect(collaboratorDetails?.displayName).toBe('Scribe Syd');
    expect(collaboratorDetails?.avatarUrl).toBe('scribe.png');
  });

  it('adds a myth with canonical categories', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    enqueue('myth_folders', {
      data: {
        id: 'myth-2',
        name: 'Sky Birth',
        description: 'origin story',
        variants: [],
        user_id: 'user-1',
        categories: [],
      },
      error: null,
    });

    enqueue('myth_collaborators', {
      data: {
        id: 'collab-owner',
        myth_id: 'myth-2',
        email: 'owner@example.com',
        role: 'owner',
      },
      error: null,
    });

    enqueue('myth_categories', {
      data: DEFAULT_CATEGORIES.map((name, index) => ({
        id: `cat-new-${index}`,
        myth_id: 'myth-2',
        name,
        sort_order: index,
      })),
      error: null,
    });

    await act(async () => {
      await result.current.addMyth('Sky Birth', 'origin story');
    });

    await waitFor(() => expect(result.current.myths.length).toBe(2));

    const created = result.current.myths.find((myth) => myth.id === 'myth-2');
    expect(created?.canonicalCategories.map((category) => category.name)).toEqual(
      DEFAULT_CATEGORIES,
    );
    const owner = created?.collaborators.find((collaborator) => collaborator.email === 'owner@example.com');
    expect(owner?.role).toBe('owner');
  });

  it('adds and updates variants', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    enqueue('myth_variants', {
      data: {
        id: 'variant-2',
        myth_id: 'myth-1',
        name: 'Variant B',
        source: 'Book',
        sort_order: 1,
      },
      error: null,
    });

    await act(async () => {
      await result.current.addVariant('myth-1', 'Variant B', 'Book');
    });

    await waitFor(() => expect(result.current.myths[0].variants.length).toBe(2));

    const originalVariant = result.current.myths[0].variants.find(
      (variant) => variant.id === 'variant-1',
    ) as MythVariant;

    const variantToUpdate: MythVariant = {
      ...originalVariant,
      name: 'Variant A Revised',
      source: 'Updated Source',
      plotPoints: [
        {
          id: 'point-new-1',
          text: 'Updated Intro',
          order: 0,
          category: 'Hero',
          canonicalCategoryId: 'cat-1',
          mythemeRefs: ['theme-1', ''],
          collaboratorCategories: [
            {
              plotPointId: 'point-new-1',
              collaboratorCategoryId: undefined,
              collaboratorEmail: 'SCRIBE@example.com',
              categoryName: 'Annotation',
            },
          ],
        },
      ],
    };

    enqueue('myth_collaborator_categories', {
      data: {
        id: 'col-cat-1',
        myth_id: 'myth-1',
        collaborator_email: 'scribe@example.com',
        name: 'Annotation',
      },
      error: null,
    });

    enqueue('myth_variants', { data: null, error: null });
    enqueue('myth_plot_points', { data: [{ id: 'point-1' }], error: null });
    enqueue('myth_plot_points', { data: null, error: null });
    enqueue('myth_plot_points', { data: null, error: null });
    enqueue('myth_plot_point_categories', { data: null, error: null });
    enqueue('myth_collaborator_plot_point_categories', { data: null, error: null });
    enqueue('myth_plot_point_categories', { data: null, error: null });
    enqueue('myth_collaborator_plot_point_categories', { data: null, error: null });

    await act(async () => {
      await result.current.updateVariant('myth-1', variantToUpdate);
    });

    await waitFor(() =>
      expect(
        result.current.myths[0].variants.find((variant) => variant.id === 'variant-1')?.plotPoints
          .length,
      ).toBe(1),
    );

    const updatedVariant = result.current.myths[0].variants.find(
      (variant) => variant.id === 'variant-1',
    );

    expect(updatedVariant?.plotPoints[0].order).toBe(1);
    expect(updatedVariant?.plotPoints[0].canonicalCategoryId).toBe('cat-1');
    expect(
      updatedVariant?.plotPoints[0].collaboratorCategories?.[0].collaboratorCategoryId,
    ).toBe('col-cat-1');
    expect(
      result.current.myths[0].collaboratorCategories?.some(
        (category) => category.id === 'col-cat-1',
      ),
    ).toBe(true);
  });

  it('orders relational variants by sort order and created date', async () => {
    overrideTableResults('myth_variants', {
      data: [
        {
          id: 'variant-alpha',
          myth_id: 'myth-1',
          name: 'Variant Alpha',
          source: 'Scroll',
          sort_order: null,
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 'variant-beta',
          myth_id: 'myth-1',
          name: 'Variant Beta',
          source: 'Tablet',
          sort_order: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    });

    overrideTableResults('myth_plot_points', {
      data: [
        {
          id: 'plot-alpha-1',
          variant_id: 'variant-alpha',
          position: null,
          text: null,
          category: null,
          canonical_category_id: null,
          mytheme_refs: ['spark', '', null],
        },
        {
          id: 'plot-beta-1',
          variant_id: 'variant-beta',
          position: 2,
          text: 'Journey',
          category: 'Hero',
          canonical_category_id: 'cat-1',
          mytheme_refs: ['torch'],
        },
      ],
      error: null,
    });

    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));
    await waitFor(() => expect(result.current.myths[0].variants.length).toBe(2));

    const [firstVariant, secondVariant] = result.current.myths[0].variants;

    expect(firstVariant.id).toBe('variant-beta');
    expect(secondVariant.id).toBe('variant-alpha');
    expect(secondVariant.plotPoints[0].order).toBe(1);
    expect(secondVariant.plotPoints[0].mythemeRefs).toEqual(['spark']);
  });

  it('manages mythemes', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    enqueue('mythemes', {
      data: { id: 'theme-1', name: 'Phoenix', type: 'character' },
      error: null,
    });

    await act(async () => {
      await result.current.addMytheme('Phoenix', 'character');
    });

    await waitFor(() => expect(result.current.mythemes.length).toBe(1));

    enqueue('mythemes', { data: null, error: null });

    await act(async () => {
      await result.current.deleteMytheme('theme-1');
    });

    await waitFor(() => expect(result.current.mythemes.length).toBe(0));
  });

  it('updates canonical categories', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    enqueue('myth_categories', { data: null, error: null });
    enqueue('myth_categories', { data: null, error: null });
    enqueue('myth_categories', {
      data: [{ id: 'cat-legend', myth_id: 'myth-1', name: 'Legend', sort_order: 0 }],
      error: null,
    });
    enqueue('myth_folders', { data: null, error: null });

    await act(async () => {
      await result.current.updateMythCategories('myth-1', ['Legend']);
    });

    await waitFor(() =>
      expect(result.current.myths[0].canonicalCategories.map((category) => category.name)).toEqual([
        'Legend',
      ]),
    );

    enqueue('myth_categories', { data: null, error: null });
    enqueue('myth_categories', { data: null, error: null });
    enqueue('myth_categories', {
      data: [
        { id: 'cat-legend', myth_id: 'myth-1', name: 'Legend', sort_order: 0 },
        { id: 'cat-hero', myth_id: 'myth-1', name: 'Hero', sort_order: 1 },
      ],
      error: null,
    });
    enqueue('myth_folders', { data: null, error: null });

    await act(async () => {
      await result.current.updateMythCategories('myth-1', ['Legend', 'Hero']);
    });

    await waitFor(() =>
      expect(result.current.myths[0].canonicalCategories.map((category) => category.name)).toEqual([
        'Legend',
        'Hero',
      ]),
    );

    const plotPoint = result.current.myths[0].variants[0].plotPoints[0];
    expect(plotPoint.canonicalCategoryId).toBeNull();
  });

  it('manages collaborators', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    enqueue('myth_collaborators', {
      data: {
        id: 'collab-new',
        myth_id: 'myth-1',
        email: 'new@example.com',
        role: 'viewer',
      },
      error: null,
    });
    enqueue('profiles', {
      data: {
        id: 'profile-new',
        email: 'new@example.com',
        display_name: 'New Person',
        avatar_url: 'new.png',
      },
      error: null,
    });
    enqueue('myth_collaborators', {
      data: {
        id: 'collab-new',
        myth_id: 'myth-1',
        email: 'new@example.com',
        role: 'editor',
      },
      error: null,
    });
    enqueue('myth_collaborators', { data: { myth_id: 'myth-1', id: 'collab-new' }, error: null });

    await act(async () => {
      await result.current.addCollaborator('myth-1', 'New@example.com', 'viewer');
    });

    await waitFor(() =>
      expect(result.current.myths[0].collaborators.some((collaborator) => collaborator.id === 'collab-new')).toBe(true),
    );

    await act(async () => {
      await result.current.updateCollaboratorRole('collab-new', 'editor');
    });

    await waitFor(() =>
      expect(
        result.current.myths[0].collaborators.find((collaborator) => collaborator.id === 'collab-new')
          ?.role,
      ).toBe('editor'),
    );

    await act(async () => {
      await result.current.removeCollaborator('collab-new');
    });

    await waitFor(() =>
      expect(
        result.current.myths[0].collaborators.some((collaborator) => collaborator.id === 'collab-new'),
      ).toBe(false),
    );
  });

  it('prevents adding duplicate collaborators', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    await expect(
      result.current.addCollaborator('myth-1', 'SCRIBE@example.com', 'viewer'),
    ).rejects.toThrow('This collaborator has already been added.');
  });

  it('surfaces collaborator insert errors', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    prependResult('myth_collaborators', { data: null, error: { message: 'insert failed' } });

    await expect(
      result.current.addCollaborator('myth-1', 'new@example.com', 'viewer'),
    ).rejects.toThrow('insert failed');
  });

  it('surfaces collaborator profile lookup errors', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    prependResult('myth_collaborators', {
      data: {
        id: 'collab-profile-error',
        myth_id: 'myth-1',
        email: 'profile@example.com',
        role: 'viewer',
      },
      error: null,
    });

    prependResult('profiles', {
      data: null,
      error: { code: '999', message: 'profile lookup failed' },
    });

    await expect(
      result.current.addCollaborator('myth-1', 'profile@example.com', 'viewer'),
    ).rejects.toThrow('profile lookup failed');
  });

  it('surfaces collaborator role update errors', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    prependResult('myth_collaborators', { data: null, error: { message: 'update failed' } });

    await expect(result.current.updateCollaboratorRole('collab-1', 'viewer')).rejects.toThrow(
      'update failed',
    );
  });

  it('surfaces collaborator removal errors', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    prependResult('myth_collaborators', { data: null, error: { message: 'delete failed' } });

    await expect(result.current.removeCollaborator('collab-1')).rejects.toThrow('delete failed');
  });

  it('requires a session to create collaborator categories', async () => {
    const { result } = renderArchive();

    await expect(
      result.current.createCollaboratorCategory('myth-1', 'Notes'),
    ).rejects.toThrow('You must be signed in to create categories.');
  });

  it('requires non-empty collaborator category names', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await expect(
      result.current.createCollaboratorCategory('myth-1', '   '),
    ).rejects.toThrow('Category name is required.');
  });

  it('requires an existing myth when creating collaborator categories', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await expect(
      result.current.createCollaboratorCategory('missing-myth', 'Notes'),
    ).rejects.toThrow('Myth not found.');
  });

  it('surfaces collaborator category fetch errors after unique violations', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    prependResult('myth_collaborator_categories', {
      data: null,
      error: { data: null, code: 'fetchErr', message: 'fetch failed' },
    });

    prependResult('myth_collaborator_categories', {
      data: null,
      error: { code: '23505', message: 'duplicate category' },
    });

    await expect(
      result.current.createCollaboratorCategory('myth-1', 'Notes'),
    ).rejects.toThrow('fetch failed');
  });

  it('surfaces collaborator category insert errors', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    prependResult('myth_collaborator_categories', {
      data: null,
      error: { code: '999', message: 'insert category failed' },
    });

    await expect(
      result.current.createCollaboratorCategory('myth-1', 'Notes'),
    ).rejects.toThrow('insert category failed');
  });

  it('creates collaborator categories and handles duplicates', async () => {
    const { result, activateSession } = renderArchive();

    await act(async () => {
      activateSession();
    });

    await waitFor(() => expect(result.current.myths.length).toBe(1));

    enqueue('myth_collaborator_categories', {
      data: {
        id: 'owner-cat-1',
        myth_id: 'myth-1',
        collaborator_email: 'owner@example.com',
        name: 'Notes',
      },
      error: null,
    });

    let createdCategory: any;
    await act(async () => {
      createdCategory = await result.current.createCollaboratorCategory('myth-1', 'Notes');
    });

    expect(createdCategory?.id).toBe('owner-cat-1');
    expect(
      result.current.myths[0].collaboratorCategories?.some(
        (category) => category.id === 'owner-cat-1',
      ),
    ).toBe(true);

    await act(async () => {
      const existing = await result.current.createCollaboratorCategory('myth-1', 'Notes');
      expect(existing?.id).toBe('owner-cat-1');
    });

    enqueue('myth_collaborator_categories', {
      data: null,
      error: { code: '23505', message: 'duplicate category' },
    });

    enqueue('myth_collaborator_categories', {
      data: {
        id: 'owner-cat-existing',
        myth_id: 'myth-1',
        collaborator_email: 'owner@example.com',
        name: 'Insights',
      },
      error: null,
    });

    let duplicateCategory: any;
    await act(async () => {
      duplicateCategory = await result.current.createCollaboratorCategory('myth-1', 'Insights');
    });

    expect(duplicateCategory?.id).toBe('owner-cat-existing');
    expect(
      result.current.myths[0].collaboratorCategories?.some(
        (category) => category.id === 'owner-cat-existing',
      ),
    ).toBe(true);
  });
});

function createThenable(result: QueryResult) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    upsert: () => chain,
    maybeSingle: () => result,
    single: () => result,
    then: (resolve: (value: QueryResult) => void) => Promise.resolve(result).then(resolve),
    catch: (handler: (error: unknown) => void) =>
      Promise.resolve(result).catch(handler),
  };
  return chain;
}
