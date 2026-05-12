import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Trash2, Sparkles, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

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
    try {
      await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      await fetchWorkflows();
      setShowModal(false);
      setFormData({ name: '', description: '', trigger_type: 'manual' });
    } catch (err) { console.error(err); }
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
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowModal(false)} />
            <div className="relative rounded-xl p-6 w-full max-w-lg" style={{ background: '#163d77', border: '1px solid rgba(255,255,255,0.1)' }}>
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-bold text-white mb-1">Create New Workflow</h3>
                <p className="text-xs text-blue-200/50 mb-5">Build a custom workflow from scratch</p>
                <div className="space-y-4">
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
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6b9fd4' }}>Description</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="What does this workflow do?"
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
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}
                  >
                    Create Workflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
