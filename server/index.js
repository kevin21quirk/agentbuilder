import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/connection.js';
import { executeWorkflow } from './workflowEngine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/agents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agents', async (req, res) => {
  try {
    const { name, description, instructions, tone, memory_enabled, capabilities } = req.body;
    const result = await pool.query(
      'INSERT INTO agents (name, description, instructions, tone, memory_enabled, capabilities) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, instructions || '', tone || 'professional', memory_enabled || false, JSON.stringify(capabilities || [])]
    );
    
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['agent', `Created agent: ${name}`, 'success', 'agent', result.rows[0].id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agents/:id', async (req, res) => {
  try {
    const { name, description, instructions, tone, memory_enabled, capabilities, status } = req.body;
    const result = await pool.query(
      'UPDATE agents SET name = $1, description = $2, instructions = $3, tone = $4, memory_enabled = $5, capabilities = $6, status = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, description, instructions, tone, memory_enabled, JSON.stringify(capabilities), status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/agents/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['agent', `Deleted agent: ${result.rows[0].name}`, 'success', 'agent', req.params.id]
    );
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/workflows', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workflows ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const { name, description, trigger_type, workflow_data } = req.body;
    const result = await pool.query(
      'INSERT INTO workflows (name, description, trigger_type, workflow_data) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, trigger_type || 'manual', JSON.stringify(workflow_data || {})]
    );
    
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['workflow', `Created workflow: ${name}`, 'success', 'workflow', result.rows[0].id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/workflows/:id', async (req, res) => {
  try {
    const workflow = await pool.query('SELECT * FROM workflows WHERE id = $1', [req.params.id]);
    if (workflow.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    await pool.query('DELETE FROM workflows WHERE id = $1', [req.params.id]);
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['workflow', `Deleted workflow: ${workflow.rows[0].name}`, 'success', 'workflow', req.params.id]
    );
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/running', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT we.*, w.name 
      FROM workflow_executions we 
      JOIN workflows w ON we.workflow_id = w.id 
      WHERE we.status = 'running' 
      ORDER BY we.started_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const workflow = await pool.query('SELECT * FROM workflows WHERE id = $1', [req.params.id]);
    if (workflow.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const wfData = workflow.rows[0];
    const steps = wfData.workflow_data?.steps || [];
    const inputContext = req.body || {}; // Client name, email, etc.

    if (steps.length === 0) {
      return res.status(400).json({ error: 'Workflow has no steps defined. Edit the workflow or use a template.' });
    }
    
    const execution = await pool.query(
      'INSERT INTO workflow_executions (workflow_id, status, result) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, 'running', JSON.stringify({ steps_total: steps.length, steps_completed: 0, current_step: null, input: inputContext })]
    );
    
    const contextLabel = inputContext.client_name ? ` for ${inputContext.client_name}` : '';
    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      ['workflow', `Started workflow: ${wfData.name}${contextLabel} (${steps.length} steps)`, 'running', 'workflow', req.params.id]
    );
    
    // Return immediately — execution runs asynchronously
    res.json(execution.rows[0]);

    // Execute all steps using the new workflow engine with variable support
    executeWorkflow(req.params.id, wfData.name, steps, execution.rows[0].id, inputContext)
      .catch(err => console.error(`Workflow execution error (${wfData.name}):`, err));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workflow-executions/:id — get execution status with step results
app.get('/api/workflow-executions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT we.*, w.name as workflow_name FROM workflow_executions we JOIN workflows w ON we.workflow_id = w.id WHERE we.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Execution not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Tasks CRUD ──────────────────────────────────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT t.*, w.name as workflow_name FROM tasks t LEFT JOIN workflows w ON t.related_workflow_id = w.id ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';
    const result = await pool.query(
      `UPDATE tasks SET status = $1, completed_at = ${completedAt}, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activities ORDER BY created_at DESC LIMIT 20');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT we.*, w.name as workflow_name 
      FROM workflow_executions we 
      JOIN workflows w ON we.workflow_id = w.id 
      ORDER BY we.started_at DESC 
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const agentsCount = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'busy\') as active FROM agents');
    const workflowsCount = await pool.query('SELECT COUNT(*) as total FROM workflows');
    const runningWorkflows = await pool.query('SELECT COUNT(*) as running FROM workflow_executions WHERE status = \'running\'');
    const completedTasks = await pool.query('SELECT COUNT(*) as completed FROM workflow_executions WHERE status = \'completed\' AND started_at > NOW() - INTERVAL \'30 days\'');
    
    const integrationsCount = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as connected FROM integrations');
    const totalExecutions = await pool.query('SELECT COUNT(*) as total FROM workflow_executions');
    const successExecutions = await pool.query('SELECT COUNT(*) as total FROM workflow_executions WHERE status = \'completed\'');
    const failedExecutions = await pool.query('SELECT COUNT(*) as total FROM workflow_executions WHERE status = \'failed\'');
    
    const totalExec = parseInt(totalExecutions.rows[0].total);
    const successExec = parseInt(successExecutions.rows[0].total);
    const failedExec = parseInt(failedExecutions.rows[0].total);
    
    const stats = {
      totalAgents: parseInt(agentsCount.rows[0].total),
      activeAgents: parseInt(agentsCount.rows[0].active),
      totalWorkflows: parseInt(workflowsCount.rows[0].total),
      runningWorkflows: parseInt(runningWorkflows.rows[0].running),
      tasksCompleted: parseInt(completedTasks.rows[0].completed),
      totalIntegrations: parseInt(integrationsCount.rows[0].total),
      connectedIntegrations: parseInt(integrationsCount.rows[0].connected),
      totalExecutions: totalExec,
      successRate: totalExec > 0 ? Math.round((successExec / totalExec) * 100) : 0,
      failRate: totalExec > 0 ? Math.round((failedExec / totalExec) * 100) : 0,
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily activity counts for the last 14 days (real time-series data)
app.get('/api/stats/activity-daily', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d::date as date, COALESCE(c.count, 0) as count
      FROM generate_series(
        CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'
      ) d
      LEFT JOIN (
        SELECT created_at::date as day, COUNT(*) as count
        FROM activities
        WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
        GROUP BY created_at::date
      ) c ON d::date = c.day
      ORDER BY d
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monthly activity counts for the last 12 months (for area chart)
app.get('/api/stats/activity-monthly', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(d, 'Mon') as month,
        COALESCE(a.agents, 0) as agents_created,
        COALESCE(w.workflows, 0) as workflows_created
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'
      ) d
      LEFT JOIN (
        SELECT DATE_TRUNC('month', created_at) as m, COUNT(*) as agents
        FROM agents
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY m
      ) a ON d = a.m
      LEFT JOIN (
        SELECT DATE_TRUNC('month', created_at) as m, COUNT(*) as workflows
        FROM workflows
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY m
      ) w ON d = w.m
      ORDER BY d
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Integration & OAuth Configuration ───────────────────────────────────────
const API_URL = process.env.API_URL || 'http://localhost:3001';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const INTEGRATION_CONFIG = {
  'Zoho CRM': {
    description: 'Sync contacts, leads, and deals',
    icon: '🔷',
    authType: 'oauth',
    oauthEnvVars: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET'],
    setupUrl: 'https://api-console.zoho.com/',
    scopes: 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL',
    getAuthUrl: () => {
      const region = process.env.ZOHO_REGION || 'com';
      const domain = region === 'eu' ? 'accounts.zoho.eu' : 'accounts.zoho.com';
      return `https://${domain}/oauth/v2/auth?scope=${encodeURIComponent('ZohoCRM.modules.ALL,ZohoCRM.settings.ALL')}&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(API_URL + '/api/oauth/zoho/callback')}&prompt=consent`;
    },
    exchangeToken: async (code) => {
      const region = process.env.ZOHO_REGION || 'com';
      const domain = region === 'eu' ? 'accounts.zoho.eu' : 'accounts.zoho.com';
      const res = await fetch(`https://${domain}/oauth/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: process.env.ZOHO_CLIENT_ID, client_secret: process.env.ZOHO_CLIENT_SECRET, redirect_uri: API_URL + '/api/oauth/zoho/callback', code })
      });
      return res.json();
    }
  },
  'Google Workspace': {
    description: 'Connect Gmail, Calendar, Drive',
    icon: '📧',
    authType: 'oauth',
    oauthEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
    getAuthUrl: () => {
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(API_URL + '/api/oauth/google/callback')}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly')}&access_type=offline&prompt=consent`;
    },
    exchangeToken: async (code) => {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: API_URL + '/api/oauth/google/callback', code })
      });
      return res.json();
    }
  },
  'Slack': {
    description: 'Post messages and notifications',
    icon: '💼',
    authType: 'oauth',
    oauthEnvVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
    setupUrl: 'https://api.slack.com/apps',
    getAuthUrl: () => {
      return `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,channels:read&redirect_uri=${encodeURIComponent(API_URL + '/api/oauth/slack/callback')}`;
    },
    exchangeToken: async (code) => {
      const res = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: process.env.SLACK_CLIENT_ID, client_secret: process.env.SLACK_CLIENT_SECRET, code, redirect_uri: API_URL + '/api/oauth/slack/callback' })
      });
      return res.json();
    }
  },
  'Stripe': {
    description: 'Payment processing and invoicing',
    icon: '💳',
    authType: 'oauth',
    oauthEnvVars: ['STRIPE_CLIENT_ID', 'STRIPE_SECRET_KEY'],
    setupUrl: 'https://dashboard.stripe.com/settings/connect',
    getAuthUrl: () => {
      return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(API_URL + '/api/oauth/stripe/callback')}`;
    },
    exchangeToken: async (code) => {
      const res = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_secret: process.env.STRIPE_SECRET_KEY, code })
      });
      return res.json();
    }
  },
  'WhatsApp': {
    description: 'Send automated messages via Meta',
    icon: '💬',
    authType: 'oauth',
    oauthEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    setupUrl: 'https://developers.facebook.com/apps/',
    getAuthUrl: () => {
      return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(API_URL + '/api/oauth/whatsapp/callback')}&scope=whatsapp_business_management,whatsapp_business_messaging&response_type=code`;
    },
    exchangeToken: async (code) => {
      const res = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(API_URL + '/api/oauth/whatsapp/callback')}&code=${code}`);
      return res.json();
    }
  },
  'Custom API': {
    description: 'Connect any REST API',
    icon: '🔌',
    authType: 'env',
    oauthEnvVars: ['CUSTOM_API_ENDPOINT', 'CUSTOM_API_KEY'],
    setupUrl: null
  }
};

// Helper: map provider slug to integration name
const PROVIDER_MAP = {
  zoho: 'Zoho CRM',
  google: 'Google Workspace',
  slack: 'Slack',
  stripe: 'Stripe',
  whatsapp: 'WhatsApp'
};

// GET /api/integrations — returns status for each integration (never exposes tokens)
app.get('/api/integrations', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT * FROM integrations');
    const dbMap = {};
    dbResult.rows.forEach(row => { dbMap[row.name] = row; });

    const integrations = Object.entries(INTEGRATION_CONFIG).map(([name, config]) => {
      const hasOAuthCreds = config.oauthEnvVars.every(v => !!process.env[v]);
      const dbEntry = dbMap[name];
      return {
        name,
        description: config.description,
        icon: config.icon,
        authType: config.authType,
        oauthReady: hasOAuthCreds,
        setupUrl: config.setupUrl,
        connected: dbEntry ? dbEntry.status === 'active' : false,
        connectedAt: dbEntry ? dbEntry.updated_at : null
      };
    });

    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/oauth/:provider/authorize — redirect user to provider's OAuth consent screen
app.get('/api/oauth/:provider/authorize', (req, res) => {
  const name = PROVIDER_MAP[req.params.provider];
  const config = INTEGRATION_CONFIG[name];
  if (!config || config.authType !== 'oauth') {
    return res.status(404).json({ error: 'Unknown OAuth provider' });
  }

  const missing = config.oauthEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing env vars: ${missing.join(', ')}. Add them to .env and restart.` });
  }

  const authUrl = config.getAuthUrl();
  res.redirect(authUrl);
});

