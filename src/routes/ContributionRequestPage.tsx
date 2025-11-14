import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';

import { getSupabaseClient } from '../lib/supabaseClient';
import { ContributionDraftPayload } from '../types/myth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { cn } from '../components/ui/utils';

type ContributionRequestRecord = {
  request_id: string;
  myth_id: string;
  email: string;
  status: 'draft' | 'submitted' | 'expired';
  draft_payload: ContributionDraftPayload | null;
  myth_name: string;
  myth_description: string;
  contributor_instructions: string;
  updated_at: string;
};

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `plot-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeDraft = (payload: ContributionDraftPayload | null): ContributionDraftPayload => {
  if (!payload || typeof payload !== 'object') {
    return { name: '', source: '', plotPoints: [] };
  }
  const plotPoints = Array.isArray(payload.plotPoints)
    ? payload.plotPoints.map((point, index) => ({
        id: typeof point?.id === 'string' && point.id ? point.id : createLocalId(),
        text: typeof point?.text === 'string' ? point.text : '',
        order: Number.isFinite(point?.order) ? Number(point?.order) : index + 1,
      }))
    : [];
  return {
    name: typeof payload.name === 'string' ? payload.name : '',
    source: typeof payload.source === 'string' ? payload.source : '',
    plotPoints,
  };
};

const buildPayload = (draft: ContributionDraftPayload) => ({
  name: draft.name,
  source: draft.source,
  plotPoints: draft.plotPoints.map((point, index) => ({
    id: point.id,
    text: point.text,
    order: index + 1,
  })),
});

const isDraftLikeStatus = (status: 'invited' | 'draft' | 'submitted' | 'expired' | null) =>
  status === 'invited' || status === 'draft';

export function ContributionRequestPage() {
  const { token } = useParams<{ token: string }>();
  const supabase = useMemo<ReturnType<typeof getSupabaseClient> | null>(() => {
    try {
      return getSupabaseClient();
    } catch (error) {
      if (typeof window === 'undefined') {
        return null;
      }
      throw error;
    }
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<
    'invited' | 'draft' | 'submitted' | 'expired' | null
  >(null);
  const [mythName, setMythName] = useState('');
  const [mythDescription, setMythDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [draft, setDraft] = useState<ContributionDraftPayload>({
    name: '',
    source: '',
    plotPoints: [],
  });
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle');
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const skipInitialSave = useRef(true);

  const loadRequest = useCallback(async () => {
    if (!token || !supabase) {
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('get_contribution_request', { p_token: token });
    if (error) {
      setError(error.message || 'Unable to load this contribution link.');
      setLoading(false);
      return;
    }

    const records = (data as ContributionRequestRecord[] | null) ?? [];
    if (records.length === 0) {
      setError('This contribution link is no longer valid.');
      setLoading(false);
      return;
    }

    const record = records[0];
    setMythName(record.myth_name);
    setMythDescription(record.myth_description);
    setInstructions(record.contributor_instructions);
    setDraft(normalizeDraft(record.draft_payload));
    setRequestStatus(record.status);
    setLastSavedAt(record.updated_at);
    setLoading(false);
  }, [supabase, token]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const persistDraft = useCallback(async () => {
    if (!token || !isDraftLikeStatus(requestStatus) || !supabase) {
      return;
    }
    setAutosaveState('saving');
    setAutosaveError(null);
    const payload = buildPayload(draft);
    const { data, error } = await supabase.rpc('save_contribution_draft', {
      p_token: token,
      p_payload: payload,
    });
    if (error) {
      setAutosaveState('error');
      setAutosaveError(error.message || 'Unable to save your progress.');
      return;
    }
    const response = Array.isArray(data) ? data[0] : null;
    if (response?.updated_at) {
      setLastSavedAt(response.updated_at);
    } else {
      setLastSavedAt(new Date().toISOString());
    }
    setAutosaveState('saved');
    if (requestStatus === 'invited') {
      setRequestStatus('draft');
    }
    setTimeout(() => setAutosaveState('idle'), 1500);
  }, [draft, requestStatus, supabase, token]);

  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    if (!isDraftLikeStatus(requestStatus) || !token) {
      return;
    }
    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = window.setTimeout(() => {
      void persistDraft();
    }, 900);

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [draft, persistDraft, requestStatus, token]);

  const handleAddPlotPoint = (index?: number) => {
    setDraft((prev) => {
      const next = [...prev.plotPoints];
      const newPoint = { id: createLocalId(), text: '', order: next.length + 1 };
      if (typeof index === 'number' && index >= 0 && index < next.length) {
        next.splice(index + 1, 0, newPoint);
      } else {
        next.push(newPoint);
      }
      return { ...prev, plotPoints: next };
    });
  };

  const handleUpdatePlotPoint = (id: string, text: string) => {
    setDraft((prev) => ({
      ...prev,
      plotPoints: prev.plotPoints.map((point) => (point.id === id ? { ...point, text } : point)),
    }));
  };

  const handleMovePlotPoint = (id: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      const index = prev.plotPoints.findIndex((point) => point.id === id);
      if (index === -1) {
        return prev;
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.plotPoints.length) {
        return prev;
      }
      const next = [...prev.plotPoints];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return { ...prev, plotPoints: next };
    });
  };

  const handleRemovePlotPoint = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      plotPoints: prev.plotPoints.filter((point) => point.id !== id),
    }));
  };

  const handleSubmit = async () => {
    if (!token || !isDraftLikeStatus(requestStatus) || !supabase) {
      return;
    }
    const hasContent = draft.plotPoints.some((point) => point.text.trim().length > 0);
    if (!draft.name.trim()) {
      setAutosaveError('Add a name for this variant before submitting.');
      setAutosaveState('error');
      return;
    }
    if (!hasContent) {
      setAutosaveError('Add at least one plot point before submitting.');
      setAutosaveState('error');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('submit_contribution_request', { p_token: token });
    if (error) {
      setAutosaveError(error.message || 'Unable to submit this contribution.');
      setAutosaveState('error');
    } else {
      setRequestStatus('submitted');
      setAutosaveState('idle');
    }
    setSubmitting(false);
  };

  const savedLabel = lastSavedAt
    ? `Last saved ${Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(lastSavedAt))}`
    : 'Draft will auto-save';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <LoadingAnimation message="Loading contribution link…" />
      </div>
    );
  }

  if (error || !requestStatus) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-lg rounded-xl border bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Contribution link unavailable
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {error ?? 'This link is no longer valid or has already been used.'}
          </p>
        </div>
      </div>
    );
  }

  if (requestStatus === 'submitted') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-lg rounded-xl border bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Thank you for your contribution!
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Your myth variant has been submitted successfully. This link can no longer be edited.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{mythName}</CardTitle>
            <CardDescription>{mythDescription || 'Myth description not provided.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions && (
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="font-medium">Contributor instructions</p>
                <p className="mt-1 whitespace-pre-line">{instructions}</p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Variant name
                </label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g., Prometheus Steals Fire"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Variant source (optional)
                </label>
                <Input
                  value={draft.source}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, source: event.target.value }))
                  }
                  placeholder="Where did you hear this version?"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Plot points</CardTitle>
            <CardDescription>
              Add each major beat of this myth variant. You can reorder steps or insert new ones
              between existing entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.plotPoints.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                Start by adding your first plot point.
              </p>
            )}
            <div className="space-y-4">
              {draft.plotPoints.map((point, index) => (
                <div
                  key={point.id}
                  className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Step {index + 1}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleMovePlotPoint(point.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleMovePlotPoint(point.id, 'down')}
                        disabled={index === draft.plotPoints.length - 1}
                      >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Down
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddPlotPoint(index)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add below
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemovePlotPoint(point.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    className="mt-3"
                    value={point.text}
                    onChange={(event) => handleUpdatePlotPoint(point.id, event.target.value)}
                    rows={4}
                    placeholder="Describe this part of the story…"
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={() => handleAddPlotPoint()}>
              <Plus className="mr-2 h-4 w-4" />
              Add plot point
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <p className={cn('font-medium', autosaveState === 'error' && 'text-red-600')}>
              {autosaveState === 'saving' && 'Saving draft…'}
              {autosaveState === 'error' && (autosaveError ?? 'Draft could not be saved.')}
              {autosaveState !== 'saving' && autosaveState !== 'error' && savedLabel}
            </p>
            {autosaveState !== 'error' && (
              <p className="text-xs text-gray-500">
                Your work auto-saves locally and to the archive owner&apos;s workspace.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => void persistDraft()}
              disabled={!isDraftLikeStatus(requestStatus)}
            >
              Save now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !isDraftLikeStatus(requestStatus)}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit variant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
