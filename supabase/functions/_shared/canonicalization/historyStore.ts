import type { CanonicalizationResult } from './types.ts';

export interface CanonicalizationRunRecord extends CanonicalizationResult {
  id: string;
  mythId: string;
  mode: string;
  params: Record<string, unknown>;
  timestamp: string;
  categoryLabels?: Record<string, string>;
}

export interface RunHistoryStore {
  save(record: CanonicalizationRunRecord): Promise<void>;
  list(mythId: string, limit?: number): Promise<CanonicalizationRunRecord[]>;
}

export class InMemoryRunHistoryStore implements RunHistoryStore {
  private store: CanonicalizationRunRecord[] = [];

  async save(record: CanonicalizationRunRecord): Promise<void> {
    this.store.push(record);
  }

  async list(mythId: string, limit = 10): Promise<CanonicalizationRunRecord[]> {
    const filtered = this.store
      .filter((record) => record.mythId === mythId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    return filtered.slice(0, limit);
  }
}
