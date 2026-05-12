import pool from './db/connection.js';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW EXECUTION ENGINE - Handles variables, conditions, and data flow
// ═══════════════════════════════════════════════════════════════════════════

// ─── Variable Resolution ────────────────────────────────────────────────────
// Resolves {{variable}} syntax in strings using context data
function resolveVariables(value, context) {
  if (typeof value !== 'string') return value;
  
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let result = context;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return match; // Keep original if path not found
      }
    }
    
    return result !== undefined ? String(result) : match;
  });
}

// Recursively resolve all variables in an object
function resolveAllVariables(obj, context) {
  if (typeof obj === 'string') return resolveVariables(obj, context);
  if (Array.isArray(obj)) return obj.map(item => resolveAllVariables(item, context));
  if (obj && typeof obj === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveAllVariables(value, context);
    }
    return resolved;
  }
  return obj;
}

// ─── Condition Evaluation ───────────────────────────────────────────────────
function evaluateCondition(condition, context) {
  const { field, operator, value } = condition;
  const fieldValue = resolveVariables(`{{${field}}}`, context);
  const compareValue = resolveVariables(value, context);
  
  switch (operator) {
    case 'equals':
      return fieldValue == compareValue;
    case 'not_equals':
      return fieldValue != compareValue;
    case 'contains':
      return String(fieldValue).includes(compareValue);
    case 'greater_than':
      return Number(fieldValue) > Number(compareValue);
    case 'less_than':
      return Number(fieldValue) < Number(compareValue);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    default:
      return false;
  }
}

// ─── OAuth Token Management ─────────────────────────────────────────────────
async function getIntegrationToken(integrationName) {
  const result = await pool.query(
    "SELECT config FROM integrations WHERE name = $1 AND status = 'active'",
    [integrationName]
  );
  if (result.rows.length === 0) throw new Error(`Integration ${integrationName} not connected`);
  return result.rows[0].config;
}

async function refreshGoogleToken(tokens) {
  if (!tokens.refresh_token) return tokens;
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
      "UPDATE integrations SET config = $1 WHERE name = 'Google Workspace'",
      [JSON.stringify(updated)]
    );
    return updated;
  }
  return tokens;
}

async function refreshZohoToken(tokens) {
  if (!tokens.refresh_token) return tokens;
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
      "UPDATE integrations SET config = $1 WHERE name = 'Zoho CRM'",
      [JSON.stringify(updated)]
    );
    return updated;
  }
  return tokens;
}

// ─── Integration Actions ────────────────────────────────────────────────────
const INTEGRATION_ACTIONS = {
  'Zoho CRM': {
    create_contact: async (config, context) => {
      let tokens = await getIntegrationToken('Zoho CRM');
      tokens = await refreshZohoToken(tokens);
      
      const contactData = resolveAllVariables(config.data || {}, context);
      const region = process.env.ZOHO_REGION || 'com';
      const apiDomain = region === 'eu' ? 'zohoapis.eu' : 'zohoapis.com';
      
      const res = await fetch(`https://www.${apiDomain}/crm/v2/Contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [contactData] })
      });
      
      const result = await res.json();
      return { success: true, data: result.data?.[0], response: result };
    },
    
    create_deal: async (config, context) => {
      let tokens = await getIntegrationToken('Zoho CRM');
      tokens = await refreshZohoToken(tokens);
      
      const dealData = resolveAllVariables(config.data || {}, context);
      const region = process.env.ZOHO_REGION || 'com';
      const apiDomain = region === 'eu' ? 'zohoapis.eu' : 'zohoapis.com';
      
      const res = await fetch(`https://www.${apiDomain}/crm/v2/Deals`, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [dealData] })
      });
      
      const result = await res.json();
      return { success: true, data: result.data?.[0], response: result };
    }
  },
  
  'Google Workspace': {
    send_email: async (config, context) => {
      let tokens = await getIntegrationToken('Google Workspace');
      tokens = await refreshGoogleToken(tokens);
      
      const { to, subject, body } = resolveAllVariables(config, context);
      
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');
      
      const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      });
      
      const result = await res.json();
      return { success: true, messageId: result.id, response: result };
    },
    
    create_calendar_event: async (config, context) => {
      let tokens = await getIntegrationToken('Google Workspace');
      tokens = await refreshGoogleToken(tokens);
      
      const eventData = resolveAllVariables(config, context);
      
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      const result = await res.json();
      return { success: true, eventId: result.id, response: result };
    }
  },
  
  'Slack': {
    send_message: async (config, context) => {
      const tokens = await getIntegrationToken('Slack');
      const { channel, text } = resolveAllVariables(config, context);
      
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channel, text })
      });
      
      const result = await res.json();
      return { success: result.ok, response: result };
    }
  },
  
  'Stripe': {
    list_overdue_invoices: async (config, context) => {
      const tokens = await getIntegrationToken('Stripe');
      
      const res = await fetch('https://api.stripe.com/v1/invoices?status=open&due_date[lt]=' + Math.floor(Date.now() / 1000), {
        headers: { 'Authorization': `Bearer ${tokens.secret_key}` }
      });
      
      const result = await res.json();
      return { success: true, invoices: result.data, count: result.data.length };
    }
  }
};

