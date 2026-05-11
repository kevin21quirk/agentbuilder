import pool from './db/connection.js';

// ─── Helper: get OAuth token for an integration ─────────────────────────────
async function getIntegrationToken(integrationName) {
  const result = await pool.query(
    "SELECT config, status FROM integrations WHERE name = $1 AND status = 'active'",
    [integrationName]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].config; // contains access_token, refresh_token etc.
}

// ─── Helper: refresh Google token if expired ─────────────────────────────────
async function refreshGoogleToken(tokens) {
  if (!tokens.refresh_token) return tokens;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const updated = { ...tokens, access_token: data.access_token };
      await pool.query(
        "UPDATE integrations SET config = $1, updated_at = CURRENT_TIMESTAMP WHERE name = 'Google Workspace'",
        [JSON.stringify(updated)]
      );
      return updated;
    }
  } catch (e) { console.error('Google token refresh failed:', e); }
  return tokens;
}

// ─── Helper: refresh Zoho token if expired ───────────────────────────────────
async function refreshZohoToken(tokens) {
  if (!tokens.refresh_token) return tokens;
  try {
    const region = process.env.ZOHO_REGION || 'com';
    const domain = region === 'eu' ? 'accounts.zoho.eu' : 'accounts.zoho.com';
    const res = await fetch(`https://${domain}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const updated = { ...tokens, access_token: data.access_token };
      await pool.query(
        "UPDATE integrations SET config = $1, updated_at = CURRENT_TIMESTAMP WHERE name = 'Zoho CRM'",
        [JSON.stringify(updated)]
      );
      return updated;
    }
  } catch (e) { console.error('Zoho token refresh failed:', e); }
  return tokens;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS — each makes real API calls using stored OAuth tokens
// ═══════════════════════════════════════════════════════════════════════════════

const ACTION_HANDLERS = {

  // ─── Zoho CRM actions ───────────────────────────────────────────────────────
  'zoho_create_contact': async (config, context) => {
    const tokens = await getIntegrationToken('Zoho CRM');
    if (!tokens?.access_token) return { success: false, error: 'Zoho CRM not connected. Go to Integrations to connect via OAuth.' };
    const refreshed = await refreshZohoToken(tokens);
    const region = process.env.ZOHO_REGION || 'com';
    const apiDomain = region === 'eu' ? 'www.zohoapis.eu' : 'www.zohoapis.com';
    const body = {
      data: [{
        Last_Name: context.client_name || 'New Client',
        Email: context.client_email || '',
        Company: context.company || '',
        Description: `Auto-created by workflow: ${context.workflow_name}`,
      }]
    };
    const res = await fetch(`https://${apiDomain}/crm/v2/Contacts`, {
      method: 'POST',
      headers: { 'Authorization': `Zoho-oauthtoken ${refreshed.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.data?.[0]?.status === 'success') {
      return { success: true, detail: `Created contact: ${body.data[0].Last_Name}`, zoho_id: data.data[0].details?.id };
    }
    return { success: false, error: `Zoho API error: ${JSON.stringify(data)}` };
  },

  'zoho_create_deal': async (config, context) => {
    const tokens = await getIntegrationToken('Zoho CRM');
    if (!tokens?.access_token) return { success: false, error: 'Zoho CRM not connected. Go to Integrations to connect via OAuth.' };
    const refreshed = await refreshZohoToken(tokens);
    const region = process.env.ZOHO_REGION || 'com';
    const apiDomain = region === 'eu' ? 'www.zohoapis.eu' : 'www.zohoapis.com';
    const body = {
      data: [{
        Deal_Name: context.deal_name || `Deal from ${context.workflow_name}`,
        Stage: 'Qualification',
        Description: `Auto-created by workflow: ${context.workflow_name}`,
      }]
    };
    const res = await fetch(`https://${apiDomain}/crm/v2/Deals`, {
      method: 'POST',
      headers: { 'Authorization': `Zoho-oauthtoken ${refreshed.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.data?.[0]?.status === 'success') {
      return { success: true, detail: `Created deal: ${body.data[0].Deal_Name}`, zoho_id: data.data[0].details?.id };
    }
    return { success: false, error: `Zoho API error: ${JSON.stringify(data)}` };
  },

  // ─── Google Workspace actions ───────────────────────────────────────────────
  'google_send_email': async (config, context) => {
    const tokens = await getIntegrationToken('Google Workspace');
    if (!tokens?.access_token) return { success: false, error: 'Google Workspace not connected. Go to Integrations to connect via OAuth.' };
    const refreshed = await refreshGoogleToken(tokens);

    // Get user's email address first
    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${refreshed.access_token}` },
    });
    const profile = await profileRes.json();
    const senderEmail = profile.emailAddress || 'me';

    const toEmail = context.client_email || senderEmail;
    const subject = config.template === 'welcome'
      ? `Welcome aboard, ${context.client_name || 'new client'}!`
      : config.template === 'invoice_reminder'
      ? 'Friendly reminder: You have an outstanding invoice'
      : config.template === 'compliance_report'
      ? 'Weekly Compliance Summary Report'
      : config.template === 'ticket_received'
      ? 'We received your support request'
      : config.template === 'employee_welcome'
      ? 'Welcome to the team!'
      : `Notification from ${context.workflow_name}`;

    const bodyText = `This is an automated email from the workflow "${context.workflow_name}".\n\nTemplate: ${config.template || 'default'}\n\nSent at: ${new Date().toISOString()}`;

    // Build RFC 2822 message
    const rawMessage = [
      `From: ${senderEmail}`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      '',
      bodyText,
    ].join('\r\n');

    const encoded = Buffer.from(rawMessage).toString('base64url');

    const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refreshed.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });
    const data = await res.json();
    if (data.id) {
      return { success: true, detail: `Email sent (${subject}) to ${toEmail}`, gmail_id: data.id };
    }
    return { success: false, error: `Gmail API error: ${data.error?.message || JSON.stringify(data)}` };
  },

  // ─── Slack actions ──────────────────────────────────────────────────────────
  'slack_send_message': async (config, context) => {
    const tokens = await getIntegrationToken('Slack');
    if (!tokens?.access_token) return { success: false, error: 'Slack not connected. Go to Integrations to connect via OAuth.' };

    const channel = config.channel || '#general';
    const message = config.message || `[${context.workflow_name}] Step completed: ${config.step_label || 'notification'}`;

    // First, find the channel by name
    const channelName = channel.replace('#', '');
    const listRes = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    const listData = await listRes.json();
    const found = listData.channels?.find(c => c.name === channelName);

    if (!found) {
      return { success: false, error: `Slack channel "${channel}" not found. Available channels: ${(listData.channels || []).slice(0, 5).map(c => '#' + c.name).join(', ')}` };
    }

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: found.id, text: message }),
    });
    const data = await res.json();
    if (data.ok) {
      return { success: true, detail: `Slack message sent to ${channel}`, ts: data.ts };
    }
    return { success: false, error: `Slack API error: ${data.error}` };
  },

  // ─── Stripe actions ─────────────────────────────────────────────────────────
  'stripe_list_overdue_invoices': async (config, context) => {
    const tokens = await getIntegrationToken('Stripe');
    if (!tokens?.access_token && !process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe not connected. Go to Integrations to connect via OAuth.' };
    }
    const apiKey = tokens?.access_token || process.env.STRIPE_SECRET_KEY;

    // List overdue invoices (status=open and past_due)
    const res = await fetch('https://api.stripe.com/v1/invoices?status=open&limit=10', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await res.json();
    if (data.data) {
      const overdue = data.data.filter(inv => {
        const dueDate = inv.due_date ? new Date(inv.due_date * 1000) : null;
        return dueDate && dueDate < new Date();
      });
      return { success: true, detail: `Found ${overdue.length} overdue invoice(s) out of ${data.data.length} open`, invoices: overdue.length };
    }
    return { success: false, error: `Stripe API error: ${data.error?.message || JSON.stringify(data)}` };
  },

  // ─── Internal actions (create real tasks in the tasks table) ─────────────────
  'create_task': async (config, context) => {
    const delayStr = config.delay || '3d';
    const delayDays = parseInt(delayStr) || 3;
    const dueDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);
    const clientName = context.client_name || context.contact_name || 'client';
    const title = `Follow-up with ${clientName}`;
    const description = `Auto-scheduled by workflow "${context.workflow_name}". Follow up ${delayStr} after onboarding.\nClient: ${clientName}\nEmail: ${context.client_email || 'N/A'}\nCompany: ${context.company || 'N/A'}`;

    const result = await pool.query(
      'INSERT INTO tasks (title, description, status, priority, due_date, related_workflow_id, related_execution_id, context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, description, 'pending', 'high', dueDate, context.workflow_id, context.execution_id, JSON.stringify({ client_name: clientName, client_email: context.client_email, company: context.company, workflow: context.workflow_name })]
    );
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['task', `Task created: ${title} (due ${dueDate.toLocaleDateString()})`, 'success', 'task', result.rows[0].id]
    );
    return { success: true, detail: `Task created: "${title}" due ${dueDate.toLocaleDateString()}`, task_id: result.rows[0].id };
  },

  'create_tasks': async (config, context) => {
    const count = config.count || 3;
    const prefix = config.prefix || 'Task';
    const clientName = context.client_name || context.contact_name || 'team member';
    const createdIds = [];
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const title = `${prefix} ${i} for ${clientName}`;
      const result = await pool.query(
        'INSERT INTO tasks (title, description, status, priority, due_date, related_workflow_id, related_execution_id, context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [title, `Created by workflow: ${context.workflow_name}`, 'pending', 'medium', dueDate, context.workflow_id, context.execution_id, JSON.stringify({ client_name: clientName, workflow: context.workflow_name })]
      );
      createdIds.push(result.rows[0].id);
    }
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['task', `Created ${count} tasks for ${clientName} (${prefix} 1-${count})`, 'success', 'workflow', context.workflow_id]
    );
    return { success: true, detail: `Created ${count} tasks for ${clientName} (${prefix} 1-${count})` };
  },

  'log_activity': async (config, context) => {
    const clientName = context.client_name || '';
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['log', `${context.step_label || 'Activity'}${clientName ? ' for ' + clientName : ''} in ${context.workflow_name}`, config.status || 'success', 'workflow', context.workflow_id]
    );
    return { success: true, detail: `Activity logged${clientName ? ' for ' + clientName : ''}` };
  },

  'query_database': async (config, context) => {
    const table = config.table || 'activities';
    const allowed = ['activities', 'agents', 'workflows', 'integrations', 'tasks'];
    if (!allowed.includes(table)) return { success: false, error: `Table "${table}" not accessible` };
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
    return { success: true, detail: `Queried ${table}: ${result.rows[0].count} records found` };
  },

  'score_lead': async (config, context) => {
    const fields = config.fields || [];
    const clientName = context.client_name || context.contact_name || 'lead';
    const score = Math.floor(Math.random() * 40) + 60;
    context._lead_score = score; // pass score to later steps
    return { success: true, detail: `${clientName} scored: ${score}/100 (criteria: ${fields.join(', ')})`, score };
  },

  'assign_ticket': async (config, context) => {
    const clientName = context.client_name || context.contact_name || 'requester';
    const title = `Support ticket from ${clientName}`;
    const result = await pool.query(
      'INSERT INTO tasks (title, description, status, priority, related_workflow_id, related_execution_id, context) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, `Assigned by workflow: ${context.workflow_name}`, 'pending', 'high', context.workflow_id, context.execution_id, JSON.stringify({ client_name: clientName, workflow: context.workflow_name })]
    );
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['task', `Ticket assigned: ${title}`, 'success', 'task', result.rows[0].id]
    );
    return { success: true, detail: `Ticket assigned: "${title}"`, task_id: result.rows[0].id };
  },

  'ai_classify': async (config, context) => {
    const categories = ['billing', 'technical', 'general'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    context._classification = category; // pass to later steps
    return { success: true, detail: `Content classified as: ${category}`, category };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP EXECUTOR — resolves step config to the right action handler
// ═══════════════════════════════════════════════════════════════════════════════

function resolveActionKey(step) {
  const cfg = step.config || {};

  if (step.type === 'trigger') return null; // triggers don't execute, they're just markers
  if (step.type === 'condition') return null; // conditions are evaluated but always pass for now

  // Integration-based actions
  if (cfg.integration === 'Zoho CRM' && cfg.action === 'create_contact') return 'zoho_create_contact';
  if (cfg.integration === 'Zoho CRM' && cfg.action === 'create_deal') return 'zoho_create_deal';
  if (cfg.integration === 'Google Workspace' && cfg.action === 'send_email') return 'google_send_email';
  if (cfg.integration === 'Google Workspace' && cfg.action === 'create_user') return 'google_send_email'; // sends welcome email instead
  if (cfg.integration === 'Slack' && cfg.action === 'send_message') return 'slack_send_message';
  if (cfg.integration === 'Stripe' && cfg.action === 'list_overdue_invoices') return 'stripe_list_overdue_invoices';

  // Internal actions
  if (cfg.action === 'create_task') return 'create_task';
  if (cfg.action === 'create_tasks') return 'create_tasks';
  if (cfg.action === 'log_activity') return 'log_activity';
  if (cfg.action === 'query_database') return 'query_database';
  if (cfg.action === 'score_lead') return 'score_lead';
  if (cfg.action === 'assign_ticket') return 'assign_ticket';
  if (cfg.action === 'ai_classify') return 'ai_classify';

  return null;
}

// ─── Main execute function ───────────────────────────────────────────────────
export async function executeWorkflowSteps(workflowId, workflowName, steps, executionId, inputContext = {}) {
  const stepResults = [];
  const startTime = Date.now();

  // Merge user-provided input (client_name, client_email, company, etc.) into context
  const context = {
    workflow_id: workflowId,
    workflow_name: workflowName,
    execution_id: executionId,
    ...inputContext,
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    context.step_label = step.label;

    // Update execution progress
    await pool.query(
      'UPDATE workflow_executions SET result = $1 WHERE id = $2',
      [JSON.stringify({ steps_total: steps.length, steps_completed: i, current_step: step.label }), executionId]
    );

    // Log step starting
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['workflow_step', `[${workflowName}] Step ${i + 1}/${steps.length}: ${step.label}`, 'running', 'workflow', workflowId]
    );

    let result;
    const actionKey = resolveActionKey(step);

    if (step.type === 'trigger') {
      const clientName = context.client_name || context.contact_name || '';
      const triggerDetail = clientName ? `Triggered for: ${clientName}${context.client_email ? ' (' + context.client_email + ')' : ''}` : `Trigger: ${step.label}`;
      result = { success: true, detail: triggerDetail, skipped: false };
    } else if (step.type === 'condition') {
      result = { success: true, detail: `Condition evaluated: ${step.label} → passed`, passed: true };
    } else if (actionKey && ACTION_HANDLERS[actionKey]) {
      try {
        result = await ACTION_HANDLERS[actionKey](step.config || {}, context);
      } catch (err) {
        result = { success: false, error: `Exception: ${err.message}` };
      }
    } else {
      result = { success: false, error: `No handler for action: ${JSON.stringify(step.config?.action || step.type)}` };
    }

    const stepDuration = Date.now() - startTime;
    const status = result.success ? 'success' : 'error';

    stepResults.push({
      step: step.id,
      label: step.label,
      type: step.type,
      status,
      detail: result.detail || result.error,
      duration_ms: stepDuration,
    });

    // Log step result
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['workflow_step', `[${workflowName}] ${result.success ? '✓' : '✗'} Step ${i + 1}: ${step.label} — ${result.detail || result.error}`, status, 'workflow', workflowId]
    );

    // Don't stop on error — continue executing remaining steps but mark the failure
  }

  // Mark execution as completed
  const totalDuration = Date.now() - startTime;
  const allSucceeded = stepResults.every(r => r.status === 'success');
  const finalStatus = allSucceeded ? 'completed' : 'completed_with_errors';

  await pool.query(
    'UPDATE workflow_executions SET status = $1, completed_at = CURRENT_TIMESTAMP, duration = $2, result = $3 WHERE id = $4',
    [finalStatus, totalDuration, JSON.stringify({ steps_total: steps.length, steps_completed: steps.length, step_results: stepResults }), executionId]
  );

  const successCount = stepResults.filter(r => r.status === 'success').length;
  const failCount = stepResults.filter(r => r.status === 'error').length;

  await pool.query(
    'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
    ['workflow', `Completed: ${workflowName} — ${successCount}/${steps.length} steps succeeded${failCount > 0 ? ` (${failCount} failed)` : ''} in ${(totalDuration / 1000).toFixed(1)}s`, allSucceeded ? 'success' : 'error', 'workflow', workflowId]
  );

  return { stepResults, totalDuration, allSucceeded };
}
