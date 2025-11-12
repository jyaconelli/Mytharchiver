import { describe, expect, it } from 'vitest';

import { MatrixProvider } from '../../matrixProvider';
import { ConsensusRunner } from '../consensusRunner';
import { AgreementGraphRunner } from '../graphRunner';
import { FactorizationRunner } from '../factorizationRunner';
import { HierarchicalRunner } from '../hierarchicalRunner';
import { CanonicalizationOrchestrator } from '../orchestrator';
import { InMemoryRunHistoryStore } from '../historyStore';

const plotPoints = [
  {
    id: 'p1',
    text: '',
    order: 1,
    mythemeRefs: [],
    category: 'Intro',
    collaboratorCategories: [
      {
        plotPointId: 'p1',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@example.com',
        categoryName: 'Start',
      },
    ],
  },
  {
    id: 'p2',
    text: '',
    order: 2,
    mythemeRefs: [],
    category: 'Conflict',
    collaboratorCategories: [
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-a',
        collaboratorEmail: 'alpha@example.com',
        categoryName: 'Start',
      },
      {
        plotPointId: 'p2',
        collaboratorCategoryId: 'cat-b',
        collaboratorEmail: 'beta@example.com',
        categoryName: 'Conflict',
      },
    ],
  },
  {
    id: 'p3',
    text: '',
    order: 3,
    mythemeRefs: [],
    category: 'Resolution',
    collaboratorCategories: [
      {
        plotPointId: 'p3',
        collaboratorCategoryId: 'cat-c',
        collaboratorEmail: 'gamma@example.com',
        categoryName: 'Resolution',
      },
    ],
  },
];

const collaboratorCategories = [
  { id: 'cat-a', mythId: 'myth', collaboratorEmail: 'alpha@example.com', name: 'Start' },
  { id: 'cat-b', mythId: 'myth', collaboratorEmail: 'beta@example.com', name: 'Conflict' },
  { id: 'cat-c', mythId: 'myth', collaboratorEmail: 'gamma@example.com', name: 'Resolution' },
];

class InstrumentedMatrixProvider extends MatrixProvider {
  lastAgreement = false;

  prepare(withAgreement = false) {
    this.lastAgreement = withAgreement;
    return super.prepare(withAgreement);
  }
}

describe('CanonicalizationOrchestrator', () => {
  it('runs algorithms and records history', async () => {
    const matrixProvider = new InstrumentedMatrixProvider(plotPoints);
    const historyStore = new InMemoryRunHistoryStore();
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
      idFactory: () => 'run-fixed',
    });

    const consensusRun = await orchestrator.run({
      mythId: 'myth',
      mode: 'consensus',
      params: { targetCanonicalCount: 2 },
    });

    expect(consensusRun.id).toBe('run-fixed');
    expect(consensusRun.metrics?.coverage).toBeCloseTo(1);
    expect(matrixProvider.lastAgreement).toBe(false);

    const graphRun = await orchestrator.run({
      mythId: 'myth',
      mode: 'graph',
      params: { targetCanonicalCount: 2 },
    });

    expect(graphRun.metrics?.coverage).toBeCloseTo(1);
    expect(matrixProvider.lastAgreement).toBe(true);

    const history = await orchestrator.listRuns('myth');
    expect(history).toHaveLength(2);
    const modes = history.map((run) => run.mode).sort();
    expect(modes).toEqual(['consensus', 'graph']);
  });
});
