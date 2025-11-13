import { MatrixProvider } from './matrixProvider.ts';
import { autoDetectCategoryCount } from './autoK.ts';
import type { AutoKDiagnostics } from './autoK.ts';
import type { AssignmentMatrixResult } from './canonicalMatrices.ts';
import type {
  CanonicalizationAlgorithm,
  CanonicalizationInput,
  CanonicalizationMode,
  CanonicalizationParameters,
  CanonicalizationResult,
} from './types.ts';
import type {
  CanonicalizationRunRecord,
  RunHistoryStore,
} from './historyStore.ts';

export interface CanonicalizationRunConfig<
  P extends CanonicalizationParameters = CanonicalizationParameters,
> {
  mythId: string;
  mode: CanonicalizationMode;
  params: P;
  metadata?: Record<string, unknown>;
}

interface OrchestratorDependencies {
  matrixProvider: MatrixProvider;
  plotPoints: CanonicalizationInput['plotPoints'];
  collaboratorCategories: CanonicalizationInput['collaboratorCategories'];
  algorithms: Record<CanonicalizationMode, CanonicalizationAlgorithm>;
  historyStore: RunHistoryStore;
  idFactory?: () => string;
  autoKResolver?: (assignment: AssignmentMatrixResult) => AutoKDiagnostics;
}

export class CanonicalizationOrchestrator {
  private readonly matrixProvider: MatrixProvider;

  private readonly plotPoints: CanonicalizationInput['plotPoints'];

  private readonly collaboratorCategories: CanonicalizationInput['collaboratorCategories'];

  private readonly algorithms: Record<
    CanonicalizationMode,
    CanonicalizationAlgorithm
  >;

  private readonly historyStore: RunHistoryStore;

  private readonly idFactory: () => string;

  private readonly autoKResolver: (assignment: AssignmentMatrixResult) => AutoKDiagnostics;

  constructor(deps: OrchestratorDependencies) {
    this.matrixProvider = deps.matrixProvider;
    this.plotPoints = deps.plotPoints;
    this.collaboratorCategories = deps.collaboratorCategories;
    this.algorithms = deps.algorithms;
    this.historyStore = deps.historyStore;
    this.idFactory =
      deps.idFactory ?? (() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    this.autoKResolver =
      deps.autoKResolver ?? ((assignment) => autoDetectCategoryCount({ assignment }));
  }

  async run<P extends CanonicalizationParameters>(
    config: CanonicalizationRunConfig<P>,
  ): Promise<CanonicalizationRunRecord> {
    const algorithm = this.algorithms[config.mode];
    if (!algorithm) {
      throw new Error(`No algorithm registered for mode ${config.mode}`);
    }

    const wantsAutoK = Boolean(config.params.useAutoK);
    const requiresAgreement = modeRequiresAgreement(config.mode);
    const matrices = this.matrixProvider.prepare(requiresAgreement || wantsAutoK);

    const resolvedParams = {
      ...config.params,
    } as P & CanonicalizationParameters;

    let autoKDiagnostics: AutoKDiagnostics | undefined;
    if (wantsAutoK) {
      autoKDiagnostics = this.autoKResolver(matrices.assignment);
      resolvedParams.targetCanonicalCount = autoKDiagnostics.selectedK;
    }

    const input: CanonicalizationInput = {
      mythId: config.mythId,
      plotPoints: this.plotPoints,
      collaboratorCategories: this.collaboratorCategories,
      assignment: matrices.assignment,
      agreement: matrices.agreement,
      metadata: config.metadata,
    };

    const targetCount = resolvedParams.targetCanonicalCount;
    if (typeof targetCount === 'number') {
      ensureValidTargetCount(targetCount, input.plotPoints.length);
    }

    const result = await algorithm.run(input, resolvedParams);

    const diagnostics = {
      ...(result.diagnostics ?? {}),
      ...(autoKDiagnostics ? { autoK: autoKDiagnostics } : {}),
    };

    const record: CanonicalizationRunRecord = {
      ...result,
      id: this.idFactory(),
      mythId: config.mythId,
      mode: config.mode,
      params: resolvedParams,
      diagnostics,
      timestamp: new Date().toISOString(),
    };

    await this.historyStore.save(record);
    return record;
  }

  async listRuns(mythId: string, limit?: number) {
    return this.historyStore.list(mythId, limit);
  }
}

function modeRequiresAgreement(mode: CanonicalizationMode) {
  return mode === 'graph' || mode === 'hierarchical';
}

function ensureValidTargetCount(target: number, availablePlotPoints: number) {
  if (target < 1) {
    throw new Error('Target canonical count must be at least 1.');
  }
  if (availablePlotPoints === 0) {
    throw new Error('Add plot points before requesting canonical categories.');
  }
  if (target > availablePlotPoints) {
    throw new Error(
      `Cannot request ${target} canonical categories with only ${availablePlotPoints} plot points available.`,
    );
  }
}