// ─── Internal Actions ───────────────────────────────────────────────────────
const INTERNAL_ACTIONS = {
  create_task: async (config, context, executionId) => {
    const taskData = resolveAllVariables(config, context);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (taskData.days_from_now || 3));
    
    const result = await pool.query(
      `INSERT INTO tasks (title, description, due_date, status, workflow_execution_id, context_data)
       VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING *`,
      [
        taskData.title || 'Follow-up task',
        taskData.description || '',
        dueDate,
        executionId,
        JSON.stringify(context)
      ]
    );
    
    return { success: true, task: result.rows[0] };
  },
  
  log_activity: async (config, context, executionId) => {
    const { message, level } = resolveAllVariables(config, context);
    
    await pool.query(
      `INSERT INTO activities (type, description, metadata, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [level || 'info', message, JSON.stringify({ execution_id: executionId, context })]
    );
    
    return { success: true, logged: message };
  },
  
  http_request: async (config, context) => {
    const { method, url, headers, body } = resolveAllVariables(config, context);
    
    const res = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await res.json().catch(() => res.text());
    return { success: res.ok, status: res.status, data };
  },
  
  set_variable: async (config, context) => {
    const { name, value } = resolveAllVariables(config, context);
    return { success: true, variable: name, value };
  },
  
  delay: async (config, context) => {
    const { seconds } = resolveAllVariables(config, context);
    await new Promise(resolve => setTimeout(resolve, (seconds || 1) * 1000));
    return { success: true, delayed: seconds };
  }
};

// ─── Step Execution ─────────────────────────────────────────────────────────
async function executeStep(step, context, executionId) {
  const startTime = Date.now();
  
  try {
    let result;
    
    // Handle different step types
    if (step.type === 'trigger') {
      // Triggers just validate and pass through
      result = { success: true, triggered: true, data: context.trigger_data || {} };
      
    } else if (step.type === 'condition') {
      // Evaluate condition
      const conditionMet = evaluateCondition(step.config, context);
      result = { success: true, condition_met: conditionMet };
      
      // If condition not met and has else branch, mark for skip
      if (!conditionMet && step.config.on_false === 'skip') {
        return {
          status: 'skipped',
          detail: 'Condition not met',
          duration_ms: Date.now() - startTime,
          data: result
        };
      }
      
    } else if (step.type === 'action') {
      // Execute action
      const integration = step.config.integration;
      const action = step.config.action;
      
      if (integration && INTEGRATION_ACTIONS[integration]?.[action]) {
        result = await INTEGRATION_ACTIONS[integration][action](step.config, context, executionId);
      } else if (INTERNAL_ACTIONS[action]) {
        result = await INTERNAL_ACTIONS[action](step.config, context, executionId);
      } else {
        throw new Error(`Unknown action: ${integration}.${action}`);
      }
    }
    
    return {
      status: 'success',
      detail: JSON.stringify(result).substring(0, 500),
      duration_ms: Date.now() - startTime,
      data: result
    };
    
  } catch (error) {
    return {
      status: 'error',
      detail: error.message,
      duration_ms: Date.now() - startTime,
      data: { error: error.message }
    };
  }
}

// ─── Main Workflow Execution ────────────────────────────────────────────────
export async function executeWorkflow(workflowId, workflowName, steps, executionId, inputContext = {}) {
  const context = {
    workflow_id: workflowId,
    workflow_name: workflowName,
    execution_id: executionId,
    ...inputContext,
    variables: {},
    step_outputs: {}
  };
  
  const stepResults = [];
  let currentStep = 0;
  
  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      currentStep = i + 1;
      
      // Update execution progress
      await pool.query(
        `UPDATE workflow_executions SET 
         steps_completed = $1, 
         current_step = $2,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [currentStep, step.label, executionId]
      );
      
      // Log step start
      await pool.query(
        `INSERT INTO activities (type, description, metadata, created_at)
         VALUES ('workflow_step', $1, $2, CURRENT_TIMESTAMP)`,
        [
          `Step ${currentStep}: ${step.label}`,
          JSON.stringify({ execution_id: executionId, step_type: step.type, step_id: step.id })
        ]
      );
      
      // Execute step
      const stepResult = await executeStep(step, context, executionId);
      
      // Store step output in context for future steps
      context.step_outputs[step.id] = stepResult.data;
      
      // If step set a variable, add to context
      if (stepResult.data?.variable) {
        context.variables[stepResult.data.variable] = stepResult.data.value;
      }
      
      // Store result
      stepResults.push({
        step: step.id,
        label: step.label,
        type: step.type,
        status: stepResult.status,
        detail: stepResult.detail,
        duration_ms: stepResult.duration_ms
      });
      
      // If step failed and workflow should stop on error
      if (stepResult.status === 'error') {
        throw new Error(`Step "${step.label}" failed: ${stepResult.detail}`);
      }
      
      // If step was skipped due to condition, continue
      if (stepResult.status === 'skipped') {
        continue;
      }
    }
    
    // Mark execution as complete
    await pool.query(
      `UPDATE workflow_executions SET 
       status = 'completed',
       steps_completed = $1,
       result = $2,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [steps.length, JSON.stringify({ step_results: stepResults }), executionId]
    );
    
    await pool.query(
      `INSERT INTO activities (type, description, metadata, created_at)
       VALUES ('workflow_completed', $1, $2, CURRENT_TIMESTAMP)`,
      [`Workflow "${workflowName}" completed successfully`, JSON.stringify({ execution_id: executionId })]
    );
    
  } catch (error) {
    // Mark execution as failed
    await pool.query(
      `UPDATE workflow_executions SET 
       status = 'failed',
       result = $1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify({ error: error.message, step_results: stepResults }), executionId]
    );
    
    await pool.query(
      `INSERT INTO activities (type, description, metadata, created_at)
       VALUES ('workflow_failed', $1, $2, CURRENT_TIMESTAMP)`,
      [`Workflow "${workflowName}" failed: ${error.message}`, JSON.stringify({ execution_id: executionId })]
    );
    
    throw error;
  }
}