// GET /api/oauth/:provider/callback — handle provider redirect with auth code
app.get('/api/oauth/:provider/callback', async (req, res) => {
  const providerSlug = req.params.provider;
  const name = PROVIDER_MAP[providerSlug];
  const config = INTEGRATION_CONFIG[name];

  if (!config || config.authType !== 'oauth') {
    return res.redirect(`${APP_URL}/integrations?error=unknown_provider`);
  }

  const { code, error: oauthError } = req.query;
  if (oauthError || !code) {
    return res.redirect(`${APP_URL}/integrations?error=${oauthError || 'no_code'}`);
  }

  try {
    const tokenData = await config.exchangeToken(code);

    if (tokenData.error) {
      console.error(`OAuth error for ${name}:`, tokenData);
      return res.redirect(`${APP_URL}/integrations?error=token_exchange_failed`);
    }

    // Store tokens securely in DB (never sent to frontend)
    await pool.query(
      `INSERT INTO integrations (name, type, status, config)
       VALUES ($1, $2, 'active', $3)
       ON CONFLICT (name) DO UPDATE SET status = 'active', config = $3, updated_at = CURRENT_TIMESTAMP`,
      [name, providerSlug, JSON.stringify(tokenData)]
    );

    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type) VALUES ($1, $2, $3, $4)',
      ['integration', `Connected ${name} via OAuth`, 'success', 'integration']
    );

    res.redirect(`${APP_URL}/integrations?connected=${encodeURIComponent(name)}`);
  } catch (err) {
    console.error(`OAuth callback error for ${name}:`, err);
    res.redirect(`${APP_URL}/integrations?error=callback_failed`);
  }
});

