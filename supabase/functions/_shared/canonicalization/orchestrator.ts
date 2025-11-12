import { MatrixProvider } from './matrixProvider.ts';
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

  constructor(deps: OrchestratorDependencies) {
    this.matrixProvider = deps.matrixProvider;
    this.plotPoints = deps.plotPoints;
    this.collaboratorCategories = deps.collaboratorCategories;
    this.algorithms = deps.algorithms;
    this.historyStore = deps.historyStore;
    this.idFactory =
      deps.idFactory ?? (() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  async run<P extends CanonicalizationParameters>(
    config: CanonicalizationRunConfig<P>,
  ): Promise<CanonicalizationRunRecord> {
    const algorithm = this.algorithms[config.mode];
    if (!algorithm) {
      throw new Error(`No algorithm registered for mode ${config.mode}`);
    }

    const requiresAgreement = modeRequiresAgreement(config.mode);
    const matrices = this.matrixProvider.prepare(requiresAgreement);

    const input: CanonicalizationInput = {
      mythId: config.mythId,
      plotPoints: this.plotPoints,
      collaboratorCategories: this.collaboratorCategories,
      assignment: matrices.assignment,
      agreement: matrices.agreement,
      metadata: config.metadata,
    };

    const result = await algorithm.run(input, config.params);

    const record: CanonicalizationRunRecord = {
      ...result,
      id: this.idFactory(),
      mythId: config.mythId,
      mode: config.mode,
      params: config.params,
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
