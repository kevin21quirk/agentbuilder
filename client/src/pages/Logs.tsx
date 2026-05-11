import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface LogEntry {
  id: string;
  workflow_name: string;
  status: 'success' | 'failed' | 'running';
  created_at: string;
  duration: number;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error('Error fetching logs:', err));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Execution Logs</h1>
      <p className="text-gray-600 mb-8">Monitor and debug your automation workflows</p>
      
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No execution logs yet
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.workflow_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {log.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                      {log.status === 'running' && <Clock className="h-3 w-3 mr-1" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.created_at}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.duration}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
