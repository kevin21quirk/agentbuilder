import { useEffect, useState } from 'react';
import { Plus, Trash2, Bot, Sparkles } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tone: string;
  memory_enabled: boolean;
  capabilities: any;
  status: string;
  created_at: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    tone: 'professional',
    memory_enabled: false,
    capabilities: ''
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capabilities = formData.capabilities.split(',').map(c => c.trim()).filter(c => c);
    
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          tone: formData.tone,
          memory_enabled: formData.memory_enabled,
          capabilities
        })
      });
      
      await fetchAgents();
      setShowModal(false);
      setFormData({ name: '', description: '', instructions: '', tone: 'professional', memory_enabled: false, capabilities: '' });
    } catch (err) {
      console.error('Error creating agent:', err);
    }
  };

  const deleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      try {
        await fetch(`/api/agents/${id}`, { method: 'DELETE' });
        await fetchAgents();
      } catch (err) {
        console.error('Error deleting agent:', err);
      }
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agents</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-black to-red-600 rounded-lg shadow-sm text-sm font-medium text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <div key={agent.id} className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg dark:border dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Bot className="h-8 w-8 text-primary" />
                  <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">{agent.name}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  agent.status === 'busy' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{agent.description}</p>
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">CAPABILITIES</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(agent.capabilities) ? agent.capabilities : []).map((cap: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="text-xs text-gray-400">{agent.tone} tone</span>
                <button
                  onClick={() => deleteAgent(agent.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Agent</h3>
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
                        rows={2}
                        placeholder="What does this agent do?"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Instructions</label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        rows={3}
                        placeholder="How should this agent behave? What are its goals?"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tone</label>
                      <select
                        value={formData.tone}
                        onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.memory_enabled}
                          onChange={(e) => setFormData({ ...formData, memory_enabled: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700">Enable Memory</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Agent will remember previous interactions</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Capabilities (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.capabilities}
                        onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                        placeholder="coding, testing, deployment"
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
