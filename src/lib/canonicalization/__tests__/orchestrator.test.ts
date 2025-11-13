import { describe, expect, it, vi } from 'vitest';

import { MatrixProvider } from '../../matrixProvider';
import { ConsensusRunner } from '../consensusRunner';
import { AgreementGraphRunner } from '../graphRunner';
import { FactorizationRunner } from '../factorizationRunner';
import { HierarchicalRunner } from '../hierarchicalRunner';
import { CanonicalizationOrchestrator } from '../orchestrator';
import { InMemoryRunHistoryStore } from '../historyStore';
import { DirectiveSearchRunner } from '../directiveRunner';

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
        directive: new DirectiveSearchRunner(),
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

  it('auto-detects the target count when useAutoK is enabled', async () => {
    const matrixProvider = new InstrumentedMatrixProvider(plotPoints);
    const historyStore = new InMemoryRunHistoryStore();
    const autoKResolver = vi.fn().mockReturnValue({
      selectedK: 2,
      reason: 'gap',
      candidateRange: { min: 2, max: 6 },
    });

    const orchestrator = new CanonicalizationOrchestrator({
      matrixProvider,
      plotPoints,
      collaboratorCategories,
      algorithms: {
        graph: new AgreementGraphRunner(),
        factorization: new FactorizationRunner(),
        consensus: new ConsensusRunner(),
        hierarchical: new HierarchicalRunner(),
        directive: new DirectiveSearchRunner(),
      },
      historyStore,
      idFactory: () => 'auto-run',
      autoKResolver,
    });

    const run = await orchestrator.run({
      mythId: 'myth',
      mode: 'consensus',
      params: { useAutoK: true },
    });

    expect(autoKResolver).toHaveBeenCalledTimes(1);
    expect(run.params.targetCanonicalCount).toBe(2);
    expect(run.diagnostics?.autoK).toBeDefined();
    expect(matrixProvider.lastAgreement).toBe(true);
  });

  it('throws when auto-detected K exceeds available plot points', async () => {
    const matrixProvider = new InstrumentedMatrixProvider(plotPoints);
    const historyStore = new InMemoryRunHistoryStore();
    const autoKResolver = vi.fn().mockReturnValue({
      selectedK: 4,
      reason: 'gap',
      candidateRange: { min: 2, max: 6 },
    });

    const orchestrator = new CanonicalizationOrchestrator({
      matrixProvider,
      plotPoints,
      collaboratorCategories,
      algorithms: {
        graph: new AgreementGraphRunner(),
        factorization: new FactorizationRunner(),
        consensus: new ConsensusRunner(),
        hierarchical: new HierarchicalRunner(),
        directive: new DirectiveSearchRunner(),
      },
      historyStore,
      idFactory: () => 'auto-run',
      autoKResolver,
    });

    await expect(
      orchestrator.run({
        mythId: 'myth',
        mode: 'consensus',
        params: { useAutoK: true },
      }),
    ).rejects.toThrow('Cannot request 4 canonical categories with only 3 plot points available.');

    expect(autoKResolver).toHaveBeenCalledTimes(1);
  });

  it('throws when manual target K exceeds available plot points', async () => {
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
      idFactory: () => 'manual-error',
    });

    await expect(
      orchestrator.run({
        mythId: 'myth',
        mode: 'graph',
        params: { targetCanonicalCount: 5 },
      }),
    ).rejects.toThrow('Cannot request 5 canonical categories with only 3 plot points available.');
  });
});
