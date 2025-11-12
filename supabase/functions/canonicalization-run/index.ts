import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.48.0';

import { MatrixProvider } from '../_shared/canonicalization/matrixProvider.ts';
import { AgreementGraphRunner } from '../_shared/canonicalization/graphRunner.ts';
import { FactorizationRunner } from '../_shared/canonicalization/factorizationRunner.ts';
import { ConsensusRunner } from '../_shared/canonicalization/consensusRunner.ts';
import { HierarchicalRunner } from '../_shared/canonicalization/hierarchicalRunner.ts';
import {
  CanonicalizationOrchestrator,
} from '../_shared/canonicalization/orchestrator.ts';
import type {
  CanonicalizationMode,
  CanonicalizationParameters,
} from '../_shared/canonicalization/types.ts';
import type {
  CanonicalizationRunRecord,
  RunHistoryStore,
} from '../_shared/canonicalization/historyStore.ts';
import type {
  CollaboratorCategory,
  CollaboratorCategoryAssignment,
  PlotPoint,
} from '../_shared/canonicalization/mythTypes.ts';
import { corsHeaders } from '../_shared/cors.ts';

type CanonicalizationRequestBody = {
  mythId?: string;
  mode?: CanonicalizationMode;
  params?: CanonicalizationParameters;
};

type MythFolderRow = {
  id: string;
  user_id: string;
};

type VariantRow = { id: string };

type PlotPointRow = {
  id: string;
  variant_id: string;
  text: string;
  position: number | null;
  category: string | null;
  mytheme_refs: string[] | null;
  canonical_category_id: string | null;
};

type CollaboratorCategoryRow = {
  id: string;
  myth_id: string;
  collaborator_email: string | null;
  name: string;
};

