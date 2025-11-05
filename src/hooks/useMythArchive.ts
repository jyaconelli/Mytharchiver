import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabaseClient';
import {
  CollaboratorCategory,
  CollaboratorCategoryAssignment,
  CollaboratorRole,
  DEFAULT_CATEGORIES,
  Myth,
  MythCategory,
  MythCollaborator,
  MythVariant,
  Mytheme,
  PlotPoint,
} from '../types/myth';

type MythRow = {
  id: string;
  name: string | null;
  description: string | null;
  variants: MythVariant[] | null;
  user_id: string;
  categories: string[] | null;
};

type CollaboratorRow = {
  id: string;
  myth_id: string;
  email: string | null;
  role: CollaboratorRole;
};

type UserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type MythemeRow = {
  id: string;
  name: string;
  type: 'character' | 'event' | 'place' | 'object';
};

type ProfileSettingsRow = {
  categories: string[] | null;
};

type MythCategoryRow = {
  id: string;
  myth_id: string;
  name: string;
  sort_order: number | null;
};

type PlotPointCategoryRow = {
  plot_point_id: string;
  category_id: string;
};

type CollaboratorCategoryRow = {
  id: string;
  myth_id: string;
  collaborator_email: string;
  name: string;
};

type CollaboratorPlotPointCategoryRow = {
  plot_point_id: string;
  collaborator_category_id: string;
};

type MythVariantRow = {
  id: string;
  myth_id: string;
  name: string;
  source: string;
  sort_order: number | null;
  created_at: string;
};

type PlotPointRow = {
  id: string;
  variant_id: string;
  position: number | null;
  text: string | null;
  category: string | null;
  canonical_category_id: string | null;
  mytheme_refs: string[] | null;
};

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeEmail = (value: string | null | undefined) => (value ?? '').toLowerCase();

const parseMythRow = (row: MythRow): Myth => ({
  id: row.id,
  name: row.name ?? '',
  description: row.description ?? '',
  variants: Array.isArray(row.variants) ? row.variants : [],
  categories:
    Array.isArray(row.categories) && row.categories.length > 0
      ? row.categories
      : [...DEFAULT_CATEGORIES],
  ownerId: row.user_id,
  collaborators: [],
  canonicalCategories: [],
  collaboratorCategories: [],
});

type PostgrestErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

const createSupabaseError = (context: string, error: PostgrestErrorLike) => {
  const segments = [
    error.message,
    error.details,
    error.hint,
    error.code ? `code: ${error.code}` : null,
  ].filter(Boolean);
  const description = segments.length > 0 ? segments.join(' | ') : 'Unknown error';
  const enriched = new Error(`${context} failed: ${description}`);
  (enriched as any).cause = error;
  return enriched;
};

