import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import {
  Myth,
  MythVariant,
  Mytheme,
  DEFAULT_CATEGORIES,
  MythCollaborator,
  CollaboratorRole,
} from './types/myth';
import { MythList } from './components/MythList';
import { VariantSelector } from './components/VariantSelector';
import { VariantView } from './components/VariantView';
import { AddMythDialog } from './components/AddMythDialog';
import { AddVariantDialog } from './components/AddVariantDialog';
import { AddMythemeDialog } from './components/AddMythemeDialog';
import { ManageCategoriesDialog } from './components/ManageCategoriesDialog';
import { ManageMythemesDialog } from './components/ManageMythemesDialog';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { ArrowLeft, Book, Loader2, LogOut, Settings, Users } from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { ManageCollaboratorsDialog } from './components/ManageCollaboratorsDialog';

type MythRow = {
  id: string;
  name: string | null;
  description: string | null;
  variants: MythVariant[] | null;
  user_id: string;
};

type CollaboratorRow = {
  id: string;
  myth_id: string;
  email: string | null;
  role: CollaboratorRole;
};

type MythemeRow = {
  id: string;
  name: string;
  type: 'character' | 'event' | 'place' | 'object';
};

type ProfileSettingsRow = {
  categories: string[] | null;
};

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseMythRow = (row: MythRow): Myth => ({
  id: row.id,
  name: row.name ?? '',
  description: row.description ?? '',
  variants: Array.isArray(row.variants) ? row.variants : [],
  ownerId: row.user_id,
  collaborators: [],
});

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [myths, setMyths] = useState<Myth[]>([]);
  const [mythemes, setMythemes] = useState<Mytheme[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedMythId, setSelectedMythId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Dialog states
  const [showAddMyth, setShowAddMyth] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddMytheme, setShowAddMytheme] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageMythemes, setShowManageMythemes] = useState(false);
  const [manageCollaboratorsMythId, setManageCollaboratorsMythId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadArchiveData = useCallback(async () => {
    if (!session) {
      return;
    }

    setDataLoading(true);
    setDataError(null);

    try {
      const normalizedEmail = session.user.email?.toLowerCase() ?? null;

      const ownedMythsQuery = supabase
        .from('myth_folders')
        .select('id, name, description, variants, user_id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      const collaboratorLinksQuery = normalizedEmail
        ? supabase
            .from('myth_collaborators')
            .select('myth_id')
            .eq('email', normalizedEmail)
        : Promise.resolve({ data: [], error: null } as {
            data: { myth_id: string }[];
            error: null;
          });

      const mythemesQuery = supabase
        .from('mythemes')
        .select('id, name, type')
        .eq('user_id', session.user.id)
        .order('name');

      const settingsQuery = supabase
        .from('profile_settings')
        .select('categories')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const [ownedMythsResult, collaboratorLinksResult, mythemesResult, settingsResult] =
        await Promise.all([
          ownedMythsQuery,
          collaboratorLinksQuery,
          mythemesQuery,
          settingsQuery,
        ]);

      if (ownedMythsResult.error) throw ownedMythsResult.error;
      const collaboratorLinksData = collaboratorLinksResult as {
        data: { myth_id: string }[] | null;
        error: { message: string; code: string } | null;
      };
      if (collaboratorLinksData.error) {
        throw collaboratorLinksData.error;
      }
      if (mythemesResult.error) throw mythemesResult.error;
      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }

      const ownedMythRows = (ownedMythsResult.data as MythRow[] | null) ?? [];
      const collaboratorMythIds = collaboratorLinksData.data?.map(link => link.myth_id) ?? [];

      let collaboratorMythRows: MythRow[] = [];
      if (collaboratorMythIds.length > 0) {
        const collaboratorMythsResult = await supabase
          .from('myth_folders')
          .select('id, name, description, variants, user_id')
          .in('id', collaboratorMythIds)
          .order('created_at', { ascending: true });

        if (collaboratorMythsResult.error && collaboratorMythsResult.error.code !== 'PGRST116') {
          throw collaboratorMythsResult.error;
        }
        collaboratorMythRows = (collaboratorMythsResult.data as MythRow[] | null) ?? [];
      }

      const allMythRowsMap = new Map<string, MythRow>();
      ownedMythRows.forEach(row => {
        allMythRowsMap.set(row.id, row);
      });
      collaboratorMythRows.forEach(row => {
        if (!allMythRowsMap.has(row.id)) {
          allMythRowsMap.set(row.id, row);
        }
      });

      const allMythRows = Array.from(allMythRowsMap.values());
      const mythIds = allMythRows.map(row => row.id);

      let collaboratorRows: CollaboratorRow[] = [];
      if (mythIds.length > 0) {
        const collaboratorListResult = await supabase
          .from('myth_collaborators')
          .select('id, myth_id, email, role')
          .in('myth_id', mythIds)
          .order('created_at', { ascending: true });

        if (collaboratorListResult.error && collaboratorListResult.error.code !== 'PGRST116') {
          throw collaboratorListResult.error;
        }

        collaboratorRows = (collaboratorListResult.data as CollaboratorRow[] | null) ?? [];
      }

      const collaboratorsByMyth = new Map<string, MythCollaborator[]>();
      collaboratorRows.forEach(row => {
        const collaborator: MythCollaborator = {
          id: row.id,
          mythId: row.myth_id,
          email: (row.email ?? '').toLowerCase(),
          role: row.role,
        };
        const existing = collaboratorsByMyth.get(row.myth_id) ?? [];
        existing.push(collaborator);
        collaboratorsByMyth.set(row.myth_id, existing);
      });

      const mythemeRows = (mythemesResult.data as MythemeRow[] | null) ?? [];
      const categoriesValue =
        (settingsResult.data as ProfileSettingsRow | null)?.categories ?? null;

      const finalMyths = allMythRows.map(row => {
        const myth = parseMythRow(row);
        myth.collaborators = collaboratorsByMyth.get(row.id) ?? [];
        return myth;
      });

      setMyths(finalMyths);
      setMythemes(mythemeRows);
      setCategories(
        Array.isArray(categoriesValue) && categoriesValue.length > 0
          ? categoriesValue
          : DEFAULT_CATEGORIES
      );
      setSelectedMythId(null);
      setSelectedVariantId(null);
    } catch (error) {
      console.error(error);
      setDataError(
        error instanceof Error ? error.message : 'Unable to load your myth archive.'
      );
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setMyths([]);
      setMythemes([]);
      setCategories(DEFAULT_CATEGORIES);
      setSelectedMythId(null);
      setSelectedVariantId(null);
      return;
    }

    loadArchiveData();
  }, [session, loadArchiveData]);

  const sessionUserId = session?.user.id ?? '';
  const currentUserEmail = session?.user.email?.toLowerCase() ?? '';
  const selectedMyth = useMemo(
    () => myths.find(m => m.id === selectedMythId) ?? null,
    [myths, selectedMythId]
  );
  const selectedMythRole = useMemo<CollaboratorRole | 'owner' | null>(() => {
    if (!selectedMyth) {
      return null;
    }
    if (selectedMyth.ownerId === sessionUserId) {
      return 'owner';
    }
    const collaborator = selectedMyth.collaborators.find(
      person => person.email === currentUserEmail
    );
    return collaborator?.role ?? null;
  }, [selectedMyth, sessionUserId, currentUserEmail]);
  const canEditSelectedMyth =
    selectedMythRole === 'owner' || selectedMythRole === 'editor';
  useEffect(() => {
    if (!canEditSelectedMyth) {
      setShowAddVariant(false);
    }
  }, [canEditSelectedMyth]);
  const selectedVariant = useMemo(
    () => selectedMyth?.variants.find(v => v.id === selectedVariantId) ?? null,
    [selectedMyth, selectedVariantId]
  );
  const manageCollaboratorsMyth = useMemo(
    () => myths.find(m => m.id === manageCollaboratorsMythId) ?? null,
    [myths, manageCollaboratorsMythId]
  );
  const selectedMythCollaboratorsForDisplay = useMemo(() => {
    if (!selectedMyth) {
      return [] as MythCollaborator[];
    }

    const collaborators = [...selectedMyth.collaborators];
    const hasOwnerEntry = collaborators.some(collaborator => collaborator.role === 'owner');

    if (!hasOwnerEntry && selectedMyth.ownerId === sessionUserId && currentUserEmail) {
      collaborators.push({
        id: `owner-${selectedMyth.id}`,
        mythId: selectedMyth.id,
        email: currentUserEmail,
        role: 'owner',
      });
    }

    const roleWeight: Record<CollaboratorRole, number> = {
      owner: 0,
      editor: 1,
      viewer: 2,
    };

    return collaborators.sort((a, b) => {
      const diff = roleWeight[a.role] - roleWeight[b.role];
      if (diff !== 0) {
        return diff;
      }
      return a.email.localeCompare(b.email);
    });
  }, [selectedMyth, sessionUserId, currentUserEmail]);

  useEffect(() => {
    if (!selectedMyth) {
      setSelectedVariantId(null);
    }
  }, [selectedMyth]);

  const handleSelectMyth = (mythId: string) => {
    setSelectedMythId(mythId);
    setSelectedVariantId(null);
  };

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const handleAddCollaborator = useCallback(
    async (mythId: string, email: string, role: CollaboratorRole) => {
      if (!session) {
        throw new Error('You must be signed in to manage collaborators.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Email is required.');
      }

      const myth = myths.find(m => m.id === mythId);
      if (!myth) {
        throw new Error('Myth not found.');
      }

      if (myth.collaborators.some(collaborator => collaborator.email === normalizedEmail)) {
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
      const collaborator: MythCollaborator = {
        id: collaboratorRow.id,
        mythId: collaboratorRow.myth_id,
        email: (collaboratorRow.email ?? '').toLowerCase(),
        role: collaboratorRow.role,
      };

      setMyths(prev =>
        prev.map(m =>
          m.id === mythId ? { ...m, collaborators: [...m.collaborators, collaborator] } : m
        )
      );
    },
    [session, myths]
  );

  const handleUpdateCollaboratorRole = useCallback(
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

      setMyths(prev =>
        prev.map(m =>
          m.id === updatedRow.myth_id
            ? {
                ...m,
                collaborators: m.collaborators.map(collaborator =>
                  collaborator.id === collaboratorId
                    ? { ...collaborator, role: updatedRow.role }
                    : collaborator
                ),
              }
            : m
        )
      );
    },
    []
  );

  const handleRemoveCollaborator = useCallback(async (collaboratorId: string) => {
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

    setMyths(prev =>
      prev.map(m =>
        m.id === removedRow.myth_id
          ? { ...m, collaborators: m.collaborators.filter(collaborator => collaborator.id !== collaboratorId) }
          : m
      )
    );
  }, []);

  const handleUpdateVariant = useCallback(
    async (updatedVariant: MythVariant) => {
      if (!session || !selectedMythId) {
        throw new Error('Select a myth before updating variants.');
      }

      const myth = myths.find(m => m.id === selectedMythId);
      if (!myth) {
        throw new Error('Selected myth could not be found.');
      }

      const isOwner = myth.ownerId === sessionUserId;
      const isEditor = myth.collaborators.some(
        collaborator => collaborator.email === currentUserEmail && collaborator.role !== 'viewer'
      );

      if (!isOwner && !isEditor) {
        throw new Error('You do not have permission to edit this myth.');
      }

      const updatedVariants = myth.variants.map(v =>
        v.id === updatedVariant.id ? updatedVariant : v
      );

      const { error } = await supabase
        .from('myth_folders')
        .update({ variants: updatedVariants })
        .eq('id', selectedMythId);

      if (error) {
        throw new Error(error.message);
      }

      setMyths(prevMyths =>
        prevMyths.map(m =>
          m.id === selectedMythId ? { ...m, variants: updatedVariants } : m
        )
      );
    },
    [session, selectedMythId, myths, sessionUserId, currentUserEmail]
  );

  const handleBack = () => {
    if (selectedVariantId) {
      setSelectedVariantId(null);
    } else if (selectedMythId) {
      setSelectedMythId(null);
    }
  };

  const handleAddMyth = useCallback(
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
          user_id: session.user.id,
        })
        .select('id, name, description, variants, user_id')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const mythRow = data as MythRow;
      const myth = parseMythRow(mythRow);

      let collaborators: MythCollaborator[] = [];

      if (currentUserEmail) {
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
            },
          ];
        }
      }

      myth.collaborators = collaborators;

      setMyths(prev => [...prev, myth]);
    },
    [session, currentUserEmail]
  );

  const handleAddVariant = useCallback(
    async (name: string, source: string) => {
      if (!session || !selectedMythId) {
        throw new Error('Select a myth before adding variants.');
      }

      const myth = myths.find(m => m.id === selectedMythId);
      if (!myth) {
        throw new Error('Selected myth could not be found.');
      }

       const isOwner = myth.ownerId === sessionUserId;
       const isEditor = myth.collaborators.some(
         collaborator => collaborator.email === currentUserEmail && collaborator.role !== 'viewer'
       );

       if (!isOwner && !isEditor) {
         throw new Error('You do not have permission to modify this myth.');
       }

      const newVariant: MythVariant = {
        id: createLocalId(),
        name,
        source,
        plotPoints: [],
      };

      const updatedVariants = [...myth.variants, newVariant];

      const { error } = await supabase
        .from('myth_folders')
        .update({ variants: updatedVariants })
        .eq('id', selectedMythId);

      if (error) {
        throw new Error(error.message);
      }

      setMyths(prevMyths =>
        prevMyths.map(m =>
          m.id === selectedMythId ? { ...m, variants: updatedVariants } : m
        )
      );
    },
    [session, selectedMythId, myths, sessionUserId, currentUserEmail]
  );

  const handleAddMytheme = useCallback(
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

      setMythemes(prev => [...prev, data as MythemeRow]);
    },
    [session]
  );

  const handleDeleteMytheme = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('mythemes').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      setMythemes(prev => prev.filter(m => m.id !== id));
    },
    []
  );

  const handleUpdateCategories = useCallback(
    async (updatedCategories: string[]) => {
      if (!session) {
        throw new Error('You must be signed in to update categories.');
      }

      const previous = categories;
      setCategories(updatedCategories);

      const { error } = await supabase.from('profile_settings').upsert(
        {
          user_id: session.user.id,
          categories: updatedCategories,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        setCategories(previous);
        throw new Error(error.message);
      }
    },
    [session, categories]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-gray-600 dark:text-gray-400">Checking your session…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {(selectedMythId || selectedVariantId) && (
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-3">
                <Book className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h1>Myth Archive</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedVariant
                      ? `${selectedMyth?.name} / ${selectedVariant.name}`
                      : selectedMyth
                      ? selectedMyth.name
                      : 'Structural Taxonomy System'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentUserEmail && (
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {session?.user.user_metadata?.full_name ?? 'Signed in'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">{currentUserEmail}</p>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowManageCategories(true)}>
                    Manage Categories
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowManageMythemes(true)}>
                    Manage Mythemes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dataError ? (
          <div className="max-w-xl mx-auto">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/40">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
                Unable to load archive data
              </h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-200">{dataError}</p>
              <div className="mt-4 flex justify-end">
                <Button onClick={loadArchiveData} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {dataLoading && (
              <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing with Supabase…
              </div>
            )}
            {selectedMyth && (
              <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Collaborators
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedMythCollaboratorsForDisplay.length}{' '}
                      {selectedMythCollaboratorsForDisplay.length === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManageCollaboratorsMythId(selectedMyth.id)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {selectedMyth.ownerId === sessionUserId ? 'Manage' : 'View'}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedMythCollaboratorsForDisplay.length === 0 ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      No collaborators yet.
                    </span>
                  ) : (
                    selectedMythCollaboratorsForDisplay.map(collaborator => (
                      <Badge
                        key={collaborator.id}
                        variant="outline"
                        className="flex items-center gap-2 text-xs uppercase tracking-wide"
                      >
                        <span className="font-semibold">
                          {collaborator.role === 'owner'
                            ? 'Owner'
                            : collaborator.role.charAt(0).toUpperCase() + collaborator.role.slice(1)}
                        </span>
                        <span className="normal-case text-[0.7rem] text-gray-600 dark:text-gray-200">
                          {collaborator.email}
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
              </section>
            )}
            {!selectedMythId && (
              <div className="space-y-6">
                <div>
                  <h2>Myth Folders</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Each myth contains multiple variants with categorized plot points
                  </p>
                </div>
                <MythList
                  myths={myths}
                  selectedMythId={selectedMythId}
                  onSelectMyth={handleSelectMyth}
                  onAddMyth={() => setShowAddMyth(true)}
                />
              </div>
            )}

            {selectedMythId && !selectedVariantId && selectedMyth && (
              <div className="space-y-6">
                <div>
                  <h2>{selectedMyth.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {selectedMyth.description}
                  </p>
                </div>
                <VariantSelector
                  variants={selectedMyth.variants}
                  selectedVariantId={selectedVariantId}
                  onSelectVariant={handleSelectVariant}
                  onAddVariant={
                    canEditSelectedMyth ? () => setShowAddVariant(true) : undefined
                  }
                  canEdit={canEditSelectedMyth}
                />
              </div>
            )}

            {selectedVariantId && selectedVariant && (
              <VariantView
                variant={selectedVariant}
                mythemes={mythemes}
                categories={categories}
                onUpdateVariant={handleUpdateVariant}
                canEdit={canEditSelectedMyth}
              />
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      <AddMythDialog
        open={showAddMyth}
        onOpenChange={setShowAddMyth}
        onAdd={handleAddMyth}
      />
      <AddVariantDialog
        open={showAddVariant}
        onOpenChange={setShowAddVariant}
        onAdd={handleAddVariant}
      />
      <AddMythemeDialog
        open={showAddMytheme}
        onOpenChange={setShowAddMytheme}
        onAdd={handleAddMytheme}
      />
      <ManageCategoriesDialog
        open={showManageCategories}
        onOpenChange={setShowManageCategories}
        categories={categories}
        onUpdateCategories={handleUpdateCategories}
      />
      <ManageMythemesDialog
        open={showManageMythemes}
        onOpenChange={setShowManageMythemes}
        mythemes={mythemes}
        onDelete={handleDeleteMytheme}
        onAdd={() => {
          setShowManageMythemes(false);
          setShowAddMytheme(true);
        }}
      />
      <ManageCollaboratorsDialog
        open={Boolean(manageCollaboratorsMyth)}
        onOpenChange={(open) => {
          if (!open) {
            setManageCollaboratorsMythId(null);
          }
        }}
        myth={manageCollaboratorsMyth}
        canManage={
          manageCollaboratorsMyth ? manageCollaboratorsMyth.ownerId === sessionUserId : false
        }
        currentUserEmail={currentUserEmail}
        onAddCollaborator={handleAddCollaborator}
        onUpdateCollaboratorRole={handleUpdateCollaboratorRole}
        onRemoveCollaborator={handleRemoveCollaborator}
      />

      {/* Footer with legend */}
      {selectedVariantId && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category, index) => {
                    const colors = [
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                    ];
                    const colorClass = colors[index % colors.length];
                    return (
                      <span key={category} className={`px-3 py-1 rounded-full ${colorClass}`}>
                        {category}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="mb-3">Mytheme References</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="inline-block px-1 mx-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                    Highlighted terms
                  </span>{' '}
                  in plot points are tagged mythemes (canonical characters, events, places, or objects)
                </p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
