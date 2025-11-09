import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

type MythContributionRequestRow = {
  id: string;
  email: string | null;
  token: string;
  myth: {
    name: string | null;
    description: string | null;
    contributor_instructions: string | null;
  } | null;
};

type InvokePayload = {
  requestIds?: string[];
};

const RESEND_API_URL = 'https://api.resend.com/emails';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const fromEmail = Deno.env.get('CONTRIBUTION_INVITE_FROM_EMAIL');
const appBaseUrl = Deno.env.get('CONTRIBUTION_INVITE_APP_URL');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable.');
}

if (!fromEmail) {
  throw new Error('Missing CONTRIBUTION_INVITE_FROM_EMAIL environment variable.');
}

if (!appBaseUrl) {
  throw new Error('Missing CONTRIBUTION_INVITE_APP_URL environment variable.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const buildEmailHtml = (mythName: string, mythDescription: string, instructions: string, inviteUrl: string) => `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
    <h2 style="margin-bottom: 0.5rem;">You're invited to contribute to <strong>${mythName}</strong></h2>
    <p>${mythDescription}</p>
    ${instructions ? `<div style="background-color:#fef3c7;padding:12px;border-radius:8px;margin:16px 0;">${instructions.replace(/\n/g, '<br />')}</div>` : ''}
    <p>Use the link below to add your myth variant. You can return to it any time until you submit.</p>
    <p style="margin:24px 0;"><a href="${inviteUrl}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Open contribution form</a></p>
    <p>If the button above doesn't work, copy and paste this link into your browser:</p>
    <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    <p style="color:#64748b;font-size:0.9rem;margin-top:32px;">This link is unique to you. Please do not share it.</p>
  </div>
`;

const buildEmailText = (mythName: string, mythDescription: string, instructions: string, inviteUrl: string) => {
  const parts = [
    `You are invited to contribute to "${mythName}".`,
    mythDescription,
  ];

  if (instructions) {
    parts.push('Contributor instructions:', instructions);
  }

  parts.push('Open the link below to add your variant (it will auto-save until you submit):', inviteUrl);
  parts.push('This link is unique to you.');

  return parts.filter(Boolean).join('\n\n');
};

serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: InvokePayload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON payload', { status: 400 });
  }

  const requestIds = Array.isArray(payload.requestIds) ? payload.requestIds.filter(Boolean) : [];
  if (requestIds.length === 0) {
    return new Response(JSON.stringify({ error: 'requestIds array is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('myth_contribution_requests')
    .select(
      'id, email, token, myth:myth_folders!myth_contribution_requests_myth_id_fkey(name, description, contributor_instructions)'
    )
    .in('id', requestIds);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const invites = (data as MythContributionRequestRow[] | null) ?? [];
  if (invites.length === 0) {
    return new Response(JSON.stringify({ error: 'No matching requests found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const failures: { id: string; email: string; error: string }[] = [];

  for (const invite of invites) {
    const email = invite.email?.trim();
    if (!email) {
      failures.push({ id: invite.id, email: '', error: 'Missing email address.' });
      continue;
    }

    const mythName = invite.myth?.name?.trim() || 'a myth folder';
    const mythDescription = invite.myth?.description?.trim() || '';
    const instructions = invite.myth?.contributor_instructions?.trim() || '';
    const inviteUrl = `${appBaseUrl.replace(/\/$/, '')}/contribute/${invite.token}`;

    const html = buildEmailHtml(mythName, mythDescription, instructions, inviteUrl);
    const text = buildEmailText(mythName, mythDescription, instructions, inviteUrl);

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `Invitation to contribute to ${mythName}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      failures.push({ id: invite.id, email, error: errorBody || response.statusText });
    }
  }

  const status = failures.length > 0 ? 207 : 200;
  return new Response(
    JSON.stringify({
      delivered: invites.length - failures.length,
      failed: failures,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
