import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as API from '../lib/supabase';
import {
  CollaboratorCategory,
  CollaboratorCategoryAssignment,
  DEFAULT_CATEGORIES,
  Myth,
  MythCategory,
  MythCollaborator,
  MythVariant,
  PlotPoint,
  VariantContributor,
  VariantContributorType,
} from '../types/myth';
import type {
  CollaboratorCategoryRow,
  CollaboratorPlotPointCategoryRow,
  MythCategoryRow,
  MythRow,
  MythVariantRow,
  PlotPointCategoryRow,
  ProfileSettingsRow,
} from '../lib/supabase/types';

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeEmail = (value: string | null | undefined) => (value ?? '').toLowerCase();

const parseMythRow = (row: MythRow): Myth => ({
  id: row.id,
  name: row.name ?? '',
  description: row.description ?? '',
  contributorInstructions: row.contributor_instructions ?? '',
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

const normalizeContributorType = (value: string | null | undefined): VariantContributorType => {
  if (value === 'owner' || value === 'collaborator' || value === 'invitee' || value === 'unknown') {
    return value;
  }
  return 'unknown';
};

const mapVariantContributor = (row: MythVariantRow): VariantContributor | null => {
  const email = row.contributor_email ? row.contributor_email.toLowerCase() : null;
  const name = row.contributor_name ?? null;
  const userId = row.created_by_user_id ?? null;
  const contributionRequestId = row.contribution_request_id ?? null;

  if (!email && !name && !userId && !contributionRequestId && !row.contributor_type) {
    return null;
  }

  return {
    type: normalizeContributorType(row.contributor_type),
    email,
    name,
    userId,
    contributionRequestId,
  };
};

export function useMythData(session: Session | null, currentUserEmail: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myths, setMyths] = useState<Myth[]>([]);

  const loadMyths = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = session.user.email?.toLowerCase() ?? null;
      const settingsResult = await API.fetchSettings(session.user.id);

      const ownedMythRows = await API.fetchOwnedMyths(session.user.id);
      const collaboratorLinks = normalizedEmail
        ? await API.fetchCollaboratorLinksByEmail(normalizedEmail)
        : [];
      const collaboratorMythIds = collaboratorLinks.map((link) => link.myth_id);
      const collaboratorMythRows = await API.fetchMythsByIds(collaboratorMythIds);

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

      const variantRows = await API.fetchVariantsByMythIds(mythIds);

      const variantIds = variantRows.map((row) => row.id);

      const plotPointRows = await API.fetchPlotPointsByVariantIds(variantIds);

      const plotPointsByVariant = new Map<string, PlotPoint[]>();
      plotPointRows.forEach((row) => {
        const sanitizedRefs = Array.isArray(row.mytheme_refs)
          ? row.mytheme_refs.filter(Boolean)
          : [];
        const plotPoint: PlotPoint = {
          id: row.id,
          text: row.text ?? '',
          order:
            typeof row.position === 'number' && Number.isFinite(row.position) ? row.position : 0,
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
        const plotPoints = (plotPointsByVariant.get(row.id) ?? []).sort(
          (a, b) => a.order - b.order,
        );
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
          contributor: mapVariantContributor(row),
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

      const collaboratorRows = await API.fetchCollaboratorsByMythIds(mythIds);

      const collaboratorEmails = new Set<string>();
      collaboratorRows.forEach((row) => {
        if (row.email) {
          collaboratorEmails.add(row.email.toLowerCase());
        }
      });
      if (currentUserEmail) {
        collaboratorEmails.add(currentUserEmail);
      }

      const profileMap = new Map<
        string,
        { displayName: string | null; avatarUrl: string | null }
      >();
      if (collaboratorEmails.size > 0) {
        try {
          const profileData = await API.fetchProfilesByEmails(Array.from(collaboratorEmails));
          profileData.forEach((profile) => {
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

      const categoriesValue =
        (settingsResult.data as ProfileSettingsRow | null)?.categories ?? null;

      const finalMyths = Array.from(allMythRowsMap.values()).map((row) => {
        const myth = parseMythRow(row);
        myth.collaborators = collaboratorsByMyth.get(row.id) ?? [];
        const relationalVariants = variantsByMyth.get(row.id);
        if (relationalVariants && relationalVariants.length > 0) {
          myth.variants = relationalVariants.map((variant) => {
            let contributor = variant.contributor ?? null;
            if (contributor) {
              const emailKey = contributor.email ?? '';
              const profile = emailKey ? profileMap.get(emailKey) : null;
              const resolvedName =
                contributor.name ?? profile?.displayName ?? contributor.email ?? null;
              const resolvedAvatar = contributor.avatarUrl ?? profile?.avatarUrl ?? null;

              if (resolvedName !== contributor.name || resolvedAvatar !== contributor.avatarUrl) {
                contributor = {
                  ...contributor,
                  name: resolvedName,
                  avatarUrl: resolvedAvatar,
                };
              }
            }

            return {
              ...variant,
              contributor,
              plotPoints: variant.plotPoints.map((point) => ({ ...point })),
            };
          });
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
        canonicalCategoryRows = await API.fetchMythCategoriesByMythIds(mythIdsList);
      }

      let canonicalAssignmentRows: PlotPointCategoryRow[] = [];
      if (allPlotPointIds.length > 0) {
        canonicalAssignmentRows =
          await API.fetchPlotPointCategoryAssignmentsByPlotPointIds(allPlotPointIds);
      }

      let collaboratorCategoryRows: CollaboratorCategoryRow[] = [];
      if (mythIdsList.length > 0) {
        collaboratorCategoryRows = await API.fetchCollaboratorCategoriesByMythIds(mythIdsList);
      }

      let collaboratorAssignmentRows: CollaboratorPlotPointCategoryRow[] = [];
      const collaboratorCategoryIds = collaboratorCategoryRows.map((row) => row.id);
      if (collaboratorCategoryIds.length > 0) {
        collaboratorAssignmentRows =
          await API.fetchCollaboratorPlotPointCategoryAssignmentsByCategoryIds(
            collaboratorCategoryIds,
          );
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
            const collaboratorAssignments = collaboratorAssignmentsByPlotPoint.get(point.id) ?? [];

            const canonicalName = canonicalCategoryId
              ? (canonicalNameById.get(canonicalCategoryId) ?? point.category)
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
    } catch (error) {
      if (error instanceof Error && 'cause' in error) {
        const cause = (error as Error & { cause?: unknown }).cause;
        if (cause) {
          console.error('Supabase error cause:', cause);
        }
      }
      setError(error instanceof Error ? error.message : 'Unable to load your myth archive.');
    } finally {
      setLoading(false);
    }
  }, [session, currentUserEmail]);

  useEffect(() => {
    if (!session) {
      setMyths([]);
      setLoading(false);
      setError(null);
      return;
    }

    loadMyths();
  }, [session, loadMyths]);

  const addMyth = useCallback(
    async (name: string, description: string, contributorInstructions = '') => {
      if (!session) {
        throw new Error('You must be signed in to add myths.');
      }

      const mythRow = await API.createMythFolder({
        name,
        description,
        contributorInstructions,
        categories: DEFAULT_CATEGORIES,
        userId: session.user.id,
      });
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

        const ownerCollaboratorRow = await API.insertMythCollaborator({
          mythId: myth.id,
          email: currentUserEmail,
          role: 'owner',
        });

        collaborators = [
          {
            id: ownerCollaboratorRow.id,
            mythId: ownerCollaboratorRow.myth_id,
            email: (ownerCollaboratorRow.email ?? '').toLowerCase(),
            role: ownerCollaboratorRow.role,
            displayName,
            avatarUrl,
          },
        ];
      }

      myth.collaborators = collaborators;
      const insertedCategories = await API.insertCanonicalCategories(myth.id, DEFAULT_CATEGORIES);

      const canonicalCategories =
        insertedCategories.map((row) => ({
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

      const contributorType: VariantContributorType =
        myth.ownerId === session.user.id ? 'owner' : 'collaborator';
      const contributorName =
        (session.user.user_metadata?.display_name as string | undefined) ??
        (session.user.user_metadata?.full_name as string | undefined) ??
        (session.user.user_metadata?.name as string | undefined) ??
        null;
      const normalizedContributorEmail =
        currentUserEmail?.trim() && currentUserEmail.length > 0
          ? currentUserEmail
          : (session.user.email?.toLowerCase() ?? null);

      const row = await API.insertVariant({
        id: newVariantId,
        mythId,
        name,
        source,
        sortOrder,
        createdByUserId: session.user.id,
        contributorEmail: normalizedContributorEmail,
        contributorName,
        contributorType,
      });

      const newVariant: MythVariant = {
        id: row.id,
        name: row.name ?? name,
        source: row.source ?? source,
        plotPoints: [],
        contributor: {
          type: (row.contributor_type as VariantContributorType | null) ?? contributorType,
          email: (row.contributor_email ?? normalizedContributorEmail ?? undefined)?.toLowerCase(),
          name: row.contributor_name ?? contributorName,
          userId: row.created_by_user_id ?? session.user.id,
          contributionRequestId: row.contribution_request_id ?? null,
        },
      };

      setMyths((prev) =>
        prev.map((m) => (m.id === mythId ? { ...m, variants: [...m.variants, newVariant] } : m)),
      );
    },
    [session, myths],
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

        const row = await API.ensureCollaboratorCategory(mythId, normalizedEmail, normalizedName);
        const newCategory: CollaboratorCategory = {
          id: row.id,
          mythId: row.myth_id,
          collaboratorEmail: (row.collaborator_email ?? '').toLowerCase(),
          name: row.name,
        };

        const alreadyTracked = existingCollaboratorCategories.some(
          (category) => category.id === newCategory.id,
        );
        if (!alreadyTracked) {
          existingCollaboratorCategories.push(newCategory);
        }
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
            ? (canonicalByName.get(plotPoint.category.toLowerCase())?.id ?? null)
            : null);

        const canonicalName =
          canonicalCategoryId !== null
            ? (canonicalById.get(canonicalCategoryId)?.name ?? plotPoint.category ?? '')
            : (plotPoint.category ?? '');

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

      await API.updateVariantMetadata(normalizedVariant.id, {
        name: normalizedVariant.name,
        source: normalizedVariant.source,
      });

      const existingIds = new Set(await API.fetchPlotPointIdsByVariantId(normalizedVariant.id));
      const incomingIds = new Set(plotPointRecords.map((record) => record.id));
      const idsToDelete: string[] = [];
      existingIds.forEach((id) => {
        if (!incomingIds.has(id)) {
          idsToDelete.push(id);
        }
      });

      if (idsToDelete.length > 0) {
        await API.deletePlotPointsByIds(idsToDelete);
      }

      if (plotPointRecords.length > 0) {
        await API.upsertPlotPoints(plotPointRecords);
      }

      const cleanupIds = Array.from(new Set([...incomingIds, ...idsToDelete]));

      if (cleanupIds.length > 0) {
        await API.deletePlotPointCategoryAssignmentsByPlotPointIds(cleanupIds);
        await API.deleteCollaboratorPlotPointCategoryAssignmentsByPlotPointIds(cleanupIds);
      }

      if (canonicalInserts.length > 0) {
        await API.insertPlotPointCategoryAssignments(canonicalInserts);
      }

      if (collaboratorInserts.length > 0) {
        await API.insertCollaboratorPlotPointCategoryAssignments(collaboratorInserts);
      }

      const updatedVariants = myth.variants.map((variant) =>
        variant.id === normalizedVariant.id ? normalizedVariant : variant,
      );

      const updatedMyth: Myth = {
        ...myth,
        variants: updatedVariants,
        collaboratorCategories: existingCollaboratorCategories,
      };

      setMyths((prev) => prev.map((m) => (m.id === mythId ? updatedMyth : m)));
    },
    [session, myths, currentUserEmail],
  );

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
        await API.deleteMythCategories(categoriesToDelete.map((category) => category.id));
      }

      for (let index = 0; index < uniqueNames.length; index += 1) {
        const name = uniqueNames[index];
        const lower = name.toLowerCase();
        const existing = existingByName.get(lower);

        if (existing) {
          await API.updateMythCategory(existing.id, name, index);
        } else {
          await API.insertMythCategory({ myth_id: mythId, name, sort_order: index });
        }
      }

      const refreshedCategories = await API.fetchCategoriesForMyth(mythId);
      const canonicalCategories: MythCategory[] = refreshedCategories.map((category) => ({
        id: category.id,
        mythId: category.myth_id,
        name: category.name,
        sortOrder: category.sort_order ?? 0,
      }));
      const canonicalNameById = new Map(
        canonicalCategories.map((category) => [category.id, category.name]),
      );

      await API.updateMythFolderCategories(
        mythId,
        refreshedCategories.map((category) => category.name),
      );

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
                  ? (canonicalNameById.get(canonicalCategoryId) ?? point.category)
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
            canonicalCategories,
            categories: canonicalCategories.map((category) => category.name),
          };
        }),
      );
    },
    [session, myths],
  );

  const updateContributorInstructions = useCallback(
    async (mythId: string, instructions: string) => {
      if (!session) {
        throw new Error('You must be signed in to update contributor instructions.');
      }

      await API.updateContributorInstructions(mythId, instructions);

      setMyths((prev) =>
        prev.map((myth) =>
          myth.id === mythId ? { ...myth, contributorInstructions: instructions } : myth,
        ),
      );
    },
    [session],
  );

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

      const row = await API.ensureCollaboratorCategory(mythId, normalizedEmail, normalizedName);
      const newCategory: CollaboratorCategory = {
        id: row.id,
        mythId: row.myth_id,
        collaboratorEmail: (row.collaborator_email ?? '').toLowerCase(),
        name: row.name,
      };

      setMyths((prev) =>
        prev.map((m) => {
          if (m.id !== mythId) {
            return m;
          }

          const hasCategory =
            (m.collaboratorCategories ?? []).some((category) => category.id === newCategory.id) ??
            false;

          if (hasCategory) {
            return m;
          }

          return {
            ...m,
            collaboratorCategories: [...(m.collaboratorCategories ?? []), newCategory],
          };
        }),
      );

      return newCategory;
    },
    [session, currentUserEmail, myths],
  );

  return {
    myths,
    loading,
    error,
    loadMyths,
    addMyth,
    addVariant,
    updateVariant,
    updateMythCategories,
    updateContributorInstructions,
    createCollaboratorCategory,
    setMyths,
  };
}
