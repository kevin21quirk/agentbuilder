import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Templates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const templates = [
    {
      name: 'New Client Onboarding',
      category: 'Sales',
      description: 'Automate welcome emails, CRM entry creation, and initial setup tasks when a new client signs up.',
      trigger: 'event',
      input_fields: [
        { key: 'client_name', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. John Smith' },
        { key: 'client_email', label: 'Client Email', type: 'email', required: true, placeholder: 'e.g. john@company.com' },
        { key: 'company', label: 'Company', type: 'text', required: false, placeholder: 'e.g. Acme Ltd' },
      ],
      steps: [
        { id: 'step-1', type: 'trigger', label: 'New client signup detected', config: { event: 'client.created' } },
        { id: 'step-2', type: 'action', label: 'Create CRM contact record', config: { integration: 'Zoho CRM', action: 'create_contact' } },
        { id: 'step-3', type: 'action', label: 'Send welcome email', config: { integration: 'Google Workspace', action: 'send_email', template: 'welcome' } },
        { id: 'step-4', type: 'action', label: 'Notify sales team via Slack', config: { integration: 'Slack', action: 'send_message', channel: '#new-clients' } },
        { id: 'step-5', type: 'action', label: 'Schedule follow-up task (3 days)', config: { action: 'create_task', delay: '3d' } },
      ],
    },
    {
      name: 'Invoice Reminder',
      category: 'Finance',
      description: 'Send automated payment reminders for overdue invoices at configurable intervals.',
      trigger: 'scheduled',
      input_fields: [
        { key: 'client_name', label: 'Client Name (optional)', type: 'text', required: false, placeholder: 'Leave blank for all clients' },
      ],
      steps: [
        { id: 'step-1', type: 'trigger', label: 'Daily schedule (09:00)', config: { cron: '0 9 * * *' } },
        { id: 'step-2', type: 'action', label: 'Query overdue invoices from Stripe', config: { integration: 'Stripe', action: 'list_overdue_invoices' } },
        { id: 'step-3', type: 'condition', label: 'Check if invoice > 7 days overdue', config: { field: 'days_overdue', operator: '>', value: 7 } },
        { id: 'step-4', type: 'action', label: 'Send reminder email to client', config: { integration: 'Google Workspace', action: 'send_email', template: 'invoice_reminder' } },
        { id: 'step-5', type: 'action', label: 'Log reminder in activity feed', config: { action: 'log_activity', status: 'success' } },
      ],
    },
    {
      name: 'Care Compliance Monitoring',
      category: 'Care Services',
      description: 'Track compliance deadlines, flag overdue items, and notify managers automatically.',
      trigger: 'scheduled',
      input_fields: [],
      steps: [
        { id: 'step-1', type: 'trigger', label: 'Weekly schedule (Monday 08:00)', config: { cron: '0 8 * * 1' } },
        { id: 'step-2', type: 'action', label: 'Fetch compliance records', config: { action: 'query_database', table: 'compliance_items' } },
        { id: 'step-3', type: 'condition', label: 'Filter items due within 7 days', config: { field: 'due_date', operator: '<=', value: '+7d' } },
        { id: 'step-4', type: 'action', label: 'Send summary report to managers', config: { integration: 'Google Workspace', action: 'send_email', template: 'compliance_report' } },
        { id: 'step-5', type: 'action', label: 'Post alert to Slack if critical', config: { integration: 'Slack', action: 'send_message', channel: '#compliance-alerts' } },
      ],
    },
    {
      name: 'Lead Qualification',
      category: 'Sales',
      description: 'Automatically score, qualify, and route inbound leads to the right sales team member.',
      trigger: 'webhook',
      input_fields: [
        { key: 'client_name', label: 'Lead Name', type: 'text', required: true, placeholder: 'e.g. Jane Doe' },
        { key: 'client_email', label: 'Lead Email', type: 'email', required: true, placeholder: 'e.g. jane@company.com' },
        { key: 'company', label: 'Company', type: 'text', required: false, placeholder: 'e.g. Acme Corp' },
      ],
      steps: [
        { id: 'step-1', type: 'trigger', label: 'Webhook: new lead received', config: { endpoint: '/webhooks/new-lead' } },
        { id: 'step-2', type: 'action', label: 'Score lead based on criteria', config: { action: 'score_lead', fields: ['company_size', 'industry', 'budget'] } },
        { id: 'step-3', type: 'condition', label: 'Is lead score >= 70?', config: { field: 'score', operator: '>=', value: 70 } },
        { id: 'step-4', type: 'action', label: 'Create deal in Zoho CRM', config: { integration: 'Zoho CRM', action: 'create_deal' } },
        { id: 'step-5', type: 'action', label: 'Assign to sales rep and notify', config: { integration: 'Slack', action: 'send_message', channel: '#sales-leads' } },
      ],
    },
    {
      name: 'Support Ticket Routing',
      category: 'Customer Service',
      description: 'Automatically categorise incoming support tickets and route them to the correct team.',
      trigger: 'event',
      input_fields: [
        { key: 'client_name', label: 'Customer Name', type: 'text', required: true, placeholder: 'e.g. John Smith' },
        { key: 'client_email', label: 'Customer Email', type: 'email', required: true, placeholder: 'e.g. john@company.com' },
        { key: 'ticket_subject', label: 'Ticket Subject', type: 'text', required: true, placeholder: 'e.g. Cannot access dashboard' },
      ],
      steps: [
        { id: 'step-1', type: 'trigger', label: 'New support ticket created', config: { event: 'ticket.created' } },
        { id: 'step-2', type: 'action', label: 'Analyse ticket content with AI', config: { action: 'ai_classify', model: 'text-classification' } },
        { id: 'step-3', type: 'condition', label: 'Route by category', config: { field: 'category', routes: { billing: '#billing-team', technical: '#tech-support', general: '#general-support' } } },
        { id: 'step-4', type: 'action', label: 'Assign ticket to team member', config: { action: 'assign_ticket' } },
        { id: 'step-5', type: 'action', label: 'Send acknowledgement to customer', config: { integration: 'Google Workspace', action: 'send_email', template: 'ticket_received' } },
      ],
    },
    {
      name: 'Employee Onboarding',
      category: 'HR',
      description: 'Streamline new hire setup: accounts, welcome pack, team introductions, and training schedule.',
      trigger: 'manual',
      input_fields: [
        { key: 'client_name', label: 'Employee Name', type: 'text', required: true, placeholder: 'e.g. Sarah Connor' },
        { key: 'client_email', label: 'Employee Email', type: 'email', required: true, placeholder: 'e.g. sarah@company.com' },
        { key: 'company', label: 'Department', type: 'text', required: false, placeholder: 'e.g. Engineering' },
      ],
      steps: [
        { id: 'step-1', type: 'trigger', label: 'HR triggers onboarding manually', config: { type: 'manual' } },
        { id: 'step-2', type: 'action', label: 'Create employee accounts (Google Workspace)', config: { integration: 'Google Workspace', action: 'create_user' } },
        { id: 'step-3', type: 'action', label: 'Send welcome pack email', config: { integration: 'Google Workspace', action: 'send_email', template: 'employee_welcome' } },
        { id: 'step-4', type: 'action', label: 'Notify team via Slack', config: { integration: 'Slack', action: 'send_message', channel: '#general', message: 'New team member joining!' } },
        { id: 'step-5', type: 'action', label: 'Create training schedule tasks', config: { action: 'create_tasks', count: 5, prefix: 'Onboarding Day' } },
      ],
    },
  ];

  const useTemplate = async (template: typeof templates[0]) => {
    setLoading(template.name);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          trigger_type: template.trigger,
          workflow_data: { steps: template.steps, input_fields: template.input_fields || [] },
        })
      });

      if (!res.ok) throw new Error('Failed to create workflow');

      navigate('/workflows');
    } catch (err) {
      console.error('Error creating workflow from template:', err);
      alert('Failed to create workflow');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Templates</h1>
      <p className="text-sm text-blue-200/50 mb-8">Pre-built automation workflows — each creates a real workflow with defined steps</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.name} className="rounded-xl p-5 hover:brightness-110 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full" style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>
                {template.category}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b9fd4' }}>
                {template.trigger}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">{template.name}</h3>
            <p className="text-xs text-blue-200/50 mb-4 leading-relaxed">{template.description}</p>
            
            <div className="mb-4 space-y-1.5">
              {template.steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{
                    background: step.type === 'trigger' ? 'rgba(0,212,255,0.15)' : step.type === 'condition' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: step.type === 'trigger' ? '#00d4ff' : step.type === 'condition' ? '#f59e0b' : '#10b981',
                  }}>{idx + 1}</span>
                  <span className="text-[11px] text-gray-300 truncate">{step.label}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => useTemplate(template)}
              disabled={loading === template.name}
              className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}
            >
              {loading === template.name ? 'Creating...' : `Use Template (${template.steps.length} steps)`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