type CollaboratorAssignmentRow = {
  plot_point_id: string;
  collaborator_category_id: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const jsonResponse = (body: Record<string, unknown> | string, status: number) => {
  const payload = typeof body === 'string' ? { error: body } : body;
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
};

class SupabaseRunHistoryStore implements RunHistoryStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly mythId: string,
    private readonly userId: string,
  ) {}

  async save(record: CanonicalizationRunRecord): Promise<void> {
    const { error } = await this.client
      .from('canonicalization_runs')
      .insert({
        id: record.id,
        myth_id: this.mythId,
        mode: record.mode,
        params: record.params ?? {},
        assignments: record.assignments ?? [],
        prevalence: record.prevalence ?? [],
        metrics: record.metrics ?? {},
        diagnostics: record.diagnostics ?? {},
        artifacts: record.artifacts ?? null,
        category_labels: record.categoryLabels ?? {},
        status: 'succeeded',
        created_by: this.userId,
      });

    if (error) {
      throw new Error(`Failed to persist canonicalization run: ${error.message}`);
    }
  }

  async list(): Promise<CanonicalizationRunRecord[]> {
    return [];
  }
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse('Method not allowed', 405);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer', '').trim();
  if (!token) {
    return jsonResponse('Missing Authorization header', 401);
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return jsonResponse('Unauthorized', 401);
  }

  let payload: CanonicalizationRequestBody;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse('Invalid JSON payload', 400);
  }

  const mythId = payload.mythId?.trim();
  if (!mythId) {
    return jsonResponse('mythId is required', 400);
  }

  const mode = (payload.mode ?? 'graph') as CanonicalizationMode;
  if (!['graph', 'factorization', 'consensus', 'hierarchical'].includes(mode)) {
    return jsonResponse('Unsupported algorithm mode', 400);
  }

  const paramsCandidate = payload.params ?? {};
  if (typeof paramsCandidate !== 'object' || Array.isArray(paramsCandidate)) {
    return jsonResponse('params must be an object', 400);
  }
  const params = paramsCandidate;

  const { data: mythRow, error: mythError } = await supabaseAdmin
    .from('myth_folders')
    .select('id, user_id')
    .eq('id', mythId)
    .maybeSingle();

  if (mythError) {
    return jsonResponse(`Failed to load myth: ${mythError.message}`, 500);
  }

  if (!mythRow) {
    return jsonResponse('Myth not found', 404);
  }

  if (mythRow.user_id !== user.id) {
    return jsonResponse('Only the myth owner can run canonicalization', 403);
  }

  const { data: variantRows, error: variantError } = await supabaseAdmin
    .from('myth_variants')
    .select('id')
    .eq('myth_id', mythId);

  if (variantError) {
    return jsonResponse(`Failed to load variants: ${variantError.message}`, 500);
  }

  const variantIds = (variantRows as VariantRow[] | null)?.map((row) => row.id) ?? [];
  if (variantIds.length === 0) {
    return jsonResponse('Add at least one variant with plot points before canonicalizing.', 400);
  }

  const { data: plotPointRows, error: plotPointError } = await supabaseAdmin
    .from('myth_plot_points')
    .select('id, variant_id, text, position, category, mytheme_refs, canonical_category_id')
    .in('variant_id', variantIds);

  if (plotPointError) {
    return jsonResponse(`Failed to load plot points: ${plotPointError.message}`, 500);
  }

  const plotPointsData = (plotPointRows as PlotPointRow[] | null) ?? [];
  if (plotPointsData.length === 0) {
    return jsonResponse('Add at least one plot point before canonicalizing.', 400);
  }

  const { data: collaboratorCategoryRows, error: collaboratorCategoryError } = await supabaseAdmin
    .from('myth_collaborator_categories')
    .select('id, myth_id, collaborator_email, name')
    .eq('myth_id', mythId);

  if (collaboratorCategoryError) {
    return jsonResponse(
      `Failed to load collaborator categories: ${collaboratorCategoryError.message}`,
      500,
    );
  }

  const collaboratorCategories: CollaboratorCategory[] =
    (collaboratorCategoryRows as CollaboratorCategoryRow[] | null)?.map((row) => ({
      id: row.id,
      mythId: row.myth_id,
      collaboratorEmail: (row.collaborator_email ?? '').toLowerCase(),
      name: row.name,
    })) ?? [];

  const collaboratorCategoryIds = collaboratorCategories.map((row) => row.id);
  const collaboratorAssignments: CollaboratorAssignmentRow[] =
    collaboratorCategoryIds.length === 0
      ? []
      : (((await supabaseAdmin
          .from('myth_collaborator_plot_point_categories')
          .select('plot_point_id, collaborator_category_id')
          .in('collaborator_category_id', collaboratorCategoryIds)).data as CollaboratorAssignmentRow[] | null) ??
        []);

  if (collaboratorAssignments.length === 0) {
    return jsonResponse(
      'Add at least one collaborator category assignment before canonicalizing.',
      400,
    );
  }

  const assignmentsByPlotPoint = new Map<string, CollaboratorCategoryAssignment[]>();
  const collaboratorCategoryMap = new Map(
    collaboratorCategories.map((category) => [category.id, category]),
  );

  collaboratorAssignments.forEach((assignment) => {
    const category = collaboratorCategoryMap.get(assignment.collaborator_category_id);
    if (!category) return;

    const enriched: CollaboratorCategoryAssignment = {
      plotPointId: assignment.plot_point_id,
      collaboratorCategoryId: assignment.collaborator_category_id,
      collaboratorEmail: category.collaboratorEmail,
      categoryName: category.name,
    };

    const existing = assignmentsByPlotPoint.get(assignment.plot_point_id) ?? [];
    existing.push(enriched);
    assignmentsByPlotPoint.set(assignment.plot_point_id, existing);
  });

  const plotPoints: PlotPoint[] = plotPointsData.map((row) => ({
    id: row.id,
    text: row.text ?? '',
    order: row.position ?? 0,
    category: row.category ?? '',
    mythemeRefs: Array.isArray(row.mytheme_refs) ? row.mytheme_refs : [],
    canonicalCategoryId: row.canonical_category_id,
    collaboratorCategories: assignmentsByPlotPoint.get(row.id) ?? [],
  }));

  if (plotPoints.every((point) => (point.collaboratorCategories ?? []).length === 0)) {
    return jsonResponse(
      'No collaborator category data found for the selected myth.',
      400,
    );
  }

  const matrixProvider = new MatrixProvider(plotPoints);
  const historyStore = new SupabaseRunHistoryStore(supabaseAdmin, mythId, user.id);

  const orchestrator = new CanonicalizationOrchestrator({
    matrixProvider,
    plotPoints,
    collaboratorCategories,
    algorithms: {
      graph: new AgreementGraphRunner(),
      factorization: new FactorizationRunner(),
      consensus: new ConsensusRunner(),
      hierarchical: new HierarchicalRunner(),
    },
    historyStore,
    idFactory: () => crypto.randomUUID(),
  });

  try {
    const record = await orchestrator.run({
      mythId,
      mode,
      params,
    });

    const { error: updateError } = await supabaseAdmin
      .from('myth_folders')
      .update({ last_canonical_run_id: record.id })
      .eq('id', mythId);

    if (updateError) {
      return jsonResponse(
        `Run completed but failed to update myth metadata: ${updateError.message}`,
        500,
      );
    }

    return jsonResponse({ run: record }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown canonicalization error';
    await supabaseAdmin.from('canonicalization_runs').insert({
      myth_id: mythId,
      mode,
      params,
      status: 'failed',
      category_labels: {},
      error_message: message,
      created_by: user.id,
    });

    return jsonResponse(message, 500);
  }
});
