import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Bot, LayoutDashboard, Workflow, Database, History, FileText, Settings as SettingsIcon, Search, Bell, User, Plus } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Integrations from './pages/Integrations';
import Logs from './pages/Logs';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import { ThemeProvider } from './ThemeContext';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/agents', icon: Bot, label: 'Agents' },
    { path: '/workflows', icon: Workflow, label: 'Workflows' },
    { path: '/integrations', icon: Database, label: 'Integrations' },
    { path: '/logs', icon: History, label: 'Logs' },
    { path: '/templates', icon: FileText, label: 'Templates' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="w-64 h-screen fixed left-0 top-0 flex flex-col" style={{ background: '#163d77', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-10 w-auto brightness-0 invert"
          />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-blue-200/60 hover:text-white'
              }`}
              style={isActive ? { background: 'rgba(0,212,255,0.1)' } : {}}
            >
              <Icon className="h-5 w-5" style={isActive ? { color: '#00d4ff' } : {}} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[10px] uppercase tracking-widest text-blue-300/40 mb-2">Quick Actions</div>
        <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}>
          <Plus className="h-4 w-4" />
          <span>Create New</span>
        </button>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="h-14 fixed top-0 right-0 left-64 z-10" style={{ background: '#163d77', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#4a82c4' }} />
            <input
              type="text"
              placeholder="Search agents, workflows, logs..."
              className="w-full pl-10 pr-4 py-1.5 rounded-lg text-sm text-white placeholder-blue-300/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 border-0"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 ml-6">
          <button className="relative p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#6b9fd4' }}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#00d4ff' }}></span>
          </button>
          <button className="flex items-center space-x-2 p-1.5 rounded-lg transition-colors hover:bg-white/10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00d4ff, #163d77)' }}>
              <User className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
    <Router>
      <div className="min-h-screen" style={{ background: '#163d77' }}>
        <Sidebar />
        <TopBar />
        
        <main className="ml-64 pt-14 min-h-screen text-white">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/workflows" element={<WorkflowBuilder />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
    </ThemeProvider>
  );
}

export default App;