export function useMythArchive(session: Session | null, currentUserEmail: string) {
  const supabase = getSupabaseClient();
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [myths, setMyths] = useState<Myth[]>([]);
  const [mythemes, setMythemes] = useState<Mytheme[]>([]);

  const loadArchiveData = useCallback(async () => {
    if (!session) {
      return;
    }

    setDataLoading(true);
    setDataError(null);

    let lastStep = 'start';
    try {
      lastStep = 'normalizing session email';
      const normalizedEmail = session.user.email?.toLowerCase() ?? null;

      lastStep = 'loading owned myths';
      const ownedMythsResult = await supabase
        .from('myth_folders')
        .select('id, name, description, variants, user_id, categories')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (ownedMythsResult.error) {
        throw createSupabaseError('myth_folders (owned myths)', ownedMythsResult.error);
      }

      let collaboratorLinksResult:
        | { data: { myth_id: string }[] | null; error: { message: string; code: string } | null }
        | { data: { myth_id: string }[]; error: null };

      if (normalizedEmail) {
        lastStep = 'loading collaborator links';
        collaboratorLinksResult = (await supabase
          .from('myth_collaborators')
          .select('myth_id')
          .eq('email', normalizedEmail)) as typeof collaboratorLinksResult;

        if (collaboratorLinksResult.error) {
          throw createSupabaseError(
            'myth_collaborators (collaborator links)',
            collaboratorLinksResult.error,
          );
        }
      } else {
        collaboratorLinksResult = { data: [], error: null };
      }

      lastStep = 'loading mythemes';
      const mythemesResult = await supabase
        .from('mythemes')
        .select('id, name, type')
        .eq('user_id', session.user.id)
        .order('name');

      if (mythemesResult.error) {
        throw createSupabaseError('mythemes', mythemesResult.error);
      }

      lastStep = 'loading profile settings';
      const settingsResult = await supabase
        .from('profile_settings')
        .select('categories')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw createSupabaseError('profile_settings', settingsResult.error);
      }

      const ownedMythRows = (ownedMythsResult.data as MythRow[] | null) ?? [];
      const collaboratorMythIds =
        collaboratorLinksResult.data?.map((link) => link.myth_id) ?? [];

      let collaboratorMythRows: MythRow[] = [];
      if (collaboratorMythIds.length > 0) {
        lastStep = 'loading collaborator myths';
        const collaboratorMythsResult = await supabase
          .from('myth_folders')
          .select('id, name, description, variants, user_id, categories')
          .in('id', collaboratorMythIds)
          .order('created_at', { ascending: true });

        if (collaboratorMythsResult.error && collaboratorMythsResult.error.code !== 'PGRST116') {
          throw createSupabaseError(
            'myth_folders (collaborator myths)',
            collaboratorMythsResult.error,
          );
        }
        collaboratorMythRows = (collaboratorMythsResult.data as MythRow[] | null) ?? [];
      }

      const allMythRowsMap = new Map<string, MythRow>();
      ownedMythRows.forEach((row) => {
        allMythRowsMap.set(row.id, row);
      });
      collaboratorMythRows.forEach((row) => {
        if (!allMythRowsMap.has(row.id)) {
          allMythRowsMap.set(row.id, row);
        }
      });

      const mythIds = Array.from(allMythRowsMap.keys());

      let variantRows: MythVariantRow[] = [];
      if (mythIds.length > 0) {
        lastStep = 'loading myth variants';
        const { data, error } = await supabase
          .from('myth_variants')
          .select('id, myth_id, name, source, sort_order, created_at')
          .in('myth_id', mythIds)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });

        if (error && error.code !== 'PGRST116') {
          throw createSupabaseError('myth_variants', error);
        }
        variantRows = (data as MythVariantRow[] | null) ?? [];
      }

      const variantIds = variantRows.map((row) => row.id);

      let plotPointRows: PlotPointRow[] = [];
      if (variantIds.length > 0) {
        lastStep = 'loading plot points';
        const { data, error } = await supabase
          .from('myth_plot_points')
          .select('id, variant_id, position, text, category, canonical_category_id, mytheme_refs')
          .in('variant_id', variantIds)
          .order('position', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });

        if (error && error.code !== 'PGRST116') {
          throw createSupabaseError('myth_plot_points', error);
        }
        plotPointRows = (data as PlotPointRow[] | null) ?? [];
      }

      const plotPointsByVariant = new Map<string, PlotPoint[]>();
      plotPointRows.forEach((row) => {
        const sanitizedRefs = Array.isArray(row.mytheme_refs) ? row.mytheme_refs.filter(Boolean) : [];
        const plotPoint: PlotPoint = {
          id: row.id,
          text: row.text ?? '',
          order:
            typeof row.position === 'number' && Number.isFinite(row.position)
              ? row.position
              : 0,
          mythemeRefs: sanitizedRefs,
          category: row.category ?? '',
          canonicalCategoryId: row.canonical_category_id ?? null,
          collaboratorCategories: [],
        };
        const existing = plotPointsByVariant.get(row.variant_id) ?? [];
        existing.push(plotPoint);
        plotPointsByVariant.set(row.variant_id, existing);
      });

      const variantsByMyth = new Map<string, MythVariant[]>();
      const variantEntriesByMyth = new Map<
        string,
        { sortOrder: number; createdAt: string; variant: MythVariant }[]
      >();

      variantRows.forEach((row) => {
        const plotPoints = (plotPointsByVariant.get(row.id) ?? []).sort((a, b) => a.order - b.order);
        plotPoints.forEach((point, index) => {
          if (!Number.isFinite(point.order) || point.order <= 0) {
            point.order = index + 1;
          }
        });

        const variant: MythVariant = {
          id: row.id,
          name: row.name ?? '',
          source: row.source ?? '',
          plotPoints,
        };

        const entry = {
          sortOrder: row.sort_order ?? Number.MAX_SAFE_INTEGER,
          createdAt: row.created_at,
          variant,
        };
        const existing = variantEntriesByMyth.get(row.myth_id) ?? [];
        existing.push(entry);
        variantEntriesByMyth.set(row.myth_id, existing);
      });

      variantEntriesByMyth.forEach((entries, mythId) => {
        entries.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.createdAt.localeCompare(b.createdAt);
        });
        variantsByMyth.set(
          mythId,
          entries.map((entry) => ({
            ...entry.variant,
            plotPoints: entry.variant.plotPoints.map((point, index) => ({
              ...point,
              order: Number.isFinite(point.order) && point.order > 0 ? point.order : index + 1,
            })),
          })),
        );
      });

      let collaboratorRows: CollaboratorRow[] = [];
      if (mythIds.length > 0) {
        lastStep = 'loading collaborator list';
        const collaboratorListResult = await supabase
          .from('myth_collaborators')
          .select('id, myth_id, email, role')
          .in('myth_id', mythIds)
          .order('created_at', { ascending: true });

        if (collaboratorListResult.error && collaboratorListResult.error.code !== 'PGRST116') {
          throw createSupabaseError('myth_collaborators (list)', collaboratorListResult.error);
        }

        collaboratorRows = (collaboratorListResult.data as CollaboratorRow[] | null) ?? [];
      }

      const collaboratorEmails = new Set<string>();
      collaboratorRows.forEach((row) => {
        if (row.email) {
          collaboratorEmails.add(row.email.toLowerCase());
        }
      });
      if (currentUserEmail) {
        collaboratorEmails.add(currentUserEmail);
      }

      const profileMap = new Map<string, { displayName: string | null; avatarUrl: string | null }>();
      if (collaboratorEmails.size > 0) {
        try {
          lastStep = 'loading collaborator profiles';
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, display_name, avatar_url')
            .in('email', Array.from(collaboratorEmails));

          if (profileError && profileError.code !== 'PGRST116') {
            throw createSupabaseError('profiles', profileError);
          }

          (profileData as UserProfileRow[] | null)?.forEach((profile) => {
            const email = (profile.email ?? '').toLowerCase();
            if (!email) return;
            profileMap.set(email, {
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
            });
          });
        } catch (profileFetchError) {
          console.warn('Unable to load collaborator profile metadata', profileFetchError);
        }
      }
      if (currentUserEmail && !profileMap.has(currentUserEmail)) {
        const metadata = session?.user?.user_metadata ?? {};
        profileMap.set(currentUserEmail, {
          displayName:
            (metadata.display_name as string | undefined) ??
            (metadata.full_name as string | undefined) ??
            (metadata.name as string | undefined) ??
            null,
          avatarUrl:
            (metadata.avatar_url as string | undefined) ??
            (metadata.picture as string | undefined) ??
            null,
        });
      }

      const collaboratorsByMyth = new Map<string, MythCollaborator[]>();
      collaboratorRows.forEach((row) => {
        const collaborator: MythCollaborator = {
          id: row.id,
          mythId: row.myth_id,
          email: (row.email ?? '').toLowerCase(),
          role: row.role,
          displayName: profileMap.get((row.email ?? '').toLowerCase())?.displayName ?? null,
          avatarUrl: profileMap.get((row.email ?? '').toLowerCase())?.avatarUrl ?? null,
        };
        const existing = collaboratorsByMyth.get(row.myth_id) ?? [];
        existing.push(collaborator);
        collaboratorsByMyth.set(row.myth_id, existing);
      });

      const mythemeRows = (mythemesResult.data as MythemeRow[] | null) ?? [];
      const categoriesValue =
        (settingsResult.data as ProfileSettingsRow | null)?.categories ?? null;

      const finalMyths = Array.from(allMythRowsMap.values()).map((row) => {
        const myth = parseMythRow(row);
        myth.collaborators = collaboratorsByMyth.get(row.id) ?? [];
        const relationalVariants = variantsByMyth.get(row.id);
        if (relationalVariants && relationalVariants.length > 0) {
          myth.variants = relationalVariants.map((variant) => ({
            ...variant,
            plotPoints: variant.plotPoints.map((point) => ({ ...point })),
          }));
        }
        if (
          myth.categories.length === 0 &&
          Array.isArray(categoriesValue) &&
          categoriesValue.length > 0
        ) {
          myth.categories = [...categoriesValue];
        }
        return myth;
      });

      const mythIdsList = finalMyths.map((myth) => myth.id);
      const plotPointIdSet = new Set<string>();
      finalMyths.forEach((myth) => {
        myth.variants.forEach((variant) => {
          variant.plotPoints.forEach((point) => {
            plotPointIdSet.add(point.id);
          });
        });
      });
      const allPlotPointIds = Array.from(plotPointIdSet);

      let canonicalCategoryRows: MythCategoryRow[] = [];
      if (mythIdsList.length > 0) {
        lastStep = 'loading canonical categories';
        const { data, error } = await supabase
          .from('myth_categories')
          .select('id, myth_id, name, sort_order')
          .in('myth_id', mythIdsList)
          .order('sort_order', { ascending: true });
        if (error) {
          throw createSupabaseError('myth_categories', error);
        }
        canonicalCategoryRows = (data as MythCategoryRow[]) ?? [];
      }

      let canonicalAssignmentRows: PlotPointCategoryRow[] = [];
      if (allPlotPointIds.length > 0) {
        lastStep = 'loading canonical assignments';
        const { data, error } = await supabase
          .from('myth_plot_point_categories')
          .select('plot_point_id, category_id')
          .in('plot_point_id', allPlotPointIds);
        if (error) {
          throw createSupabaseError('myth_plot_point_categories', error);
        }
        canonicalAssignmentRows = (data as PlotPointCategoryRow[]) ?? [];
      }

      let collaboratorCategoryRows: CollaboratorCategoryRow[] = [];
      if (mythIdsList.length > 0) {
        lastStep = 'loading collaborator categories';
        const { data, error } = await supabase
          .from('myth_collaborator_categories')
          .select('id, myth_id, collaborator_email, name')
          .in('myth_id', mythIdsList);
        if (error) {
          throw createSupabaseError('myth_collaborator_categories', error);
        }
        collaboratorCategoryRows = (data as CollaboratorCategoryRow[]) ?? [];
      }

      let collaboratorAssignmentRows: CollaboratorPlotPointCategoryRow[] = [];
      const collaboratorCategoryIds = collaboratorCategoryRows.map((row) => row.id);
      if (collaboratorCategoryIds.length > 0) {
        lastStep = 'loading collaborator category assignments';
        const { data, error } = await supabase
          .from('myth_collaborator_plot_point_categories')
          .select('plot_point_id, collaborator_category_id')
          .in('collaborator_category_id', collaboratorCategoryIds);
        if (error) {
          throw createSupabaseError(
            'myth_collaborator_plot_point_categories',
            error,
          );
        }
        collaboratorAssignmentRows =
          (data as CollaboratorPlotPointCategoryRow[]) ?? [];
      }

      const canonicalCategoriesByMyth = new Map<string, MythCategory[]>();
      const canonicalCategoryById = new Map<string, MythCategory>();
      canonicalCategoryRows.forEach((row) => {
        const category: MythCategory = {
          id: row.id,
          mythId: row.myth_id,
          name: row.name,
          sortOrder: row.sort_order ?? 0,
        };
        const existing = canonicalCategoriesByMyth.get(row.myth_id) ?? [];
        existing.push(category);
        canonicalCategoriesByMyth.set(row.myth_id, existing);
        canonicalCategoryById.set(category.id, category);
      });
      canonicalCategoriesByMyth.forEach((categories, mythId) => {
        canonicalCategoriesByMyth.set(
          mythId,
          categories.sort((a, b) => a.sortOrder - b.sortOrder),
        );
      });

      const canonicalCategoryIdByPlotPoint = new Map<string, string>();
      canonicalAssignmentRows.forEach((row) => {
        canonicalCategoryIdByPlotPoint.set(row.plot_point_id, row.category_id);
      });

      const collaboratorCategoriesByMyth = new Map<string, CollaboratorCategory[]>();
      const collaboratorCategoryById = new Map<string, CollaboratorCategory>();
      collaboratorCategoryRows.forEach((row) => {
        const category: CollaboratorCategory = {
          id: row.id,
          mythId: row.myth_id,
          collaboratorEmail: (row.collaborator_email ?? '').toLowerCase(),
          name: row.name,
        };
        const existing = collaboratorCategoriesByMyth.get(row.myth_id) ?? [];
        existing.push(category);
        collaboratorCategoriesByMyth.set(row.myth_id, existing);
        collaboratorCategoryById.set(category.id, category);
      });

      const collaboratorAssignmentsByPlotPoint = new Map<
        string,
        CollaboratorCategoryAssignment[]
      >();
      collaboratorAssignmentRows.forEach((row) => {
        const category = collaboratorCategoryById.get(row.collaborator_category_id);
        if (!category) {
          return;
        }
        const assignment: CollaboratorCategoryAssignment = {
          plotPointId: row.plot_point_id,
          collaboratorCategoryId: row.collaborator_category_id,
          collaboratorEmail: category.collaboratorEmail,
          categoryName: category.name,
        };
        const existing = collaboratorAssignmentsByPlotPoint.get(row.plot_point_id) ?? [];
        existing.push(assignment);
        collaboratorAssignmentsByPlotPoint.set(row.plot_point_id, existing);
      });

      const enrichedMyths = finalMyths.map((myth) => {
        const canonicalCategories =
          canonicalCategoriesByMyth.get(myth.id) ?? myth.canonicalCategories ?? [];
        const canonicalNames = canonicalCategories.map((category) => category.name);
        const canonicalNameById = new Map(
          canonicalCategories.map((category) => [category.id, category.name]),
        );

        const collaboratorCategories =
          collaboratorCategoriesByMyth.get(myth.id) ?? myth.collaboratorCategories ?? [];

        const variants = myth.variants.map((variant) => {
          const plotPoints = variant.plotPoints.map((point) => {
            const canonicalCategoryId = canonicalCategoryIdByPlotPoint.get(point.id) ?? null;
            const collaboratorAssignments =
              collaboratorAssignmentsByPlotPoint.get(point.id) ?? [];

            const canonicalName = canonicalCategoryId
              ? canonicalNameById.get(canonicalCategoryId) ?? point.category
              : point.category;

            return {
              ...point,
              canonicalCategoryId,
              category: canonicalName,
              collaboratorCategories: collaboratorAssignments.map((assignment) => ({
                ...assignment,
              })),
            };
          });
          return {
            ...variant,
            plotPoints,
          };
        });

        return {
          ...myth,
          variants,
          categories: canonicalCategories.length > 0 ? canonicalNames : myth.categories,
          canonicalCategories,
          collaboratorCategories,
        };
      });

      setMyths(enrichedMyths);
      setMythemes(mythemeRows);
    } catch (error) {
      console.error(`loadArchiveData failed during step "${lastStep}"`, error);
      if (error instanceof Error && 'cause' in error) {
        const cause = (error as Error & { cause?: unknown }).cause;
        if (cause) {
          console.error('Supabase error cause:', cause);
        }
      }
      setDataError(error instanceof Error ? error.message : 'Unable to load your myth archive.');
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setMyths([]);
      setMythemes([]);
      setDataLoading(false);
      setDataError(null);
      return;
    }

    loadArchiveData();
  }, [session, loadArchiveData]);

  const addMyth = useCallback(
    async (name: string, description: string) => {
      if (!session) {
        throw new Error('You must be signed in to add myths.');
      }

      const { data, error } = await supabase
        .from('myth_folders')
        .insert({
          name,
          description,
          variants: [],
          categories: DEFAULT_CATEGORIES,
          user_id: session.user.id,
        })
        .select('id, name, description, variants, user_id')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const mythRow = data as MythRow;
      const myth = parseMythRow(mythRow);

      let collaborators: MythCollaborator[] = myth.collaborators;

      if (currentUserEmail) {
        const userMetadata = session.user.user_metadata ?? {};
        const displayName =
          (userMetadata.display_name as string | undefined) ??
          (userMetadata.full_name as string | undefined) ??
          (userMetadata.name as string | undefined) ??
          null;
        const avatarUrl =
          (userMetadata.avatar_url as string | undefined) ??
          (userMetadata.picture as string | undefined) ??
          null;

        const { data: ownerCollaboratorData, error: ownerCollaboratorError } = await supabase
          .from('myth_collaborators')
          .insert({
            myth_id: myth.id,
            email: currentUserEmail,
            role: 'owner',
          })
          .select('id, myth_id, email, role')
          .single();

        if (!ownerCollaboratorError && ownerCollaboratorData) {
          const ownerRow = ownerCollaboratorData as CollaboratorRow;
          collaborators = [
            {
              id: ownerRow.id,
              mythId: ownerRow.myth_id,
              email: (ownerRow.email ?? '').toLowerCase(),
              role: ownerRow.role,
              displayName,
              avatarUrl,
            },
          ];
        }
      }

      myth.collaborators = collaborators;
      const { data: insertedCategories, error: categoriesError } = await supabase
        .from('myth_categories')
        .insert(
          DEFAULT_CATEGORIES.map((name, index) => ({
            myth_id: myth.id,
            name,
            sort_order: index,
          })),
        )
        .select('id, myth_id, name, sort_order');

      if (categoriesError) {
        throw new Error(categoriesError.message);
      }

      const canonicalCategories =
        (insertedCategories as MythCategoryRow[] | null)?.map((row) => ({
          id: row.id,
          mythId: row.myth_id,
          name: row.name,
          sortOrder: row.sort_order ?? 0,
        })) ?? [];

      myth.canonicalCategories = canonicalCategories;
      myth.collaboratorCategories = [];
      myth.categories = canonicalCategories.map((category) => category.name);

      setMyths((prev) => [...prev, myth]);
    },
    [session, currentUserEmail],
  );

  const addVariant = useCallback(
    async (mythId: string, name: string, source: string) => {
      if (!session) {
        throw new Error('Select a myth before adding variants.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Selected myth could not be found.');
      }

      const newVariantId = createLocalId();
      const sortOrder = myth.variants.length;

      const { data, error } = await supabase
        .from('myth_variants')
        .insert({
          id: newVariantId,
          myth_id: mythId,
          name,
          source,
          sort_order: sortOrder,
        })
        .select('id, name, source, sort_order')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const row = data as MythVariantRow;
      const newVariant: MythVariant = {
        id: row.id,
        name: row.name ?? name,
        source: row.source ?? source,
        plotPoints: [],
      };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === mythId ? { ...m, variants: [...m.variants, newVariant] } : m,
        ),
      );
    },
    [session, myths, supabase],
  );

  const updateVariant = useCallback(
    async (mythId: string, updatedVariant: MythVariant) => {
      if (!session) {
        throw new Error('Select a myth before updating variants.');
      }

      const mythIndex = myths.findIndex((m) => m.id === mythId);
      if (mythIndex === -1) {
        throw new Error('Selected myth could not be found.');
      }

      const myth = myths[mythIndex];
      const canonicalCategories = myth.canonicalCategories ?? [];
      const canonicalById = new Map(canonicalCategories.map((category) => [category.id, category]));
      const canonicalByName = new Map(
        canonicalCategories.map((category) => [category.name.toLowerCase(), category]),
      );

      const existingCollaboratorCategories = [...(myth.collaboratorCategories ?? [])];
      const collaboratorCategoryCache = new Map<string, CollaboratorCategory>();

      const ensureCollaboratorCategory = async (
        collaboratorEmail: string,
        categoryName: string,
      ): Promise<CollaboratorCategory> => {
        const normalizedEmail = collaboratorEmail.toLowerCase();
        const normalizedName = categoryName.trim();
        const cacheKey = `${normalizedEmail}::${normalizedName.toLowerCase()}`;

        if (collaboratorCategoryCache.has(cacheKey)) {
          return collaboratorCategoryCache.get(cacheKey)!;
        }

        const existing =
          existingCollaboratorCategories.find(
            (category) =>
              category.collaboratorEmail === normalizedEmail &&
              category.name.toLowerCase() === normalizedName.toLowerCase(),
          ) ?? null;

        if (existing) {
          collaboratorCategoryCache.set(cacheKey, existing);
          return existing;
        }

        const { data, error } = await supabase
          .from('myth_collaborator_categories')
          .insert({
            myth_id: mythId,
            collaborator_email: normalizedEmail,
            name: normalizedName,
          })
          .select('id, myth_id, collaborator_email, name')
          .single();

        if (error) {
          if (error.code === '23505') {
            const { data: existingRow, error: fetchError } = await supabase
              .from('myth_collaborator_categories')
              .select('id, myth_id, collaborator_email, name')
              .eq('myth_id', mythId)
              .eq('collaborator_email', normalizedEmail)
              .eq('name', normalizedName)
              .maybeSingle();

            if (fetchError) {
              throw new Error(fetchError.message);
            }

            if (existingRow) {
              const existingCategory: CollaboratorCategory = {
                id: existingRow.id,
                mythId: existingRow.myth_id,
                collaboratorEmail: normalizeEmail(existingRow.collaborator_email),
                name: existingRow.name,
              };

              const alreadyTracked = existingCollaboratorCategories.some(
                (category) => category.id === existingCategory.id,
              );
              if (!alreadyTracked) {
                existingCollaboratorCategories.push(existingCategory);
              }
              collaboratorCategoryCache.set(cacheKey, existingCategory);
              return existingCategory;
            }
          }

          throw new Error(error.message);
        }

        const row = data as CollaboratorCategoryRow;
        const newCategory: CollaboratorCategory = {
          id: row.id,
          mythId: row.myth_id,
          collaboratorEmail: (row.collaborator_email ?? '').toLowerCase(),
          name: row.name,
        };

        existingCollaboratorCategories.push(newCategory);
        collaboratorCategoryCache.set(cacheKey, newCategory);
        return newCategory;
      };

      const fallbackEmail = normalizeEmail(currentUserEmail || session.user.email || '');
      const normalizedPlotPoints: PlotPoint[] = [];
      const plotPointRecords: {
        id: string;
        variant_id: string;
        position: number;
        text: string;
        category: string;
        mytheme_refs: string[];
        canonical_category_id: string | null;
      }[] = [];
      const canonicalInserts: { plot_point_id: string; category_id: string }[] = [];
      const collaboratorInserts: { plot_point_id: string; collaborator_category_id: string }[] = [];

      for (let index = 0; index < updatedVariant.plotPoints.length; index += 1) {
        const plotPoint = updatedVariant.plotPoints[index];
        const canonicalCategoryId =
          plotPoint.canonicalCategoryId ??
          (plotPoint.category
            ? canonicalByName.get(plotPoint.category.toLowerCase())?.id ?? null
            : null);

        const canonicalName =
          canonicalCategoryId !== null
            ? canonicalById.get(canonicalCategoryId)?.name ?? plotPoint.category ?? ''
            : plotPoint.category ?? '';

        const sanitizedOrder = index + 1;
        const sanitizedText = plotPoint.text ?? '';
        const sanitizedRefs = Array.isArray(plotPoint.mythemeRefs)
          ? plotPoint.mythemeRefs.filter(Boolean)
          : [];

        const collaboratorAssignments = plotPoint.collaboratorCategories ?? [];
        const normalizedAssignments: CollaboratorCategoryAssignment[] = [];

        for (const assignment of collaboratorAssignments) {
          const assignmentName = assignment.categoryName?.trim();
          if (!assignmentName) {
            continue;
          }

          const collaboratorEmail = normalizeEmail(assignment.collaboratorEmail ?? fallbackEmail);
          let categoryId = assignment.collaboratorCategoryId;

          if (!categoryId) {
            const ensured = await ensureCollaboratorCategory(collaboratorEmail, assignmentName);
            categoryId = ensured.id;
          } else {
            const exists = existingCollaboratorCategories.find((cat) => cat.id === categoryId);
            if (!exists) {
              const ensured = await ensureCollaboratorCategory(collaboratorEmail, assignmentName);
              categoryId = ensured.id;
            }
          }

          if (!categoryId) {
            continue;
          }

          const normalizedAssignment: CollaboratorCategoryAssignment = {
            plotPointId: plotPoint.id,
            collaboratorCategoryId: categoryId,
            collaboratorEmail,
            categoryName: assignmentName,
          };
          normalizedAssignments.push(normalizedAssignment);
          collaboratorInserts.push({
            plot_point_id: plotPoint.id,
            collaborator_category_id: normalizedAssignment.collaboratorCategoryId,
          });
        }

        normalizedPlotPoints.push({
          ...plotPoint,
          text: sanitizedText,
          order: sanitizedOrder,
          category: canonicalName,
          canonicalCategoryId,
          mythemeRefs: sanitizedRefs,
          collaboratorCategories: normalizedAssignments,
        });

        plotPointRecords.push({
          id: plotPoint.id,
          variant_id: updatedVariant.id,
          position: sanitizedOrder,
          text: sanitizedText,
          category: canonicalName,
          mytheme_refs: sanitizedRefs,
          canonical_category_id: canonicalCategoryId,
        });

        if (canonicalCategoryId) {
          canonicalInserts.push({
            plot_point_id: plotPoint.id,
            category_id: canonicalCategoryId,
          });
        }

      }

      const normalizedVariant: MythVariant = {
        ...updatedVariant,
        name: updatedVariant.name ?? '',
        source: updatedVariant.source ?? '',
        plotPoints: normalizedPlotPoints,
      };

      const { error: variantUpdateError } = await supabase
        .from('myth_variants')
        .update({
          name: normalizedVariant.name,
          source: normalizedVariant.source,
        })
        .eq('id', normalizedVariant.id);

      if (variantUpdateError) {
        throw new Error(variantUpdateError.message);
      }

      const {
        data: existingPlotPointRows,
        error: existingPlotPointError,
      } = await supabase
        .from('myth_plot_points')
        .select('id')
        .eq('variant_id', normalizedVariant.id);

      if (existingPlotPointError && existingPlotPointError.code !== 'PGRST116') {
        throw new Error(existingPlotPointError.message);
      }

      const existingIds = new Set(
        ((existingPlotPointRows as { id: string }[] | null) ?? []).map((row) => row.id),
      );
      const incomingIds = new Set(plotPointRecords.map((record) => record.id));
      const idsToDelete: string[] = [];
      existingIds.forEach((id) => {
        if (!incomingIds.has(id)) {
          idsToDelete.push(id);
        }
      });

      if (idsToDelete.length > 0) {
        const { error: deletePointsError } = await supabase
          .from('myth_plot_points')
          .delete()
          .in('id', idsToDelete);
        if (deletePointsError) {
          throw new Error(deletePointsError.message);
        }
      }

      if (plotPointRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('myth_plot_points')
          .upsert(plotPointRecords, { onConflict: 'id' });
        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      const cleanupIds = Array.from(new Set([...incomingIds, ...idsToDelete]));

      if (cleanupIds.length > 0) {
        const { error: deleteCanonicalError } = await supabase
          .from('myth_plot_point_categories')
          .delete()
          .in('plot_point_id', cleanupIds);

        if (deleteCanonicalError) {
          throw new Error(deleteCanonicalError.message);
        }

        const { error: deleteCollaboratorError } = await supabase
          .from('myth_collaborator_plot_point_categories')
          .delete()
          .in('plot_point_id', cleanupIds);

        if (deleteCollaboratorError) {
          throw new Error(deleteCollaboratorError.message);
        }
      }

      if (canonicalInserts.length > 0) {
        const { error: insertCanonicalError } = await supabase
          .from('myth_plot_point_categories')
          .insert(canonicalInserts);

        if (insertCanonicalError) {
          throw new Error(insertCanonicalError.message);
        }
      }

      if (collaboratorInserts.length > 0) {
        const { error: insertCollaboratorError } = await supabase
          .from('myth_collaborator_plot_point_categories')
          .insert(collaboratorInserts);

        if (insertCollaboratorError) {
          throw new Error(insertCollaboratorError.message);
        }
      }

      const updatedVariants = myth.variants.map((variant) =>
        variant.id === normalizedVariant.id ? normalizedVariant : variant,
      );

      const updatedMyth: Myth = {
        ...myth,
        variants: updatedVariants,
        collaboratorCategories: existingCollaboratorCategories,
      };

      setMyths((prev) =>
        prev.map((m) => (m.id === mythId ? updatedMyth : m)),
      );
    },
    [session, myths, supabase, currentUserEmail],
  );

  const addMytheme = useCallback(
    async (name: string, type: 'character' | 'event' | 'place' | 'object') => {
      if (!session) {
        throw new Error('You must be signed in to add mythemes.');
      }

      const { data, error } = await supabase
        .from('mythemes')
        .insert({
          name,
          type,
          user_id: session.user.id,
        })
        .select('id, name, type')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setMythemes((prev) => [...prev, data as MythemeRow]);
    },
    [session],
  );

  const deleteMytheme = useCallback(async (id: string) => {
    const { error } = await supabase.from('mythemes').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    setMythemes((prev) => prev.filter((mytheme) => mytheme.id !== id));
  }, []);

  const updateMythCategories = useCallback(
    async (mythId: string, updatedCategories: string[]) => {
      if (!session) {
        throw new Error('You must be signed in to update categories.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Myth not found.');
      }

      const normalizedNames = updatedCategories
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      const seenNames = new Set<string>();
      const uniqueNames = normalizedNames.filter((name) => {
        const lower = name.toLowerCase();
        if (seenNames.has(lower)) {
          return false;
        }
        seenNames.add(lower);
        return true;
      });

      const existingCategories = myth.canonicalCategories ?? [];
      const existingByName = new Map(
        existingCategories.map((category) => [category.name.toLowerCase(), category]),
      );

      const namesToKeep = new Set(uniqueNames.map((name) => name.toLowerCase()));
      const categoriesToDelete = existingCategories.filter(
        (category) => !namesToKeep.has(category.name.toLowerCase()),
      );

      if (categoriesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('myth_categories')
          .delete()
          .in(
            'id',
            categoriesToDelete.map((category) => category.id),
          );

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }

      for (let index = 0; index < uniqueNames.length; index += 1) {
        const name = uniqueNames[index];
        const lower = name.toLowerCase();
        const existing = existingByName.get(lower);

        if (existing) {
          const { error: updateError } = await supabase
            .from('myth_categories')
            .update({ name, sort_order: index })
            .eq('id', existing.id);

          if (updateError) {
            throw new Error(updateError.message);
          }
        } else {
          const { error: insertError } = await supabase.from('myth_categories').insert({
            myth_id: mythId,
            name,
            sort_order: index,
          });

          if (insertError) {
            throw new Error(insertError.message);
          }
        }
      }

      const { data: refreshedCategoriesData, error: refreshedCategoriesError } = await supabase
        .from('myth_categories')
        .select('id, myth_id, name, sort_order')
        .eq('myth_id', mythId)
        .order('sort_order', { ascending: true });

      if (refreshedCategoriesError) {
        throw new Error(refreshedCategoriesError.message);
      }

      const refreshedCategories =
        (refreshedCategoriesData as MythCategoryRow[] | null)?.map((row) => ({
          id: row.id,
          mythId: row.myth_id,
          name: row.name,
          sortOrder: row.sort_order ?? 0,
        })) ?? [];

      const canonicalNameById = new Map(
        refreshedCategories.map((category) => [category.id, category.name]),
      );

      await supabase
        .from('myth_folders')
        .update({ categories: refreshedCategories.map((category) => category.name) })
        .eq('id', mythId);

      setMyths((prev) =>
        prev.map((m) => {
          if (m.id !== mythId) {
            return m;
          }

          const variants = m.variants.map((variant) => {
            const plotPoints = variant.plotPoints.map((point) => {
              const canonicalCategoryId =
                point.canonicalCategoryId && canonicalNameById.has(point.canonicalCategoryId)
                  ? point.canonicalCategoryId
                  : null;
              const categoryName =
                canonicalCategoryId !== null
                  ? canonicalNameById.get(canonicalCategoryId) ?? point.category
                  : point.category;

              return {
                ...point,
                canonicalCategoryId,
                category: categoryName,
              };
            });

            return {
              ...variant,
              plotPoints,
            };
          });

          return {
            ...m,
            variants,
            canonicalCategories: refreshedCategories,
            categories: refreshedCategories.map((category) => category.name),
          };
        }),
      );
    },
    [session, myths],
  );

  const addCollaborator = useCallback(
    async (mythId: string, email: string, role: CollaboratorRole) => {
      if (!session) {
        throw new Error('You must be signed in to manage collaborators.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Email is required.');
      }

      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Myth not found.');
      }

      if (myth.collaborators.some((collaborator) => collaborator.email === normalizedEmail)) {
        throw new Error('This collaborator has already been added.');
      }

      const { data, error } = await supabase
        .from('myth_collaborators')
        .insert({
          myth_id: mythId,
          email: normalizedEmail,
          role,
        })
        .select('id, myth_id, email, role')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const collaboratorRow = data as CollaboratorRow;
      const profile = await supabase
        .from('profiles')
        .select('email, display_name, avatar_url')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile.error && profile.error.code !== 'PGRST116') {
        throw new Error(profile.error.message);
      }

      const collaborator: MythCollaborator = {
        id: collaboratorRow.id,
        mythId: collaboratorRow.myth_id,
        email: (collaboratorRow.email ?? '').toLowerCase(),
        role: collaboratorRow.role,
        displayName: profile.data?.display_name ?? null,
        avatarUrl: profile.data?.avatar_url ?? null,
      };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === mythId ? { ...m, collaborators: [...m.collaborators, collaborator] } : m,
        ),
      );
    },
    [session, myths],
  );

  const updateCollaboratorRole = useCallback(
    async (collaboratorId: string, role: CollaboratorRole) => {
      const { data, error } = await supabase
        .from('myth_collaborators')
        .update({ role })
        .eq('id', collaboratorId)
        .select('id, myth_id, email, role')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const updatedRow = data as CollaboratorRow;

      setMyths((prev) =>
        prev.map((m) =>
          m.id === updatedRow.myth_id
            ? {
                ...m,
                collaborators: m.collaborators.map((collaborator) =>
                  collaborator.id === collaboratorId
                    ? { ...collaborator, role: updatedRow.role }
                    : collaborator,
                ),
              }
            : m,
        ),
      );
    },
    [],
  );

  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    const { data, error } = await supabase
      .from('myth_collaborators')
      .delete()
      .eq('id', collaboratorId)
      .select('myth_id, id')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const removedRow = data as { myth_id: string };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === removedRow.myth_id
            ? { ...m, collaborators: m.collaborators.filter((c) => c.id !== collaboratorId) }
            : m,
      ),
    );
  }, []);

  const createCollaboratorCategory = useCallback(
    async (mythId: string, name: string) => {
      if (!session) {
        throw new Error('You must be signed in to create categories.');
      }

      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new Error('Category name is required.');
      }

      const normalizedEmail = currentUserEmail.toLowerCase();
      const myth = myths.find((m) => m.id === mythId);
      if (!myth) {
        throw new Error('Myth not found.');
      }

      const existing =
        myth.collaboratorCategories?.find(
          (category) =>
            category.collaboratorEmail === normalizedEmail &&
            category.name.toLowerCase() === normalizedName.toLowerCase(),
        ) ?? null;

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from('myth_collaborator_categories')
        .insert({
          myth_id: mythId,
          collaborator_email: normalizedEmail,
          name: normalizedName,
        })
        .select('id, myth_id, collaborator_email, name')
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existingRow, error: existingError } = await supabase
            .from('myth_collaborator_categories')
            .select('id, myth_id, collaborator_email, name')
            .eq('myth_id', mythId)
            .eq('collaborator_email', normalizedEmail)
            .eq('name', normalizedName)
            .maybeSingle();

          if (existingError) {
            throw new Error(existingError.message);
          }

          if (existingRow) {
            const existingCategory: CollaboratorCategory = {
              id: existingRow.id,
              mythId: existingRow.myth_id,
              collaboratorEmail: normalizeEmail(existingRow.collaborator_email),
              name: existingRow.name,
            };

            const hasCategory =
              myth.collaboratorCategories?.some((category) => category.id === existingCategory.id) ?? false;

            if (!hasCategory) {
              setMyths((prev) =>
                prev.map((m) =>
                  m.id === mythId
                    ? {
                        ...m,
                        collaboratorCategories: [...(m.collaboratorCategories ?? []), existingCategory],
                      }
                    : m,
                ),
              );
            }

            return existingCategory;
          }
        }

        throw new Error(error.message);
      }

      const row = data as CollaboratorCategoryRow;
      const newCategory: CollaboratorCategory = {
        id: row.id,
        mythId: row.myth_id,
        collaboratorEmail: (row.collaborator_email ?? '').toLowerCase(),
        name: row.name,
      };

      setMyths((prev) =>
        prev.map((m) =>
          m.id === mythId
            ? {
                ...m,
                collaboratorCategories: [...(m.collaboratorCategories ?? []), newCategory],
              }
            : m,
        ),
      );

      return newCategory;
    },
    [session, currentUserEmail, myths],
  );

  return {
    dataLoading,
    dataError,
    myths,
    mythemes,
    loadArchiveData,
    addMyth,
    addVariant,
    updateVariant,
    addMytheme,
    deleteMytheme,
    updateMythCategories,
    addCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
    createCollaboratorCategory,
  };
}