// POST /api/integrations/:name/connect — for non-OAuth (env-var based) integrations
app.post('/api/integrations/:name/connect', async (req, res) => {
  try {
    const { name } = req.params;
    const config = INTEGRATION_CONFIG[name];
    if (!config) return res.status(404).json({ error: 'Integration not found' });

    const missing = config.oauthEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing environment variables', missing, hint: `Set these in your .env file: ${missing.join(', ')}` });
    }

    await pool.query(
      `INSERT INTO integrations (name, type, status, config)
       VALUES ($1, $2, 'active', '{}')
       ON CONFLICT (name) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, name.toLowerCase().replace(/\s+/g, '_')]
    );

    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type) VALUES ($1, $2, $3, $4)',
      ['integration', `Connected integration: ${name}`, 'success', 'integration']
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/integrations/:name/disconnect
app.post('/api/integrations/:name/disconnect', async (req, res) => {
  try {
    const { name } = req.params;
    await pool.query(
      `UPDATE integrations SET status = 'inactive', config = '{}', updated_at = CURRENT_TIMESTAMP WHERE name = $1`,
      [name]
    );

    await pool.query(
      'INSERT INTO activities (type, title, status, entity_type) VALUES ($1, $2, $3, $4)',
      ['integration', `Disconnected ${name}`, 'success', 'integration']
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Agent Builder API running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected to Neon' : 'Not configured'}`);
});
