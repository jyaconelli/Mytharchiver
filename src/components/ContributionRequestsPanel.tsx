import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Mail, Send, Trash2 } from 'lucide-react';

import { getSupabaseClient } from '../lib/supabaseClient';
import {
  ContributionDraftPayload,
  ContributionRequest,
  ContributionRequestStatus,
} from '../types/myth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type ContributionRequestRow = {
  id: string;
  myth_id: string;
  email: string | null;
  token: string;
  status: ContributionRequestStatus;
  submitted_variant_id: string | null;
  updated_at: string;
  draft_payload: ContributionDraftPayload | null;
};

type ContributionRequestsPanelProps = {
  mythId: string;
  mythName: string;
  contributorInstructions: string;
  canManage: boolean;
  onUpdateInstructions: (instructions: string) => Promise<void>;
};

const normalizeDraft = (payload: ContributionDraftPayload | null): ContributionDraftPayload => {
  if (!payload || typeof payload !== 'object') {
    return { name: '', source: '', plotPoints: [] };
  }

  const plotPoints = Array.isArray(payload.plotPoints)
    ? payload.plotPoints.map((point, index) => ({
        id: typeof point?.id === 'string' && point.id ? point.id : `plot-${Date.now()}-${index}`,
        text: typeof point?.text === 'string' ? point.text : '',
        order: typeof point?.order === 'number' ? point.order : index + 1,
      }))
    : [];

  return {
    name: typeof payload.name === 'string' ? payload.name : '',
    source: typeof payload.source === 'string' ? payload.source : '',
    plotPoints,
  };
};

const statusVariant: Record<
  ContributionRequestStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  invited: 'outline',
  draft: 'secondary',
  submitted: 'default',
  expired: 'outline',
};

const statusLabel: Record<ContributionRequestStatus, string> = {
  invited: 'Invited',
  draft: 'Draft',
  submitted: 'Submitted',
  expired: 'Expired',
};

