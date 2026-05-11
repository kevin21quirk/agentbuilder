import { useEffect, useState } from 'react';
import { Plus, Play, Workflow as WorkflowIcon } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  tasks: any[];
  trigger: string;
  status: string;
  createdAt: string;
  executionCount: number;
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: 'manual',
    tasks: ''
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = () => {
    fetch('/api/workflows')
      .then(res => res.json())
      .then(data => setWorkflows(data))
      .catch(err => console.error('Error fetching workflows:', err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tasks = formData.tasks.split('\n').map(t => t.trim()).filter(t => t);
    
    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        trigger: formData.trigger,
        tasks: tasks.map(t => ({ name: t, status: 'pending' }))
      })
    })
      .then(res => res.json())
      .then(() => {
        fetchWorkflows();
        setShowModal(false);
        setFormData({ name: '', description: '', trigger: 'manual', tasks: '' });
      })
      .catch(err => console.error('Error creating workflow:', err));
  };

  const executeWorkflow = (id: string) => {
    fetch(`/api/workflows/${id}/execute`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        alert(`Workflow execution started: ${data.id}`);
        fetchWorkflows();
      })
      .catch(err => console.error('Error executing workflow:', err));
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {workflows.map(workflow => (
          <div key={workflow.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <WorkflowIcon className="h-8 w-8 text-purple-600" />
                  <h3 className="ml-3 text-lg font-medium text-gray-900">{workflow.name}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {workflow.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">TRIGGER</p>
                <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                  {workflow.trigger}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">TASKS ({workflow.tasks.length})</p>
                <div className="space-y-1">
                  {workflow.tasks.slice(0, 3).map((task, idx) => (
                    <div key={idx} className="flex items-center text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                        {idx + 1}
                      </span>
                      {task.name}
                    </div>
                  ))}
                  {workflow.tasks.length > 3 && (
                    <p className="text-xs text-gray-500 ml-7">+{workflow.tasks.length - 3} more</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{workflow.executionCount} executions</span>
                <button
                  onClick={() => executeWorkflow(workflow.id)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Execute
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Workflow</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Trigger</label>
                      <select
                        value={formData.trigger}
                        onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      >
                        <option value="manual">Manual</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="event">Event-based</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tasks (one per line)</label>
                      <textarea
                        required
                        value={formData.tasks}
                        onChange={(e) => setFormData({ ...formData, tasks: e.target.value })}
                        rows={5}
                        placeholder="Task 1: Analyze data&#10;Task 2: Generate report&#10;Task 3: Send notification"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
