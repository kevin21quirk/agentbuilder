import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Trash2, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  workflow_name: string | null;
  context: Record<string, any>;
  created_at: string;
  completed_at: string | null;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try { setTasks(await (await fetch('/api/tasks')).json()); } catch (err) { console.error(err); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      await fetchTasks();
    } catch (err) { console.error(err); }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      await fetchTasks();
    } catch (err) { console.error(err); }
  };

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const isOverdue = (t: Task) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Tasks</h1>
          <p className="text-sm text-blue-200/50">Follow-ups, action items, and scheduled tasks created by workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{pendingCount} pending</span>
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{completedCount} done</span>
        </div>
      </div>

      <div className="flex gap-1 mb-5">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: filter === f ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
              color: filter === f ? '#00d4ff' : '#6b9fd4',
            }}
          >
            {f} {f === 'all' ? `(${tasks.length})` : f === 'pending' ? `(${pendingCount})` : `(${completedCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Clock className="h-12 w-12 mx-auto mb-3" style={{ color: '#6b9fd4' }} />
          <h2 className="text-lg font-semibold text-white mb-1">No tasks yet</h2>
          <p className="text-sm text-blue-200/50">Tasks will appear here when workflows create follow-ups or action items</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div
              key={task.id}
              className="rounded-lg p-4 flex items-start gap-4 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                onClick={() => updateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                className="mt-0.5 flex-shrink-0"
              >
                {task.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : isOverdue(task) ? (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2" style={{ borderColor: '#6b9fd4' }} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                    {task.title}
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded" style={{
                    background: task.priority === 'high' ? 'rgba(239,68,68,0.15)' : task.priority === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(107,159,212,0.15)',
                    color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#6b9fd4',
                  }}>
                    {task.priority}
                  </span>
                </div>
                {task.description && (
                  <p className="text-[11px] text-blue-200/40 mb-1 whitespace-pre-line">{task.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px]" style={{ color: '#6b9fd4' }}>
                  {task.due_date && (
                    <span className={isOverdue(task) ? 'text-red-400 font-bold' : ''}>
                      Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {isOverdue(task) && ' (OVERDUE)'}
                    </span>
                  )}
                  {task.workflow_name && <span>From: {task.workflow_name}</span>}
                  <span>{new Date(task.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <button onClick={() => deleteTask(task.id)} className="flex-shrink-0 p-1.5 rounded hover:bg-red-500/20 transition-colors" style={{ color: '#6b9fd4' }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