const isDraftLikeStatus = (status: ContributionRequestStatus) =>
  status === 'invited' || status === 'draft';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const parseEmails = (value: string) => {
  const unique = new Set(
    value
      .split(/[\s,;]+/g)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  return Array.from(unique);
};

export function ContributionRequestsPanel({
  mythId,
  mythName,
  contributorInstructions,
  canManage,
  onUpdateInstructions,
}: ContributionRequestsPanelProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [instructionsValue, setInstructionsValue] = useState(contributorInstructions);
  const [instructionsStatus, setInstructionsStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [instructionsError, setInstructionsError] = useState<string | null>(null);

  const [requests, setRequests] = useState<ContributionRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setInstructionsValue(contributorInstructions);
    setInstructionsStatus('idle');
    setInstructionsError(null);
  }, [contributorInstructions, mythId]);

  const shareBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/contribute';
    }
    return `${window.location.origin}/contribute`;
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!canManage) {
      setRequests([]);
      return;
    }

    setRequestsLoading(true);
    setRequestsError(null);
    const { data, error } = await supabase
      .from('myth_contribution_requests')
      .select('id, myth_id, email, token, status, submitted_variant_id, updated_at, draft_payload')
      .eq('myth_id', mythId)
      .order('created_at', { ascending: false });

    if (error) {
      setRequestsError(error.message);
      setRequestsLoading(false);
      return;
    }

    const rows = (data as ContributionRequestRow[] | null) ?? [];
    const parsed = rows.map<ContributionRequest>((row) => ({
      id: row.id,
      mythId: row.myth_id,
      email: row.email ?? '',
      token: row.token,
      status: row.status,
      submittedVariantId: row.submitted_variant_id,
      updatedAt: row.updated_at,
      draft: normalizeDraft(row.draft_payload),
    }));
    setRequests(parsed);
    setRequestsLoading(false);
  }, [canManage, supabase, mythId]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleSaveInstructions = async () => {
    if (!canManage) {
      return;
    }
    const trimmed = instructionsValue.trim();
    setInstructionsStatus('saving');
    setInstructionsError(null);
    try {
      await onUpdateInstructions(trimmed);
      setInstructionsStatus('saved');
      setTimeout(() => setInstructionsStatus('idle'), 2000);
    } catch (error) {
      setInstructionsStatus('error');
      setInstructionsError(error instanceof Error ? error.message : 'Unable to save instructions.');
    }
  };

  const handleCreateInvites = async () => {
    const emails = parseEmails(emailInput);
    if (emails.length === 0) {
      setInviteError('Add at least one email address.');
      return;
    }
    setInviteError(null);
    setSendingInvites(true);
    try {
      const { data, error } = await supabase
        .from('myth_contribution_requests')
        .insert(
          emails.map((email) => ({
            myth_id: mythId,
            email,
          })),
        )
        .select('id');
      if (error) {
        throw new Error(error.message);
      }

      const created = (data as { id: string }[] | null) ?? [];
      if (created.length > 0) {
        const { error: functionError } = await supabase.functions.invoke(
          'send-contribution-invite',
          {
            body: {
              requestIds: created.map((row) => row.id),
            },
          },
        );

        if (functionError) {
          throw new Error(
            functionError.message ?? 'Unable to send invite emails. Please try again.',
          );
        }
      }

      setEmailInput('');
      await fetchRequests();
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to create contribution requests.',
      );
    } finally {
      setSendingInvites(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = `${shareBaseUrl}/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setInviteError('Copy failed. You can manually copy the link.');
    }
  };

  const handleComposeEmail = (email: string, token: string) => {
    if (!email) return;
    const link = `${shareBaseUrl}/${token}`;
    const subject = encodeURIComponent(`You are invited to contribute to "${mythName}"`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease use the following link to add a variant to "${mythName}":\n${link}\n\nInstructions:\n${
        contributorInstructions || 'Provide your take on this myth.'
      }\n\nThank you!`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!canManage) return;
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
    setInviteError(null);
    try {
      const { error } = await supabase.rpc('delete_contribution_request_with_variant', {
        p_request_id: requestId,
      });
      if (error) {
        throw new Error(error.message);
      }
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to delete the contribution request.',
      );
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const instructionsChanged =
    contributorInstructions.trim() !== instructionsValue.trim() && canManage;

  const handleResendInvite = async (requestId: string) => {
    if (!canManage) return;
    setResendingIds((prev) => new Set(prev).add(requestId));
    setInviteError(null);
    try {
      const { error } = await supabase.functions.invoke('send-contribution-invite', {
        body: { requestIds: [requestId] },
      });
      if (error) {
        throw new Error(error.message ?? 'Unable to resend invite email.');
      }
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to resend invite email.');
    } finally {
      setResendingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contributor Instructions</CardTitle>
          <CardDescription>
            These notes are displayed at the top of every contribution link associated with this
            myth folder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="contributor-instructions">Instructions</Label>
                <Textarea
                  id="contributor-instructions"
                  value={instructionsValue}
                  onChange={(event) => setInstructionsValue(event.target.value)}
                  rows={5}

                  placeholder="Share any context or formatting rules you need contributors to follow."
                />
              </div>
              {instructionsError && (
                <p className="text-sm text-red-600 dark:text-red-400">{instructionsError}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleSaveInstructions}
                  disabled={!instructionsChanged || instructionsStatus === 'saving'}
                >
                  {instructionsStatus === 'saving' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save instructions
                </Button>
                {instructionsStatus === 'saved' && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>
                )}
              </div>
            </>
          ) : (
            <p className="border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              {contributorInstructions
                ? contributorInstructions
                : 'The owner has not provided contributor instructions yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Contribution Requests</CardTitle>
            <CardDescription>
              Add one or more email addresses to generate unique contribution links. Invitations are
              emailed automatically, and you can still copy or resend links manually if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="contribution-emails">Invite contributors</Label>
              <Textarea
                id="contribution-emails"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="person@example.com, another@myths.org"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple addresses with commas, semicolons, or new lines.
              </p>
            </div>
            {inviteError && <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateInvites} disabled={sendingInvites}>
                {sendingInvites && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send requests
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailInput('');
                  setInviteError(null);
                }}
                disabled={sendingInvites || !emailInput.trim()}
              >
                Clear
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Active requests</p>
                {requestsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {requestsError && (
                <p className="text-sm text-red-600 dark:text-red-400">{requestsError}</p>
              )}
              {requests.length === 0 && !requestsLoading ? (
                <p className="text-sm text-muted-foreground">
                  No contribution requests yet. Add an email above to generate one.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium font-robot">{request.email}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[request.status]}>
                            {statusLabel[request.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(request.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyLink(request.token)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {copiedToken === request.token ? 'Copied' : 'Copy link'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleComposeEmail(request.email, request.token)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </Button>
                            {isDraftLikeStatus(request.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendInvite(request.id)}
                                disabled={resendingIds.has(request.id)}
                              >
                                {resendingIds.has(request.id) ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="mr-2 h-4 w-4" />
                                )}
                                Resend
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={request.status === 'submitted' ? 'destructive' : 'ghost'}
                              onClick={() => handleDeleteRequest(request.id)}
                              disabled={deletingIds.has(request.id)}
                            >
                              {deletingIds.has(request.id) ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              {request.status === 'submitted' ? 'Delete submission' : 'Remove'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="text-xs text-muted-foreground">
                Removing a submitted invite will also delete the myth variant that guest
                contributed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
