import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Trash2, Sparkles, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Zap, GitBranch, Settings, X } from 'lucide-react';

interface InputField { key: string; label: string; type: string; required: boolean; placeholder: string; }
interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  workflow_data: { steps?: StepDef[]; input_fields?: InputField[] };
  created_at: string;
}

interface StepDef { id: string; type: string; label: string; config: Record<string, any>; }
interface StepResult { step: string; label: string; type: string; status: string; detail: string; duration_ms: number; }
interface ExecutionResult { steps_total: number; steps_completed: number; current_step: string | null; step_results?: StepResult[]; }

export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', trigger_type: 'manual' });
  const [workflowSteps, setWorkflowSteps] = useState<StepDef[]>([]);
  const [editingStep, setEditingStep] = useState<StepDef | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [execStatus, setExecStatus] = useState<string | null>(null);
  const [expandedWf, setExpandedWf] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inputModalWf, setInputModalWf] = useState<Workflow | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try { setWorkflows(await (await fetch('/api/workflows')).json()); } catch (err) { console.error(err); }
  };

  // Poll execution status
  const pollExecution = useCallback(async (eid: string) => {
    try {
      const data = await (await fetch(`/api/workflow-executions/${eid}`)).json();
      const result = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      setExecResult(result);
      setExecStatus(data.status);
      if (data.status === 'running') {
        setTimeout(() => pollExecution(eid), 1500);
      } else {
        setTimeout(() => setExecuting(null), 1000);
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workflowSteps.length === 0) {
      alert('Please add at least one step to your workflow');
      return;
    }
    try {
      const workflowData = {
        ...formData,
        workflow_data: { steps: workflowSteps, input_fields: [] }
      };
      await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workflowData) });
      await fetchWorkflows();
      setShowModal(false);
      setFormData({ name: '', description: '', trigger_type: 'manual' });
      setWorkflowSteps([]);
    } catch (err) { console.error(err); }
  };

  const addStep = (type: 'trigger' | 'action' | 'condition') => {
    const newStep: StepDef = {
      id: `step-${Date.now()}`,
      type,
      label: type === 'trigger' ? 'New Trigger' : type === 'condition' ? 'New Condition' : 'New Action',
      config: {}
    };
    setWorkflowSteps([...workflowSteps, newStep]);
    setEditingStep(newStep);
  };

  const updateStep = (stepId: string, updates: Partial<StepDef>) => {
    setWorkflowSteps(workflowSteps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const deleteStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter(s => s.id !== stepId));
    if (editingStep?.id === stepId) setEditingStep(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...workflowSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setWorkflowSteps(newSteps);
  };

  const startExecution = (workflow: Workflow) => {
    const fields = workflow.workflow_data?.input_fields || [];
    if (fields.length > 0) {
      setInputModalWf(workflow);
      const defaults: Record<string, string> = {};
      fields.forEach(f => { defaults[f.key] = ''; });
      setInputValues(defaults);
    } else {
      executeWorkflow(workflow.id, {});
    }
  };

  const executeWorkflow = async (id: string, context: Record<string, string>) => {
    setInputModalWf(null);
    setExecuting(id);
    setExecResult(null);
    setExecStatus('running');
    setExpandedWf(id);
    try {
      const res = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Execution failed'); setExecuting(null); return; }
      const data = await res.json();
      pollExecution(data.id);
    } catch (err) { console.error(err); setExecuting(null); }
  };

  const deleteWorkflow = async (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchWorkflows();
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Workflows</h1>
          <p className="text-gray-600 dark:text-gray-400">Automate your processes with visual workflows</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-black to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No workflows yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first automation workflow to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-black to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => {
            const steps = workflow.workflow_data?.steps || [];
            const isExec = executing === workflow.id;
            const isExpanded = expandedWf === workflow.id;
            const isDone = isExec && execStatus !== 'running';

            return (
              <div key={workflow.id} className="rounded-xl p-5 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-0.5 truncate">{workflow.name}</h3>
                    <p className="text-xs text-blue-200/50 truncate">{workflow.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full" style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>
                      {workflow.trigger_type}
                    </span>
                    {steps.length > 0 && (
                      <span className="text-[10px] font-mono" style={{ color: '#6b9fd4' }}>{steps.length} steps</span>
                    )}
                  </div>
                </div>

                {/* Step list (expandable) */}
                {steps.length > 0 && (
                  <div className="mb-3">
                    <button onClick={() => setExpandedWf(isExpanded ? null : workflow.id)} className="flex items-center gap-1 text-[10px] uppercase tracking-wider mb-2" style={{ color: '#6b9fd4' }}>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? 'Hide steps' : 'Show steps'}
                    </button>
                    {isExpanded && (
                      <div className="space-y-1.5">
                        {steps.map((step, idx) => {
                          const stepResult = execResult?.step_results?.[idx];
                          const isCurrent = isExec && execStatus === 'running' && execResult?.steps_completed === idx;
                          return (
                            <div key={step.id} className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                                background: stepResult
                                  ? stepResult.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
                                  : isCurrent ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)',
                              }}>
                                {stepResult ? (
                                  stepResult.status === 'success'
                                    ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                                    : <XCircle className="h-3 w-3 text-red-400" />
                                ) : isCurrent ? (
                                  <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
                                ) : (
                                  <span className="text-[9px] font-bold" style={{ color: '#6b9fd4' }}>{idx + 1}</span>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] text-gray-300 leading-tight block">{step.label}</span>
                                {stepResult && (
                                  <span className={`text-[10px] leading-tight block mt-0.5 ${stepResult.status === 'success' ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                    {stepResult.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Progress bar during execution */}
                {isExec && execResult && execStatus === 'running' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-cyan-400 truncate">{execResult.current_step || 'Starting...'}</span>
                      <span className="text-[10px] font-mono text-white">{execResult.steps_completed}/{execResult.steps_total}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: '#1a4a8a' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(execResult.steps_completed / Math.max(execResult.steps_total, 1)) * 100}%`, background: '#00d4ff' }} />
                    </div>
                  </div>
                )}

                {/* Done banner */}
                {isDone && execResult && (
                  <div className="mb-3 px-3 py-2 rounded-lg text-[11px] font-medium" style={{
                    background: execStatus === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: execStatus === 'completed' ? '#10b981' : '#f59e0b',
                  }}>
                    {execStatus === 'completed' ? '✓ All steps completed successfully' : `⚠ Completed with errors (${execResult.step_results?.filter(r => r.status === 'error').length} failed)`}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startExecution(workflow)}
                    disabled={isExec && execStatus === 'running'}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}
                  >
                    {isExec && execStatus === 'running' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                    {isExec && execStatus === 'running' ? 'Running...' : 'Execute'}
                  </button>
                  <button
                    onClick={() => deleteWorkflow(workflow.id, workflow.name)}
                    disabled={deleting === workflow.id}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-red-500/20"
                    style={{ color: '#6b9fd4' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => { setShowModal(false); setWorkflowSteps([]); setEditingStep(null); }} />
            <div className="relative rounded-xl p-6 w-full max-w-5xl" style={{ background: '#163d77', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflow: 'auto' }}>
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-bold text-white mb-1">Create New Workflow</h3>
                <p className="text-xs text-blue-200/50 mb-5">Build a visual workflow with triggers, conditions, and actions</p>
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Workflow Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Lead Qualification Process"
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Trigger Type</label>
                    <select
                      value={formData.trigger_type}
                      onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="manual" style={{ background: '#163d77', color: 'white' }}>Manual</option>
                      <option value="scheduled" style={{ background: '#163d77', color: 'white' }}>Scheduled</option>
                      <option value="webhook" style={{ background: '#163d77', color: 'white' }}>Webhook</option>
                      <option value="event" style={{ background: '#163d77', color: 'white' }}>Event-based</option>
                    </select>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="What does this workflow do?"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>

                {/* Visual Workflow Builder */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6b9fd4' }}>Workflow Steps ({workflowSteps.length})</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => addStep('trigger')} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <Zap className="h-3 w-3 inline mr-1 -mt-0.5" /> Add Trigger
                      </button>
                      <button type="button" onClick={() => addStep('condition')} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                        <GitBranch className="h-3 w-3 inline mr-1 -mt-0.5" /> Add Condition
                      </button>
                      <button type="button" onClick={() => addStep('action')} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>
                        <Settings className="h-3 w-3 inline mr-1 -mt-0.5" /> Add Action
                      </button>
                    </div>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2 mb-4">
                    {workflowSteps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div className="flex-1 p-3 rounded-lg cursor-pointer transition-all" style={{ background: editingStep?.id === step.id ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editingStep?.id === step.id ? '#00d4ff' : 'rgba(255,255,255,0.06)'}` }} onClick={() => setEditingStep(step)}>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: step.type === 'trigger' ? 'rgba(245,158,11,0.2)' : step.type === 'condition' ? 'rgba(139,92,246,0.2)' : 'rgba(0,212,255,0.2)', color: step.type === 'trigger' ? '#f59e0b' : step.type === 'condition' ? '#a78bfa' : '#00d4ff' }}>
                              {step.type}
                            </span>
                            <span className="text-sm text-white font-medium">{step.label}</span>
                            {step.config.integration && <span className="text-xs" style={{ color: '#6b9fd4' }}>→ {step.config.integration}</span>}
                            {step.config.action && <span className="text-xs" style={{ color: '#6b9fd4' }}>({step.config.action})</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button type="button" onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30" style={{ color: '#6b9fd4' }}>
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => moveStep(idx, 'down')} disabled={idx === workflowSteps.length - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30" style={{ color: '#6b9fd4' }}>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <button type="button" onClick={() => deleteStep(step.id)} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors" style={{ color: '#ef4444' }}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {workflowSteps.length === 0 && (
                      <div className="text-center py-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p className="text-sm" style={{ color: '#6b9fd4' }}>No steps added yet. Click the buttons above to add triggers, conditions, or actions.</p>
                      </div>
                    )}
                  </div>

                  {/* Step Editor */}
                  {editingStep && (
                    <div className="p-4 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white">Edit Step: {editingStep.type}</h4>
                        <button type="button" onClick={() => setEditingStep(null)} className="text-xs" style={{ color: '#6b9fd4' }}>Close</button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Step Label</label>
                          <input
                            type="text"
                            value={editingStep.label}
                            onChange={(e) => updateStep(editingStep.id, { label: e.target.value })}
                            className="w-full px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        </div>
                        {editingStep.type === 'condition' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Field (use variable syntax)</label>
                              <input
                                type="text"
                                value={editingStep.config.field || ''}
                                onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, field: e.target.value } })}
                                placeholder="e.g., client_email or trigger_data.amount"
                                className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Operator</label>
                              <select
                                value={editingStep.config.operator || 'equals'}
                                onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, operator: e.target.value } })}
                                className="w-full px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                <option value="equals" style={{ background: '#163d77', color: 'white' }}>Equals</option>
                                <option value="not_equals" style={{ background: '#163d77', color: 'white' }}>Not Equals</option>
                                <option value="contains" style={{ background: '#163d77', color: 'white' }}>Contains</option>
                                <option value="greater_than" style={{ background: '#163d77', color: 'white' }}>Greater Than</option>
                                <option value="less_than" style={{ background: '#163d77', color: 'white' }}>Less Than</option>
                                <option value="exists" style={{ background: '#163d77', color: 'white' }}>Exists</option>
                                <option value="not_exists" style={{ background: '#163d77', color: 'white' }}>Not Exists</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Value (supports variables)</label>
                              <input
                                type="text"
                                value={editingStep.config.value || ''}
                                onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, value: e.target.value } })}
                                placeholder="e.g., premium or client_tier"
                                className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                            </div>
                          </>
                        )}
                        {editingStep.type === 'action' && (
                          <>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Integration</label>
                              <select
                                value={editingStep.config.integration || ''}
                                onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, integration: e.target.value, action: '' } })}
                                className="w-full px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                <option value="" style={{ background: '#163d77', color: 'white' }}>Internal Actions</option>
                                <option value="Zoho CRM" style={{ background: '#163d77', color: 'white' }}>Zoho CRM</option>
                                <option value="Google Workspace" style={{ background: '#163d77', color: 'white' }}>Google Workspace</option>
                                <option value="Slack" style={{ background: '#163d77', color: 'white' }}>Slack</option>
                                <option value="Stripe" style={{ background: '#163d77', color: 'white' }}>Stripe</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Action</label>
                              <select
                                value={editingStep.config.action || ''}
                                onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, action: e.target.value } })}
                                className="w-full px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                <option value="" style={{ background: '#163d77', color: 'white' }}>Select action...</option>
                                {editingStep.config.integration === 'Zoho CRM' && (
                                  <>
                                    <option value="create_contact" style={{ background: '#163d77', color: 'white' }}>Create Contact</option>
                                    <option value="create_deal" style={{ background: '#163d77', color: 'white' }}>Create Deal</option>
                                  </>
                                )}
                                {editingStep.config.integration === 'Google Workspace' && (
                                  <>
                                    <option value="send_email" style={{ background: '#163d77', color: 'white' }}>Send Email</option>
                                    <option value="create_calendar_event" style={{ background: '#163d77', color: 'white' }}>Create Calendar Event</option>
                                  </>
                                )}
                                {editingStep.config.integration === 'Slack' && (
                                  <option value="send_message" style={{ background: '#163d77', color: 'white' }}>Send Message</option>
                                )}
                                {editingStep.config.integration === 'Stripe' && (
                                  <option value="list_overdue_invoices" style={{ background: '#163d77', color: 'white' }}>List Overdue Invoices</option>
                                )}
                                {!editingStep.config.integration && (
                                  <>
                                    <option value="create_task" style={{ background: '#163d77', color: 'white' }}>Create Task</option>
                                    <option value="log_activity" style={{ background: '#163d77', color: 'white' }}>Log Activity</option>
                                    <option value="http_request" style={{ background: '#163d77', color: 'white' }}>HTTP Request</option>
                                    <option value="set_variable" style={{ background: '#163d77', color: 'white' }}>Set Variable</option>
                                    <option value="delay" style={{ background: '#163d77', color: 'white' }}>Delay</option>
                                  </>
                                )}
                              </select>
                            </div>
                            
                            {/* Action-specific configuration */}
                            {editingStep.config.action === 'send_email' && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>To (supports variables)</label>
                                  <input type="text" value={editingStep.config.to || ''} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, to: e.target.value } })} placeholder="client_email" className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Subject</label>
                                  <input type="text" value={editingStep.config.subject || ''} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, subject: e.target.value } })} placeholder="Welcome client_name!" className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Body</label>
                                  <textarea rows={3} value={editingStep.config.body || ''} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, body: e.target.value } })} placeholder="Hi client_name, welcome!" className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                              </>
                            )}
                            {editingStep.config.action === 'send_message' && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Channel</label>
                                  <input type="text" value={editingStep.config.channel || ''} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, channel: e.target.value } })} placeholder="#general" className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Message</label>
                                  <textarea rows={2} value={editingStep.config.text || ''} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, text: e.target.value } })} placeholder="New client: client_name" className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                              </>
                            )}
                            {editingStep.config.action === 'create_task' && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Task Title</label>
                                  <input type="text" value={editingStep.config.title || ''} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, title: e.target.value } })} placeholder="Follow up with client_name" className="w-full px-2 py-1.5 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Days from now</label>
                                  <input type="number" value={editingStep.config.days_from_now || 3} onChange={(e) => updateStep(editingStep.id, { config: { ...editingStep.config, days_from_now: parseInt(e.target.value) } })} className="w-full px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </div>
                              </>
                            )}
                            <div className="mt-2 p-2 rounded" style={{ background: 'rgba(0,212,255,0.08)' }}>
                              <p className="text-[9px]" style={{ color: '#00d4ff' }}>💡 Use {'{{variable}}'} syntax to insert dynamic data from webhook, inputs, or previous steps</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}
                  >
                    Create Workflow ({workflowSteps.length} steps)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setWorkflowSteps([]); setEditingStep(null); }}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: '#6b9fd4', background: 'rgba(255,255,255,0.05)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Input context modal ── */}
      {inputModalWf && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => setInputModalWf(null)} />
            <div className="relative rounded-xl p-6 w-full max-w-md" style={{ background: '#163d77', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="text-lg font-bold text-white mb-1">Execute: {inputModalWf.name}</h3>
              <p className="text-xs text-blue-200/50 mb-5">Enter the required information to run this workflow</p>
              <form onSubmit={(e) => { e.preventDefault(); executeWorkflow(inputModalWf.id, inputValues); }}>
                <div className="space-y-3">
                  {(inputModalWf.workflow_data?.input_fields || []).map(field => (
                    <div key={field.key}>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={field.type}
                        required={field.required}
                        value={inputValues[field.key] || ''}
                        onChange={(e) => setInputValues({ ...inputValues, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}
                  >
                    <Play className="h-4 w-4 inline mr-1 -mt-0.5" /> Run Workflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputModalWf(null)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: '#6b9fd4', background: 'rgba(255,255,255,0.05)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
